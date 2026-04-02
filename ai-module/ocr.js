const fs = require('node:fs/promises');
const path = require('node:path');
const {
  getResponseText,
  callGroqStructuredResponse,
  groqResponsesRequest
} = require('./parseReminder');

const DEFAULT_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const DEFAULT_TEXT_MODEL =
  process.env.GROQ_TEXT_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

const FREQUENCY_PATTERN =
  /\b(q\d+h|q\d+\s*h|once daily|twice daily|thrice daily|daily|every day|every \d+\s*(?:hour|hours)|morning|afternoon|evening|night|after meals|before meals|bd|bid|od|tid|tds|qid|sos|stat|qhs|hs|qam)\b/i;

const TIMING_PATTERNS = [
  /\bafter meals?\b/i,
  /\bbefore meals?\b/i,
  /\bafter breakfast\b/i,
  /\bafter lunch\b/i,
  /\bafter dinner\b/i,
  /\bbefore breakfast\b/i,
  /\bbefore lunch\b/i,
  /\bbefore dinner\b/i,
  /\bin the morning\b/i,
  /\bin the afternoon\b/i,
  /\bin the evening\b/i,
  /\bat night\b/i,
  /\bmorning\b/i,
  /\bafternoon\b/i,
  /\bevening\b/i,
  /\bnight\b/i
];

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isRemoteImage(input) {
  return /^https?:\/\//i.test(input) || /^data:image\//i.test(input);
}

async function imageToInputUrl(imageSource) {
  if (typeof imageSource !== 'string' || !imageSource.trim()) {
    throw new Error('Image source is required');
  }

  if (isRemoteImage(imageSource.trim())) {
    return imageSource.trim();
  }

  const absolutePath = path.resolve(imageSource);
  const extension = path.extname(absolutePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] || 'image/png';
  const fileBuffer = await fs.readFile(absolutePath);

  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}

function normalizePrescriptionItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      medicine: normalizeText(item?.medicine),
      dosage: normalizeText(item?.dosage),
      frequency: normalizeText(item?.frequency),
      timing: normalizeText(item?.timing),
      condition: normalizeText(item?.condition),
      instructions: normalizeText(item?.instructions)
    }))
    .filter((item) => item.medicine);
}

function toSimplePrescriptionItems(items) {
  return normalizePrescriptionItems(items).map((item) => ({
    medicine: item.medicine,
    frequency: item.frequency
  }));
}

function pickFirstMatch(line, patterns) {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return normalizeText(match[0]);
    }
  }

  return '';
}

function pickConditionFromLine(line) {
  const conditions = [];

  if (/\bif required\b/i.test(line)) {
    conditions.push('if required');
  }

  if (/\bif pain\b/i.test(line)) {
    conditions.push('if pain');
  }

  if (/\bif fever occurs\b/i.test(line)) {
    conditions.push('if fever occurs');
  }

  if (/\bsos\b/i.test(line)) {
    conditions.push('SOS');
  }

  return normalizeText(conditions.join(', '));
}

function pickDosageFromLine(line) {
  const match = line.match(
    /\b\d+(?:\.\d+)?\s*(?:m[lL]|mg|mcg|g|drops?|tabs?|caps?|tsp)(?:\s*\/\s*\d+(?:\.\d+)?)?\b/i
  );

  return normalizeText(match?.[0] || '');
}

function cleanMedicineName(line) {
  return normalizeText(
    line
      .replace(FREQUENCY_PATTERN, ' ')
      .replace(/\bafter meals?\b/gi, ' ')
      .replace(/\bbefore meals?\b/gi, ' ')
      .replace(/\bafter breakfast\b/gi, ' ')
      .replace(/\bafter lunch\b/gi, ' ')
      .replace(/\bafter dinner\b/gi, ' ')
      .replace(/\bbefore breakfast\b/gi, ' ')
      .replace(/\bbefore lunch\b/gi, ' ')
      .replace(/\bbefore dinner\b/gi, ' ')
      .replace(/\bin the morning\b/gi, ' ')
      .replace(/\bin the afternoon\b/gi, ' ')
      .replace(/\bin the evening\b/gi, ' ')
      .replace(/\bat night\b/gi, ' ')
      .replace(/\bmorning\b/gi, ' ')
      .replace(/\bafternoon\b/gi, ' ')
      .replace(/\bevening\b/gi, ' ')
      .replace(/\bnight\b/gi, ' ')
      .replace(/\bif required\b/gi, ' ')
      .replace(/\bif pain\b/gi, ' ')
      .replace(/\bif fever occurs\b/gi, ' ')
      .replace(/\btake if [a-z ]+\b/gi, ' ')
      .replace(/\bx\s*\d+\s*(?:d|day|days|wk|week|weeks)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*m[lL]\b/gi, ' ')
      .replace(/^[.\-*\d)\s]+/, ' ')
      .replace(/\b(?:oral|take)\b/gi, ' ')
      .replace(/\b(?:syp|syrup|tab|tablet|cap|capsule|inj|drop|drops|rx)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[.\-*\d)\s]+/, ' ')
      .replace(/[,:-]+$/g, '')
  );
}

function parsePrescriptionLine(line) {
  const normalizedLine = normalizeText(line);

  if (!normalizedLine) {
    return null;
  }

  const frequency = normalizeText(normalizedLine.match(FREQUENCY_PATTERN)?.[0] || '');
  const timing = pickFirstMatch(normalizedLine, TIMING_PATTERNS);
  const condition = pickConditionFromLine(normalizedLine);
  const dosage = pickDosageFromLine(normalizedLine);
  const medicine = cleanMedicineName(normalizedLine);

  if (!medicine) {
    return null;
  }

  return {
    medicine,
    dosage,
    frequency,
    timing,
    condition,
    instructions: normalizedLine
  };
}

