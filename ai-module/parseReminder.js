const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

loadLocalEnv();

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_TEXT_MODEL =
  process.env.GROQ_TEXT_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const REMINDER_TIME_PATTERN =
  /\b(after lunch|before lunch|with lunch|after breakfast|before breakfast|with breakfast|after dinner|before dinner|with dinner|after meal|after meals|before meal|before meals|with meal|with meals|empty stomach|on empty stomach|in the morning|in the afternoon|in the evening|at night|every morning|every afternoon|every evening|every night|every bedtime|tonight|tomorrow morning|tomorrow evening|tomorrow night|tomorrow|morning|afternoon|evening|night|bedtime|daily|every day|once daily|twice daily|thrice daily|three times daily|four times daily|every \d+\s*(?:hour|hours)|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i;
const DOSAGE_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|pill|pills|medicine|medicines|dose|doses|ml|drops?|puffs?)\b/i;
const DURATION_PATTERN = /\b(?:for|x)\s*\d+\s*(?:day|days|week|weeks|month|months)\b/i;
const SCHEDULE_PATTERN =
  /\b\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\b/i;
const CLI_FULL_FLAG = '--full';

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/^'(.*)'$/, '$1');

    if (key) {
      process.env[key] = value;
    }
  }
}

function getResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) {
    return '';
  }

  for (const item of payload.output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === 'string' && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  return '';
}

