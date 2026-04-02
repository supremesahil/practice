const fs = require('node:fs');
const path = require('node:path');

loadLocalEnv();

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_TEXT_MODEL =
  process.env.GROQ_TEXT_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const REMINDER_TIME_PATTERN =
  /\b(after lunch|before lunch|after breakfast|before breakfast|after dinner|before dinner|after meal|after meals|before meal|before meals|in the morning|in the afternoon|in the evening|at night|tonight|tomorrow morning|tomorrow evening|tomorrow|morning|afternoon|evening|night|daily|every day|once daily|twice daily|thrice daily|every \d+\s*(?:hour|hours)|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i;

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

function normalizeReminderItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      medicine: normalizeText(item?.medicine),
      time: normalizeText(item?.time)
    }))
    .filter((item) => item.medicine && item.time);
}

function fallbackParseReminder(input) {
  const text = normalizeText(input);

  if (!text) {
    return [];
  }

  const timeMatch = text.match(REMINDER_TIME_PATTERN);

  if (!timeMatch || typeof timeMatch.index !== 'number') {
    return [];
  }

  const time = normalizeText(timeMatch[0]);
  const medicinePart = text
    .slice(0, timeMatch.index)
    .replace(
      /^(?:please\s+)?(?:give|take|add|set|schedule|remind(?:\s+me)?(?:\s+to)?(?:\s+take)?)\s+/i,
      ''
    )
    .replace(/\b(?:medicine|tablet|pill|capsule|dose)\b/gi, '')
    .trim();

  const medicine = normalizeText(medicinePart.replace(/[,:-]+$/g, ''));

  return medicine ? [{ medicine, time }] : [];
}

async function parseReminder(input, options = {}) {
  const text = normalizeText(input);

  if (!text) {
    return [];
  }

  try {
    const result = await callGroqStructuredResponse(
      {
        model: options.model || DEFAULT_TEXT_MODEL,
        instructions: [
          'Extract medicine reminder data from the user text.',
          'Do not give medical advice.',
          'Return only medicines explicitly mentioned in the text.',
          'If the text is not a medication reminder or the time is missing, return {"items":[]}.'
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
                    time: { type: 'string' }
                  },
                  required: ['medicine', 'time'],
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

    const items = normalizeReminderItems(result?.items);
    return items.length ? items : fallbackParseReminder(text);
  } catch {
    return fallbackParseReminder(text);
  }
}

module.exports = {
  getResponseText,
  parseReminder,
  fallbackParseReminder,
  normalizeReminderItems,
  groqResponsesRequest,
  callGroqStructuredResponse
};