function fallbackParsePrescriptionText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map(parsePrescriptionLine).filter(Boolean);
}

function frequencyToReminderTimes(frequency) {
  const value = normalizeText(frequency).toLowerCase();

  if (!value) {
    return [];
  }

  if (value === 'once daily' || value === 'daily' || value === 'od' || value === 'qam') {
    return ['morning'];
  }

  if (value === 'twice daily' || value === 'bd' || value === 'bid') {
    return ['morning', 'evening'];
  }

  if (value === 'thrice daily' || value === 'tds' || value === 'tid') {
    return ['morning', 'afternoon', 'night'];
  }

  if (value === 'qid') {
    return ['morning', 'afternoon', 'evening', 'night'];
  }

  if (value === 'qhs' || value === 'hs') {
    return ['night'];
  }

  if (/^q\d+\s*h$/.test(value)) {
    return [`every ${value.match(/\d+/)[0]} hours`];
  }

  if (/^q\d+h$/.test(value)) {
    return [`every ${value.match(/\d+/)[0]} hours`];
  }

  if (value === 'sos' || value === 'stat') {
    return ['as needed'];
  }

  return [frequency];
}

function timingToReminderTimes(timing) {
  const value = normalizeText(timing).toLowerCase();

  if (!value) {
    return [];
  }

  if (value === 'after meals' || value === 'after meal') {
    return ['after breakfast', 'after lunch', 'after dinner'];
  }

  if (value === 'before meals' || value === 'before meal') {
    return ['before breakfast', 'before lunch', 'before dinner'];
  }

  return [timing];
}

function buildRemindersFromPrescriptionItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return normalizePrescriptionItems(items).flatMap((item) => {
    const reminderTimes = timingToReminderTimes(item.timing);
    const fallbackTimes = reminderTimes.length ? reminderTimes : frequencyToReminderTimes(item.frequency);

    return fallbackTimes
      .map((time) => ({
        medicine: item.medicine,
        time: normalizeText(time),
        dosage: item.dosage,
        condition: item.condition,
        instructions: item.instructions
      }))
      .filter((reminder) => reminder.medicine && reminder.time);
  });
}

async function extractPrescriptionText(imageSource, options = {}) {
  const imageUrl = await imageToInputUrl(imageSource);
  const response = await groqResponsesRequest(
    {
      model: options.visionModel || DEFAULT_VISION_MODEL,
      temperature: 0,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Read this prescription image and transcribe only the visible medicine-related text.',
                'Preserve separate lines when possible.',
                'Do not guess missing words.',
                'Do not give medical advice.',
                'If the image is unreadable, return exactly: UNREADABLE'
              ].join(' ')
            },
            {
              type: 'input_image',
              detail: 'auto',
              image_url: imageUrl
            }
          ]
        }
      ]
    },
    options
  );

  return getResponseText(response);
}

async function parsePrescriptionText(ocrText, options = {}) {
  const text = String(ocrText || '').trim();

  if (!text || text === 'UNREADABLE') {
    return [];
  }

  try {
    const result = await callGroqStructuredResponse(
      {
        model: options.model || DEFAULT_TEXT_MODEL,
        instructions: [
          'Convert OCR text from a prescription into structured JSON.',
          'Do not give medical advice.',
          'Extract only medicines explicitly present in the OCR text.',
          'For each medicine include dosage, frequency, timing, condition, and instructions when visible.',
          'Use empty strings for missing fields.',
          'If no medicine can be identified, return {"items":[]}.'
        ].join(' '),
        input: text,
        schema: {
          name: 'prescription_items',
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    medicine: { type: 'string' },
                    dosage: { type: 'string' },
                    frequency: { type: 'string' },
                    timing: { type: 'string' },
                    condition: { type: 'string' },
                    instructions: { type: 'string' }
                  },
                  required: [
                    'medicine',
                    'dosage',
                    'frequency',
                    'timing',
                    'condition',
                    'instructions'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ['items'],
            additionalProperties: false
          }
        }
      },
      options
    );

    return normalizePrescriptionItems(result?.items);
  } catch {
    return fallbackParsePrescriptionText(text);
  }
}

async function extractPrescriptionData(imageSource, options = {}) {
  try {
    const ocrText = await extractPrescriptionText(imageSource, options);
    return parsePrescriptionText(ocrText, options);
  } catch (error) {
    if (options.debug) {
      console.error('[ocr] extractPrescriptionData failed:', error?.message || error);
    }
    return [];
  }
}

async function extractMedicinesAndReminders(imageSource, options = {}) {
  try {
    const medicines = await extractPrescriptionData(imageSource, options);

    return {
      medicines,
      reminders: buildRemindersFromPrescriptionItems(medicines)
    };
  } catch {
    return {
      medicines: [],
      reminders: []
    };
  }
}

async function extractPrescriptionDebug(imageSource, options = {}) {
  try {
    const ocrText = await extractPrescriptionText(imageSource, options);
    const medicines = await parsePrescriptionText(ocrText, options);
    const reminders = buildRemindersFromPrescriptionItems(medicines);

    return {
      success: true,
      ocrText,
      items: medicines,
      reminders,
      simpleItems: toSimplePrescriptionItems(medicines)
    };
  } catch (error) {
    return {
      success: false,
      ocrText: '',
      items: [],
      reminders: [],
      simpleItems: [],
      error: error?.message || String(error)
    };
  }
}

module.exports = {
  extractPrescriptionData,
  extractMedicinesAndReminders,
  extractPrescriptionDebug,
  extractPrescriptionText,
  parsePrescriptionText,
  fallbackParsePrescriptionText,
  buildRemindersFromPrescriptionItems,
  toSimplePrescriptionItems
};