async function groqResponsesRequest(body, options = {}) {
  const apiKey = options.apiKey || process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }

  const response = await fetch(`${GROQ_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function callGroqStructuredResponse({ instructions, input, schema, model }, options = {}) {
  const payload = await groqResponsesRequest(
    {
      model: model || DEFAULT_TEXT_MODEL,
      instructions,
      input,
      temperature: 0,
      text: {
        format: {
          type: 'json_schema',
          name: schema.name,
          schema: schema.schema
        }
      }
    },
    options
  );

  const rawText = getResponseText(payload);

  if (!rawText) {
    throw new Error('Groq returned an empty response');
  }

  return JSON.parse(rawText);
}

function normalizeClockLabel(value) {
  const text = normalizeText(value).replace(/^at\s+/i, '');
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);

  if (!match) {
    return text;
  }

  const minutes = match[2] || '00';

  if (match[3]) {
    return `${Number(match[1])}:${minutes} ${match[3].toLowerCase()}`;
  }

  return `${String(Number(match[1])).padStart(2, '0')}:${minutes}`;
}

function extractDurationText(text) {
  const match = normalizeText(text).match(DURATION_PATTERN);
  return normalizeText(match?.[0] || '').replace(/^x\s*/i, '');
}

function extractSchedulePatternText(text) {
  const match = normalizeText(text).match(SCHEDULE_PATTERN);
  return normalizeText(match?.[0] || '');
}

function extractFrequencyText(text) {
  const value = normalizeText(text).toLowerCase();

  if (!value) {
    return '';
  }

  const hourlyMatch = value.match(/\bevery\s*(\d+)\s*hours?\b/);

  if (hourlyMatch) {
    return `every ${hourlyMatch[1]} hours`;
  }

  if (/\b(four times daily|four times a day)\b/.test(value)) {
    return 'four times daily';
  }

  if (/\b(thrice daily|three times daily|three times a day|thrice a day)\b/.test(value)) {
    return 'thrice daily';
  }

  if (/\b(twice daily|two times daily|twice a day|two times a day)\b/.test(value)) {
    return 'twice daily';
  }

  if (/\b(once daily|once a day|daily|every day)\b/.test(value)) {
    return 'once daily';
  }

  if (/\b(every night|at night)\b/.test(value)) {
    return 'nightly';
  }

  return '';
}

function extractTimingText(text) {
  const match = normalizeText(text).match(REMINDER_TIME_PATTERN);

  if (!match) {
    return '';
  }

  const raw = normalizeText(match[0]).toLowerCase();

  if (raw.startsWith('at ')) {
    return normalizeClockLabel(raw);
  }

  if (raw === 'every morning') {
    return 'morning';
  }

  if (raw === 'every afternoon') {
    return 'afternoon';
  }

  if (raw === 'every evening') {
    return 'evening';
  }

  if (raw === 'every night') {
    return 'night';
  }

  if (raw === 'every bedtime') {
    return 'bedtime';
  }

  if (raw === 'at night') {
    return 'night';
  }

  if (['daily', 'every day', 'once daily', 'twice daily', 'thrice daily', 'three times daily', 'four times daily'].includes(raw)) {
    return '';
  }

  if (/^every \d+ hours$/.test(raw)) {
    return '';
  }

  return raw;
}

function stripConversationalPrefix(value) {
  let cleaned = normalizeText(value);

  const prefixes = [
    /^(?:so|ok|okay|well|please)\b[\s,.-]*/i,
    /^(?:there is|there's|this is|it is|it's)\s+/i,
    /^(?:and|or|of|for|to)\s+/i,
    /^(?:he|she|they|we|i|you|her|him|them)\s+/i,
    /^(?:must|should|needs?\s+to|need\s+to|has\s+to|have\s+to)\s+/i,
    /^(?:be|been)\s+given\s+(?:to\s+(?:him|her|them)\s+)?/i,
    /^(?:please\s+)?(?:take|give|add|set|schedule|start|continue|use|have|keep|remind(?:\s+me)?(?:\s+to)?(?:\s+take)?)\s+/i,
    /^(?:\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|pill|pills|medicine|medicines|dose|doses|ml|drops?|puffs?)\s*(?:of\s+)*)+/i
  ];

  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of prefixes) {
      const next = cleaned.replace(pattern, '').trim();
      if (next !== cleaned) {
        cleaned = next;
        changed = true;
      }
    }
  }

  return cleaned;
}

function cleanupMedicineName(value) {
  return stripConversationalPrefix(value)
    .replace(/\b(?:that|which|who)\b.*$/i, '')
    .replace(/\b(?:should|must|needs?\s+to|need\s+to|has\s+to|have\s+to)\b.*$/i, '')
    .replace(/\b(?:be|been)\s+given\b.*$/i, '')
    .replace(/\b(?:after|before|with|every|once|twice|thrice|three times|four times|daily|at)\b.*$/i, '')
    .replace(/\b(?:each|every)\b$/i, '')
    .replace(/[,:;.-]+$/g, '')
    .trim();
}

function deriveMedicineCandidateFromSource(text) {
  const source = normalizeText(text);

  if (!source) {
    return '';
  }

  const patterns = [
    /\b(?:there is|there's|this is|it is|it's)\s+([a-z][a-z0-9+/\-]*(?:\s+[a-z][a-z0-9+/\-]*){0,2})\s+(?:that|which|who|after|before|with|every|once|twice|thrice|three|four|daily|at)\b/i,
    /\b([a-z][a-z0-9+/\-]*(?:\s+[a-z][a-z0-9+/\-]*){0,2})\s+that\s+(?:should|must|needs?\s+to|need\s+to|has\s+to|have\s+to)\b/i,
    /\b(?:take|give|add|set|schedule|start|continue|use|have|keep)\s+(?:\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|pill|pills|medicine|medicines|dose|doses|ml|drops?|puffs?)\s*(?:of\s+)?)?([a-z][a-z0-9+/\-]*(?:\s+[a-z][a-z0-9+/\-]*){0,2})\b/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    const candidate = cleanupMedicineName(match?.[1] || '');

    if (candidate) {
      return candidate;
    }
  }

  return '';
}

function normalizeMedicineName(value, sourceText = '') {
  const direct = cleanupMedicineName(value);

  if (direct && direct.split(/\s+/).length <= 4) {
    return direct;
  }

  const derived = deriveMedicineCandidateFromSource(sourceText);

  if (derived) {
    return derived;
  }

  return direct;
}

function enrichReminderFields(item, sourceText = '') {
  const source = normalizeText(sourceText).toLowerCase();
  let frequency = normalizeText(item?.frequency);
  let timing = normalizeText(item?.timing || item?.time);

  if (/\bafter\s+(?:every|each)\s+meals?\b|\bafter meals?\b/.test(source)) {
    if (!timing || /^once daily$/i.test(timing)) {
      timing = 'after meals';
    }
    if (!frequency || /^once daily$/i.test(frequency)) {
      frequency = 'thrice daily';
    }
  }

  if (/\bbefore\s+(?:every|each)\s+meals?\b|\bbefore meals?\b/.test(source)) {
    if (!timing || /^once daily$/i.test(timing)) {
      timing = 'before meals';
    }
    if (!frequency || /^once daily$/i.test(frequency)) {
      frequency = 'thrice daily';
    }
  }

  if (/\bwith\s+(?:every|each)\s+meals?\b|\bwith meals?\b/.test(source)) {
    if (!timing || /^once daily$/i.test(timing)) {
      timing = 'with meals';
    }
    if (!frequency || /^once daily$/i.test(frequency)) {
      frequency = 'thrice daily';
    }
  }

  if (/\bevery night\b/.test(source)) {
    if (!timing) {
      timing = 'night';
    }
    if (!frequency) {
      frequency = 'nightly';
    }
  }

  if (/\bevery morning\b/.test(source)) {
    if (!timing) {
      timing = 'morning';
    }
    if (!frequency) {
      frequency = 'once daily';
    }
  }

  return {
    frequency,
    timing
  };
}

function extractMedicineName(text, timingText = '') {
  const source = normalizeText(text);

  if (!source) {
    return '';
  }

  const timeMatch = timingText ? source.match(new RegExp(timingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) : null;
  const beforeTiming = timeMatch ? source.slice(0, timeMatch.index).trim() : source;
  const afterTiming = timeMatch ? source.slice((timeMatch.index || 0) + timeMatch[0].length).trim() : '';
  const candidates = [];

  const afterPatterns = [
    /\bof\s+([a-z][a-z0-9+/\- ]*)(?:\bfor\s+\d+\s*(?:day|days|week|weeks|month|months)\b)?$/i,
    /\bfor\s+([a-z][a-z0-9+/\- ]*)$/i
  ];

  for (const pattern of afterPatterns) {
    const match = afterTiming.match(pattern);
    if (match) {
      candidates.push(match[1]);
    }
  }

  const generalPatterns = [
    /(?:take|give|add|set|schedule|start|continue|remind(?:\s+me)?(?:\s+to)?(?:\s+take)?)\s+(?:\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|pill|pills|medicine|medicines|dose|doses|ml|drops?|puffs?)\s*(?:of\s+)?)?([a-z][a-z0-9+/\- ]*?)(?=\s+(?:after|before|with|every|once|twice|thrice|three times|four times|daily|at|in the|tonight|tomorrow|morning|afternoon|evening|night|bedtime|for)\b|$)/i,
    /(?:medicine|medicines|tablet|tablets|pill|pills|capsule|capsules)\s+of\s+([a-z][a-z0-9+/\- ]*?)(?=\s+(?:after|before|with|every|once|twice|thrice|three times|four times|daily|at|in the|tonight|tomorrow|morning|afternoon|evening|night|bedtime|for)\b|$)/i
  ];

  for (const pattern of generalPatterns) {
    const match = source.match(pattern);
    if (match) {
      candidates.push(match[1]);
    }
  }

  if (beforeTiming) {
    candidates.push(beforeTiming);
  }

  for (const candidate of candidates) {
    const cleaned = cleanupMedicineName(candidate)
      .replace(/\b(?:after|before|with|every|once|twice|thrice|three times|four times|daily|at)\b.*$/i, '')
      .trim();

    if (cleaned) {
      return cleaned;
    }
  }

  return '';
}

function normalizeReminderItems(items, sourceText = '') {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const normalizedSourceText = normalizeText(item?.source_text) || normalizeText(sourceText);
      const enriched = enrichReminderFields(item, normalizedSourceText);

      return {
        medicine: normalizeMedicineName(item?.medicine, normalizedSourceText),
        dosage: normalizeText(item?.dosage),
        frequency: enriched.frequency,
        timing: enriched.timing,
        duration_text: normalizeText(item?.duration_text),
        schedule_pattern: normalizeText(item?.schedule_pattern),
        condition: normalizeText(item?.condition),
        instructions: normalizeText(item?.instructions),
        source_text: normalizedSourceText
      };
    })
    .filter((item) => item.medicine);
}

function fallbackParseReminder(input) {
  const text = normalizeText(input);

  if (!text) {
    return [];
  }

  const timing = extractTimingText(text);
  const frequency = extractFrequencyText(text);
  const duration_text = extractDurationText(text);
  const schedule_pattern = extractSchedulePatternText(text);
  const dosageMatch = text.match(DOSAGE_PATTERN);
  const medicine = extractMedicineName(text, timing);

  if (!medicine) {
    return [];
  }

  return [
    {
      medicine,
      dosage: normalizeText(dosageMatch?.[0] || ''),
      frequency,
      timing,
      duration_text,
      schedule_pattern,
      condition: '',
      instructions: '',
      source_text: text
    }
  ];
}

async function parseReminderItems(input, options = {}) {
  const text = normalizeText(input);

  if (!text) {
    return [];
  }

  try {
    const result = await callGroqStructuredResponse(
      {
        model: options.model || DEFAULT_TEXT_MODEL,
        instructions: [
          'Extract medication reminder data from the user text into structured JSON.',
          'Do not give medical advice.',
          'Return only medicines explicitly mentioned in the text.',
          'Keep dosage, frequency, timing, duration_text, schedule_pattern, condition, and instructions when clearly stated.',
          'If a medicine is mentioned but its schedule is incomplete, still return the medicine with empty strings for missing fields.',
          'If the text is not about medication reminders, return {"items":[]}.'
        ].join(' '),
        input: text,
        schema: {
          name: 'reminder_items',
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
                    duration_text: { type: 'string' },
                    schedule_pattern: { type: 'string' },
                    condition: { type: 'string' },
                    instructions: { type: 'string' }
                  },
                  required: [
                    'medicine',
                    'dosage',
                    'frequency',
                    'timing',
                    'duration_text',
                    'schedule_pattern',
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

    const items = normalizeReminderItems(result?.items, text);
    return items.length ? items : fallbackParseReminder(text);
  } catch {
    return fallbackParseReminder(text);
  }
}

function buildFallbackReminderResult(items, userContext = {}) {
  const normalizedItems = normalizeReminderItems(items);
  const clarifications = normalizedItems
    .filter((item) => !item.timing && !item.frequency && !item.schedule_pattern)
    .map((item, index) => ({
      id: `${index}:schedule_pattern`,
      item_index: index,
      field: 'schedule_pattern',
      medicine: item.medicine,
      question: `What schedule should be used for ${item.medicine}? Example: 1-0-1, twice daily, after dinner, or morning, after lunch, night`
    }));
  const medications = normalizedItems.map((item) => ({
    name: item.medicine,
    dosage: item.dosage,
    schedule:
      item.timing || item.frequency || item.schedule_pattern
        ? [
            {
              time: item.timing || item.frequency || item.schedule_pattern,
              relation: 'none'
            }
          ]
        : [],
    start_date: '',
    end_date: '',
    notes: item.instructions || '',
    status: item.timing || item.frequency || item.schedule_pattern ? 'ready' : 'needs_schedule',
    pending_questions: clarifications
      .filter((question) => question.medicine === item.medicine)
      .map((question) => question.question)
  }));

  return {
    medicines: normalizedItems,
    reminder_templates: [],
    reminders: [],
    clarifications,
    setup_questions: [],
    questions: clarifications,
    user_context: userContext,
    preview: {
      medications,
      clarifications_needed: clarifications.map((question) => question.question)
    },
    medications,
    clarifications_needed: clarifications.map((question) => question.question)
  };
}

function compileReminderData(items, input, options = {}) {
  const normalizedItems = normalizeReminderItems(items, input);

  try {
    const { compilePrescriptionData } = require('./ocr');
    return compilePrescriptionData(normalizedItems, {
      ocrText: normalizeText(input),
      userContext: options.userContext || {}
    });
  } catch (error) {
    if (options.debug) {
      console.error('[parseReminder] Falling back to simple reminder result:', error?.message || error);
    }
    return buildFallbackReminderResult(normalizedItems, options.userContext || {});
  }
}

async function parseReminder(input, options = {}) {
  const text = normalizeText(input);

  if (!text) {
    return buildFallbackReminderResult([], options.userContext || {});
  }

  const items = await parseReminderItems(text, options);
  return compileReminderData(items, text, options);
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const full = argv.includes(CLI_FULL_FLAG);
  const text = normalizeText(argv.filter((arg) => arg !== CLI_FULL_FLAG).join(' '));

  return {
    full,
    text
  };
}

function buildBriefCliOutput(result) {
  const labelsByMedicine = new Map();

  for (const template of Array.isArray(result?.reminder_templates) ? result.reminder_templates : []) {
    const name = normalizeText(template?.medicine);
    const label = normalizeText(template?.time_label);

    if (!name || !label) {
      continue;
    }

    const existing = labelsByMedicine.get(name) || [];

    if (!existing.includes(label)) {
      existing.push(label);
      labelsByMedicine.set(name, existing);
    }
  }

  return {
    medications: (Array.isArray(result?.medications) ? result.medications : []).map((item) => ({
      name: item?.name || '',
      dosage: item?.dosage || '',
      schedule:
        labelsByMedicine.get(normalizeText(item?.name)) ||
        (Array.isArray(item?.schedule) ? item.schedule.map((entry) => entry?.time).filter(Boolean) : []),
      status: item?.status || '',
      pending_questions: Array.isArray(item?.pending_questions) ? item.pending_questions : []
    })),
    clarifications_needed: Array.isArray(result?.clarifications_needed) ? result.clarifications_needed : []
  };
}

async function readReminderInputFromUser(cli = parseCliArgs()) {
  const inlineText = cli.text;

  if (inlineText) {
    return inlineText;
  }

  if (!stdin.isTTY) {
    return await new Promise((resolve) => {
      let data = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => {
        data += chunk;
      });
      stdin.on('end', () => {
        resolve(normalizeText(data));
      });
    });
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    return normalizeText(await rl.question('Enter the medicine reminder text:\n> '));
  } finally {
    await rl.close();
  }
}

async function runReminderCli() {
  const cli = parseCliArgs();
  const input = await readReminderInputFromUser(cli);

  if (!input) {
    console.error('No reminder text provided.');
    process.exitCode = 1;
    return;
  }

  const result = await parseReminder(input, { debug: true });

  console.log(JSON.stringify(cli.full ? result : buildBriefCliOutput(result), null, 2));
}

if (require.main === module) {
  runReminderCli().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}

module.exports = {
  getResponseText,
  parseReminder,
  parseReminderItems,
  fallbackParseReminder,
  normalizeReminderItems,
  compileReminderData,
  groqResponsesRequest,
  callGroqStructuredResponse
};
