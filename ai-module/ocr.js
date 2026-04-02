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

const SLOT_LABELS_3 = ['morning', 'afternoon', 'night'];
const SLOT_LABELS_4 = ['morning', 'afternoon', 'evening', 'night'];
const DEFAULT_USER_CONTEXT = {
  start_date: '',
  meal_times: {
    breakfast: '',
    lunch: '',
    dinner: ''
  },
  daypart_times: {
    morning: '08:00',
    afternoon: '14:00',
    evening: '18:00',
    night: '21:00',
    bedtime: '22:00'
  },
  before_food_minutes: 30,
  after_food_minutes: 30,
  with_food_minutes: 0,
  empty_stomach_before_minutes: 60,
  empty_stomach_after_minutes: 120,
  empty_stomach_strategy: 'before_meal',
  first_dose_datetimes: {}
};

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function mergeUserContext(userContext = {}) {
  return {
    start_date: normalizeText(userContext.start_date) || DEFAULT_USER_CONTEXT.start_date,
    meal_times: {
      breakfast: normalizeText(userContext?.meal_times?.breakfast) || DEFAULT_USER_CONTEXT.meal_times.breakfast,
      lunch: normalizeText(userContext?.meal_times?.lunch) || DEFAULT_USER_CONTEXT.meal_times.lunch,
      dinner: normalizeText(userContext?.meal_times?.dinner) || DEFAULT_USER_CONTEXT.meal_times.dinner
    },
    daypart_times: {
      morning: normalizeText(userContext?.daypart_times?.morning) || DEFAULT_USER_CONTEXT.daypart_times.morning,
      afternoon: normalizeText(userContext?.daypart_times?.afternoon) || DEFAULT_USER_CONTEXT.daypart_times.afternoon,
      evening: normalizeText(userContext?.daypart_times?.evening) || DEFAULT_USER_CONTEXT.daypart_times.evening,
      night: normalizeText(userContext?.daypart_times?.night) || DEFAULT_USER_CONTEXT.daypart_times.night,
      bedtime: normalizeText(userContext?.daypart_times?.bedtime) || DEFAULT_USER_CONTEXT.daypart_times.bedtime
    },
    before_food_minutes: Number(userContext?.before_food_minutes ?? DEFAULT_USER_CONTEXT.before_food_minutes),
    after_food_minutes: Number(userContext?.after_food_minutes ?? DEFAULT_USER_CONTEXT.after_food_minutes),
    with_food_minutes: Number(userContext?.with_food_minutes ?? DEFAULT_USER_CONTEXT.with_food_minutes),
    empty_stomach_before_minutes: Number(
      userContext?.empty_stomach_before_minutes ?? DEFAULT_USER_CONTEXT.empty_stomach_before_minutes
    ),
    empty_stomach_after_minutes: Number(
      userContext?.empty_stomach_after_minutes ?? DEFAULT_USER_CONTEXT.empty_stomach_after_minutes
    ),
    empty_stomach_strategy:
      normalizeText(userContext?.empty_stomach_strategy) || DEFAULT_USER_CONTEXT.empty_stomach_strategy,
    first_dose_datetimes: { ...(userContext?.first_dose_datetimes || {}) }
  };
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

function getAllCandidateText(item) {
  return [
    item?.medicine,
    item?.dosage,
    item?.frequency,
    item?.timing,
    item?.duration_text,
    item?.schedule_pattern,
    item?.condition,
    item?.instructions,
    item?.source_text
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' | ');
}

function parseDurationDetails(text) {
  const value = normalizeText(text);

  if (!value) {
    return {
      text: '',
      value: null,
      unit: '',
      days: null
    };
  }

  const patterns = [
    /\bfor\s+(\d+)\s*(day|days|week|weeks|month|months)\b/i,
    /\bx\s*(\d+)\s*(d|day|days|wk|wks|week|weeks|mo|mos|month|months)\b/i,
    /\b(\d+)\s*(day|days|week|weeks|month|months)\b/i
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (!match) {
      continue;
    }

    const amount = Number(match[1]);
    const rawUnit = match[2].toLowerCase();
    let unit = 'days';
    let days = amount;

    if (rawUnit.startsWith('wk') || rawUnit.startsWith('week')) {
      unit = amount === 1 ? 'week' : 'weeks';
      days = amount * 7;
    } else if (rawUnit.startsWith('mo') || rawUnit.startsWith('month')) {
      unit = amount === 1 ? 'month' : 'months';
      days = amount * 30;
    } else {
      unit = amount === 1 ? 'day' : 'days';
      days = amount;
    }

    return {
      text: `${amount} ${unit}`,
      value: amount,
      unit,
      days
    };
  }

  return {
    text: '',
    value: null,
    unit: '',
    days: null
  };
}

function extractSchedulePattern(text) {
  const value = normalizeText(text);

  if (!value) {
    return {
      pattern: '',
      slots: [],
      labels: [],
      ambiguous: false
    };
  }

  const cleaned = value
    .replace(/\b(?:tablet|tablets|tab|capsule|capsules|cap|caps|ml|mg|mcg|g|drops?|puffs?)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ');
  const threePartMatches = [...cleaned.matchAll(/\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/g)];

  if (threePartMatches.length) {
    const match = threePartMatches[threePartMatches.length - 1];
    const slots = match.slice(1).map(Number);

    return {
      pattern: slots.join('-'),
      slots,
      labels: SLOT_LABELS_3,
      ambiguous: false
    };
  }

  const fourPartMatches = [
    ...cleaned.matchAll(
      /\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/g
    )
  ];

  if (fourPartMatches.length) {
    const match = fourPartMatches[fourPartMatches.length - 1];
    const slots = match.slice(1).map(Number);

    return {
      pattern: slots.join('-'),
      slots,
      labels: SLOT_LABELS_4,
      ambiguous: false
    };
  }

  const twoPartMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/);

  if (twoPartMatch && /-/.test(cleaned)) {
    return {
      pattern: `${twoPartMatch[1]}-${twoPartMatch[2]}`,
      slots: [],
      labels: [],
      ambiguous: true
    };
  }

  return {
    pattern: '',
    slots: [],
    labels: [],
    ambiguous: false
  };
}

function extractMealRelation(text) {
  const value = normalizeText(text).toLowerCase();

  if (!value) {
    return '';
  }

  if (/\bempty stomach\b/.test(value) || /\bon empty stomach\b/.test(value)) {
    return 'empty stomach';
  }

  if (
    /\bafter meals?\b/.test(value) ||
    /\bafter food\b/.test(value) ||
    /\bpost meals?\b/.test(value) ||
    /\bpc\b/.test(value)
  ) {
    return 'after food';
  }

  if (
    /\bbefore meals?\b/.test(value) ||
    /\bbefore food\b/.test(value) ||
    /\bempty stomach\b/.test(value) ||
    /\bon empty stomach\b/.test(value) ||
    /\bac\b/.test(value)
  ) {
    return 'before food';
  }

  if (/\bwith food\b/.test(value) || /\bwith meals?\b/.test(value)) {
    return 'with food';
  }

  return '';
}

function detectInstructionConflicts(text) {
  const value = normalizeText(text).toLowerCase();
  const conflicts = [];

  if (!value) {
    return conflicts;
  }

  const hasAfterFood =
    /\bafter meals?\b/.test(value) || /\bafter food\b/.test(value) || /\bpost meals?\b/.test(value);
  const hasBeforeFood =
    /\bbefore meals?\b/.test(value) || /\bbefore food\b/.test(value) || /\bac\b/.test(value);
  const hasEmptyStomach = /\bempty stomach\b/.test(value) || /\bon empty stomach\b/.test(value);

  if ((hasAfterFood && hasBeforeFood) || (hasAfterFood && hasEmptyStomach)) {
    conflicts.push('Conflicting food instructions detected');
  }

  return conflicts;
}

function normalizeFrequencyText(text) {
  const value = normalizeText(text).toLowerCase();

  if (!value) {
    return '';
  }

  if (/\b(as needed|when required|if required|prn|sos|stat)\b/.test(value)) {
    return 'as needed';
  }

  const hourlyMatch = value.match(/\bq\s*(\d+)\s*h\b|\bevery\s*(\d+)\s*hours?\b/);

  if (hourlyMatch) {
    const hours = hourlyMatch[1] || hourlyMatch[2];
    return `every ${hours} hours`;
  }

  if (/\b(twice a day|twice daily|bid|bd)\b/.test(value)) {
    return 'twice daily';
  }

  if (/\b(thrice daily|three times a day|thrice a day|tid|tds)\b/.test(value)) {
    return 'thrice daily';
  }

  if (/\b(four times a day|qid)\b/.test(value)) {
    return 'four times daily';
  }

  if (/\b(once a day|once daily|daily|od|qd|qam)\b/.test(value)) {
    return 'once daily';
  }

  if (/\b(at night|qhs|hs)\b/.test(value)) {
    return 'nightly';
  }

  if (/\btwice daily\b/.test(value)) {
    return 'twice daily';
  }

  return '';
}

function pickDosageText(item, combinedText) {
  const existing = normalizeText(item?.dosage);
  const sourceMatch = combinedText.match(
    /\b\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|ml|drops?|puffs?)\b/i
  );
  const sourceDose = normalizeText(sourceMatch?.[0] || '');

  if (sourceDose && (!existing || /[+()]/.test(existing) || !/(tablet|tab|capsule|cap|ml|drop|puff)/i.test(existing))) {
    return sourceDose;
  }

  if (existing) {
    return existing;
  }

  return sourceDose;
}

function findSourceTextBlocks(ocrText, items) {
  const source = String(ocrText || '');
  const lines = source
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  return items.map((item, index) => {
    const medicine = normalizeText(item?.medicine);

    if (!medicine) {
      return '';
    }

    const medicineWords = medicine.toLowerCase().split(/\s+/).filter(Boolean);
    const key = medicineWords.slice(0, Math.min(3, medicineWords.length)).join(' ');
    const startIndex = lines.findIndex((line) => line.toLowerCase().includes(key));

    if (startIndex === -1) {
      return '';
    }

    let endIndex = lines.length;

    for (let nextItemIndex = index + 1; nextItemIndex < items.length; nextItemIndex += 1) {
      const nextMedicine = normalizeText(items[nextItemIndex]?.medicine);

      if (!nextMedicine) {
        continue;
      }

      const nextKey = nextMedicine
        .toLowerCase()
        .split(/\s+/)
        .slice(0, Math.min(3, nextMedicine.split(/\s+/).length))
        .join(' ');
      const nextStart = lines.findIndex((line, lineIndex) => lineIndex > startIndex && line.toLowerCase().includes(nextKey));

      if (nextStart !== -1) {
        endIndex = nextStart;
        break;
      }
    }

    return lines.slice(startIndex, Math.min(endIndex, startIndex + 6)).join(' ');
  });
}

function deriveCondition(item, combinedText, globalContext) {
  const existing = normalizeText(item?.condition);

  if (existing) {
    return existing;
  }

  const source = `${combinedText} ${globalContext}`.toLowerCase();
  const matches = [];

  if (source.includes('fever')) {
    matches.push('fever');
  }

  if (source.includes('pain')) {
    matches.push('pain');
  }

  if (source.includes('cough')) {
    matches.push('cough');
  }

  return matches.join(', ');
}

function buildTimingSummary(scheduleInfo, mealRelation, explicitTiming, frequency) {
  const timing = normalizeText(explicitTiming);
  const hasPositiveSchedule = scheduleInfo.pattern && scheduleInfo.slots.some((slot) => slot > 0);

  if (timing && !/morning - afternoon - night/i.test(timing) && !/^\d+\s*-\s*\d+/.test(timing)) {
    return timing;
  }

  if (hasPositiveSchedule) {
    return scheduleInfo.pattern;
  }

  return mealRelation || frequency;
}

function normalizePrescriptionItems(items, ocrText = '') {
  if (!Array.isArray(items)) {
    return [];
  }

  const sourceBlocks = findSourceTextBlocks(ocrText, items);
  const globalContext = normalizeText(ocrText);

  return items
    .map((item, index) => {
      const sourceText = normalizeText(item?.source_text) || sourceBlocks[index] || '';
      const combinedText = getAllCandidateText({ ...item, source_text: sourceText });
      const schedulePatternSource = item?.schedule_confirmed
        ? normalizeText(item?.schedule_pattern)
        : [item?.schedule_pattern, item?.timing, item?.frequency, item?.instructions, sourceText].join(' ');
      const scheduleInfo = extractSchedulePattern(schedulePatternSource);
      const mealRelation = extractMealRelation(
        [item?.timing, item?.instructions, sourceText].join(' ')
      );
      const duration = parseDurationDetails(
        [item?.duration_text, item?.frequency, item?.instructions, sourceText].join(' ')
      );
      const frequency = normalizeFrequencyText(
        [item?.frequency, item?.instructions, sourceText].join(' ')
      );
      const conflicts = detectInstructionConflicts(
        [item?.timing, item?.instructions, sourceText].join(' ')
      );
      const zeroPatternConflict =
        scheduleInfo.pattern &&
        scheduleInfo.slots.length > 0 &&
        scheduleInfo.slots.every((slot) => slot === 0) &&
        Boolean(frequency);
      if (zeroPatternConflict) {
        conflicts.push('Schedule grid conflicts with text frequency');
      }
      const scheduleAmbiguous = item?.schedule_confirmed
        ? false
        : scheduleInfo.ambiguous ||
          /\b\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|ml)\s*-\s*\d+\s*-\s*\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|capsule|capsules|cap|caps|ml)\b/i.test(
            sourceText
          );

      return {
        medicine_name: normalizeText(item?.medicine),
        medicine: normalizeText(item?.medicine),
        manual_time_labels: Array.isArray(item?.manual_time_labels)
          ? item.manual_time_labels.map((label) => normalizeText(label)).filter(Boolean)
          : [],
        dosage: pickDosageText(item, combinedText),
        frequency,
        timing_relation: mealRelation || 'none',
        timing: buildTimingSummary(scheduleInfo, mealRelation, item?.timing, frequency),
        specific_times:
          buildTimingSummary(scheduleInfo, mealRelation, item?.timing, frequency) &&
          isSpecificTimeLabel(buildTimingSummary(scheduleInfo, mealRelation, item?.timing, frequency))
            ? [buildTimingSummary(scheduleInfo, mealRelation, item?.timing, frequency)]
            : [],
        duration: duration.text,
        duration_text: duration.text,
        duration_days: duration.days,
        schedule_pattern: scheduleInfo.pattern,
        condition: deriveCondition(item, combinedText, globalContext),
        special_instructions: normalizeText(item?.instructions),
        instructions: normalizeText(item?.instructions),
        meal_relation: mealRelation,
        as_needed: frequency === 'as needed',
        source_text: sourceText,
        schedule_ambiguous: scheduleAmbiguous,
        schedule_confirmed: Boolean(item?.schedule_confirmed),
        conflicts
      };
    })
    .filter((item) => item.medicine);
}

function toSimplePrescriptionItems(items) {
  return normalizePrescriptionItems(items).map((item) => ({
    medicine: item.medicine,
    frequency: item.frequency
  }));
}

function slotToReminderTime(slotLabel, mealRelation) {
  if (mealRelation === 'empty stomach') {
    if (slotLabel === 'morning') {
      return 'empty stomach breakfast';
    }

    if (slotLabel === 'afternoon') {
      return 'empty stomach lunch';
    }

    if (slotLabel === 'evening' || slotLabel === 'night') {
      return 'empty stomach dinner';
    }
  }

  if (mealRelation === 'after food') {
    if (slotLabel === 'morning') {
      return 'after breakfast';
    }

    if (slotLabel === 'afternoon') {
      return 'after lunch';
    }

    if (slotLabel === 'evening' || slotLabel === 'night') {
      return 'after dinner';
    }
  }

  if (mealRelation === 'before food') {
    if (slotLabel === 'morning') {
      return 'before breakfast';
    }

    if (slotLabel === 'afternoon') {
      return 'before lunch';
    }

    if (slotLabel === 'evening' || slotLabel === 'night') {
      return 'before dinner';
    }
  }

  if (mealRelation === 'with food') {
    if (slotLabel === 'morning') {
      return 'with breakfast';
    }

    if (slotLabel === 'afternoon') {
      return 'with lunch';
    }

    if (slotLabel === 'evening' || slotLabel === 'night') {
      return 'with dinner';
    }
  }

  return slotLabel;
}

function isClockTime(text) {
  return /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(normalizeText(text)) ||
    /^(?:0?\d|1[0-2]):[0-5]\d\s*(?:am|pm)$/i.test(normalizeText(text));
}

function parseClockTimeToMinutes(text) {
  const value = normalizeText(text).toLowerCase();

  if (!value) {
    return null;
  }

  let match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }

  match = value.match(/^(0?\d|1[0-2]):([0-5]\d)\s*(am|pm)$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]) % 12;

  if (match[3] === 'pm') {
    hours += 12;
  }

  return hours * 60 + Number(match[2]);
}

function formatMinutesAsTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isMealLabel(label) {
  return /breakfast|lunch|dinner/.test(normalizeText(label).toLowerCase());
}

function isDaypartLabel(label) {
  return /^(morning|afternoon|evening|night|bedtime)$/.test(normalizeText(label).toLowerCase());
}

function isSpecificTimeLabel(label) {
  const normalized = normalizeText(label).toLowerCase();

  return (
    isClockTime(label) ||
    isDaypartLabel(label) ||
    /^(before breakfast|after breakfast|with breakfast|empty stomach breakfast|before lunch|after lunch|with lunch|empty stomach lunch|before dinner|after dinner|with dinner|empty stomach dinner)$/.test(
      normalized
    )
  );
}

function splitManualTimeLabels(value) {
  return normalizeText(value)
    .split(',')
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function normalizeManualTimeLabel(label, relation) {
  const normalizedLabel = normalizeText(label).toLowerCase();
  const normalizedRelation = normalizeText(relation).toLowerCase();

  if (!isDaypartLabel(normalizedLabel)) {
    return normalizeText(label);
  }

  if (normalizedRelation === 'after food') {
    return slotToReminderTime(normalizedLabel === 'bedtime' ? 'night' : normalizedLabel, 'after food');
  }

  if (normalizedRelation === 'before food') {
    return slotToReminderTime(normalizedLabel === 'bedtime' ? 'night' : normalizedLabel, 'before food');
  }

  if (normalizedRelation === 'with food') {
    return slotToReminderTime(normalizedLabel === 'bedtime' ? 'night' : normalizedLabel, 'with food');
  }

  if (normalizedRelation === 'empty stomach') {
    return slotToReminderTime(normalizedLabel === 'bedtime' ? 'night' : normalizedLabel, 'empty stomach');
  }

  return normalizeText(label);
}

function normalizeReminderLabel(label, relation) {
  if (isClockTime(label)) {
    return normalizeText(label);
  }

  return normalizeManualTimeLabel(label, relation);
}

function isValidManualTimeList(value) {
  const labels = splitManualTimeLabels(value);

  return (
    labels.length > 1 &&
    labels.every((label) => isClockTime(label) || isSpecificTimeLabel(label))
  );
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizeText(value));
}

function isValidDateTimeString(value) {
  return /^\d{4}-\d{2}-\d{2}\s+(?:[01]?\d|2[0-3]):[0-5]\d$/.test(normalizeText(value));
}

function resolveTimeLabelToClock(label, userContext = {}) {
  const value = normalizeText(label);
  const normalized = value.toLowerCase();

  if (isClockTime(value)) {
    return value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
  }

  const context = mergeUserContext(userContext);
  const mealTimes = context.meal_times || {};
  const daypartTimes = context.daypart_times || {};
  const offsets = {
    before_food_minutes: Number(context.before_food_minutes ?? 30),
    after_food_minutes: Number(context.after_food_minutes ?? 30),
    with_food_minutes: Number(context.with_food_minutes ?? 0),
    empty_stomach_before_minutes: Number(context.empty_stomach_before_minutes ?? 60),
    empty_stomach_after_minutes: Number(context.empty_stomach_after_minutes ?? 120)
  };

  if (normalized === 'before breakfast') {
    const base = parseClockTimeToMinutes(mealTimes.breakfast);
    return base === null ? '' : formatMinutesAsTime(base - offsets.before_food_minutes);
  }

  if (normalized === 'after breakfast') {
    const base = parseClockTimeToMinutes(mealTimes.breakfast);
    return base === null ? '' : formatMinutesAsTime(base + offsets.after_food_minutes);
  }

  if (normalized === 'with breakfast') {
    const base = parseClockTimeToMinutes(mealTimes.breakfast);
    return base === null ? '' : formatMinutesAsTime(base + offsets.with_food_minutes);
  }

  if (normalized === 'empty stomach breakfast') {
    const base = parseClockTimeToMinutes(mealTimes.breakfast);
    if (base === null) {
      return '';
    }

    return context.empty_stomach_strategy === 'after_meal'
      ? formatMinutesAsTime(base + offsets.empty_stomach_after_minutes)
      : formatMinutesAsTime(base - offsets.empty_stomach_before_minutes);
  }

  if (normalized === 'before lunch') {
    const base = parseClockTimeToMinutes(mealTimes.lunch);
    return base === null ? '' : formatMinutesAsTime(base - offsets.before_food_minutes);
  }

  if (normalized === 'after lunch') {
    const base = parseClockTimeToMinutes(mealTimes.lunch);
    return base === null ? '' : formatMinutesAsTime(base + offsets.after_food_minutes);
  }

  if (normalized === 'with lunch') {
    const base = parseClockTimeToMinutes(mealTimes.lunch);
    return base === null ? '' : formatMinutesAsTime(base + offsets.with_food_minutes);
  }

  if (normalized === 'empty stomach lunch') {
    const base = parseClockTimeToMinutes(mealTimes.lunch);
    if (base === null) {
      return '';
    }

    return context.empty_stomach_strategy === 'after_meal'
      ? formatMinutesAsTime(base + offsets.empty_stomach_after_minutes)
      : formatMinutesAsTime(base - offsets.empty_stomach_before_minutes);
  }

  if (normalized === 'before dinner') {
    const base = parseClockTimeToMinutes(mealTimes.dinner);
    return base === null ? '' : formatMinutesAsTime(base - offsets.before_food_minutes);
  }

  if (normalized === 'after dinner') {
    const base = parseClockTimeToMinutes(mealTimes.dinner);
    return base === null ? '' : formatMinutesAsTime(base + offsets.after_food_minutes);
  }

  if (normalized === 'with dinner') {
    const base = parseClockTimeToMinutes(mealTimes.dinner);
    return base === null ? '' : formatMinutesAsTime(base + offsets.with_food_minutes);
  }

  if (normalized === 'empty stomach dinner') {
    const base = parseClockTimeToMinutes(mealTimes.dinner);
    if (base === null) {
      return '';
    }

    return context.empty_stomach_strategy === 'after_meal'
      ? formatMinutesAsTime(base + offsets.empty_stomach_after_minutes)
      : formatMinutesAsTime(base - offsets.empty_stomach_before_minutes);
  }

  if (isDaypartLabel(normalized)) {
    return normalizeText(daypartTimes[normalized]);
  }

  return '';
}

function addDaysToDate(dateText, additionalDays) {
  const match = normalizeText(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, monthIndex, day + additionalDays));

  return utcDate.toISOString().slice(0, 10);
}

function frequencyToSlotLabels(frequency) {
  switch (normalizeText(frequency).toLowerCase()) {
    case 'once daily':
      return ['morning'];
    case 'twice daily':
      return ['morning', 'night'];
    case 'thrice daily':
      return ['morning', 'afternoon', 'night'];
    case 'four times daily':
      return ['morning', 'afternoon', 'evening', 'night'];
    case 'nightly':
      return ['night'];
    default:
      return [];
  }
}

function buildReminderTemplatesFromPrescriptionItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return normalizePrescriptionItems(items).flatMap((item) => {
    if (item.schedule_ambiguous || (Array.isArray(item.conflicts) && item.conflicts.length)) {
      return [];
    }

    if (Array.isArray(item.manual_time_labels) && item.manual_time_labels.length) {
      return item.manual_time_labels.map((label) => ({
        medicine: item.medicine,
        template_type: 'daily',
        time_label: normalizeReminderLabel(label, item.timing_relation),
        relation:
          mapRelationForOutput({ time_label: normalizeReminderLabel(label, item.timing_relation) }) === 'none'
            ? item.timing_relation
            : mapRelationForOutput({ time_label: normalizeReminderLabel(label, item.timing_relation) }),
        dosage: item.dosage,
        duration_text: item.duration_text,
        duration_days: item.duration_days,
        condition: item.condition,
        instructions: item.instructions
      }));
    }

    if (item.as_needed) {
      const timing = normalizeText(item.timing);

      if (!timing || timing === 'when required' || timing === 'as needed') {
        return [];
      }

      return [
        {
          medicine: item.medicine,
          template_type: 'prn',
          time_label: normalizeReminderLabel(timing, item.timing_relation),
          relation:
            mapRelationForOutput({ time_label: normalizeReminderLabel(timing, item.timing_relation) }) === 'none'
              ? item.timing_relation
              : mapRelationForOutput({ time_label: normalizeReminderLabel(timing, item.timing_relation) }),
          dosage: item.dosage,
          duration_text: item.duration_text,
          duration_days: item.duration_days,
          condition: item.condition,
          instructions: item.instructions
        }
      ];
    }

    const scheduleInfo = extractSchedulePattern(item.schedule_pattern);

    if (scheduleInfo.pattern && scheduleInfo.slots.some((slot) => slot > 0)) {
      return scheduleInfo.slots.flatMap((doseCount, index) => {
        if (doseCount <= 0) {
          return [];
        }

        const slotLabel = scheduleInfo.labels[index];

        return [
          {
            medicine: item.medicine,
            template_type: 'daily',
            time_label: slotToReminderTime(slotLabel, item.meal_relation),
            relation: item.timing_relation,
            dose_count: doseCount,
            dosage: item.dosage,
            duration_text: item.duration_text,
            duration_days: item.duration_days,
            condition: item.condition,
            instructions: item.instructions
          }
        ];
      });
    }

    const slotLabels = frequencyToSlotLabels(item.frequency);

    if (slotLabels.length) {
      return slotLabels.map((slotLabel) => ({
        medicine: item.medicine,
        template_type: 'daily',
        time_label: slotToReminderTime(slotLabel, item.meal_relation),
        relation: item.timing_relation,
        dosage: item.dosage,
        duration_text: item.duration_text,
        duration_days: item.duration_days,
        condition: item.condition,
        instructions: item.instructions
      }));
    }

    if (/^every \d+ hours$/.test(item.frequency)) {
      return [
        {
          medicine: item.medicine,
          template_type: 'interval',
          time_label: item.frequency,
          relation: item.timing_relation,
          interval_hours: Number(item.frequency.match(/\d+/)?.[0] || 0),
          dosage: item.dosage,
          duration_text: item.duration_text,
          duration_days: item.duration_days,
          condition: item.condition,
          instructions: item.instructions
        }
      ];
    }

    if (item.timing && !/^\d+\s*-\s*\d+/.test(item.timing) && isSpecificTimeLabel(item.timing)) {
      return [
        {
          medicine: item.medicine,
          template_type: 'daily',
          time_label: normalizeReminderLabel(item.timing, item.timing_relation),
          relation:
            mapRelationForOutput({ time_label: normalizeReminderLabel(item.timing, item.timing_relation) }) === 'none'
              ? item.timing_relation
              : mapRelationForOutput({ time_label: normalizeReminderLabel(item.timing, item.timing_relation) }),
          dosage: item.dosage,
          duration_text: item.duration_text,
          duration_days: item.duration_days,
          condition: item.condition,
          instructions: item.instructions
        }
      ];
    }

    return [];
  });
}

function buildClarifications(items) {
  const normalizedItems = normalizePrescriptionItems(items);
  const templatesByMedicine = buildReminderTemplatesFromPrescriptionItems(normalizedItems);

  return normalizedItems.flatMap((item, index) => {
    const prompts = [];
    const itemTemplates = templatesByMedicine.filter((template) => template.medicine === item.medicine);

    if (Array.isArray(item.conflicts) && item.conflicts.length) {
      prompts.push({
        id: `${index}:conflict`,
        item_index: index,
        field: 'conflict',
        medicine: item.medicine,
        question: `${item.medicine} has conflicting instructions. Please confirm the correct timing relation or schedule.`
      });
      return prompts;
    }

    if (!item.duration_text) {
      prompts.push({
        id: `${index}:duration_text`,
        item_index: index,
        field: 'duration_text',
        medicine: item.medicine,
        question: `How long should reminders be set for ${item.medicine}? Example: 5 days`
      });
    }

    if (item.as_needed) {
      if (
        (Array.isArray(item.manual_time_labels) && item.manual_time_labels.length) ||
        isSpecificTimeLabel(item.timing) ||
        isClockTime(item.timing)
      ) {
        return prompts;
      }

      prompts.push({
        id: `${index}:timing`,
        item_index: index,
        field: 'timing',
        medicine: item.medicine,
        question: `${item.medicine} is marked as needed. Enter a reminder time if you want one, or press Enter to skip. Example: after dinner or 21:00`
      });
    } else if (item.schedule_ambiguous || !itemTemplates.length) {
      prompts.push({
        id: `${index}:schedule_pattern`,
        item_index: index,
        field: 'schedule_pattern',
        medicine: item.medicine,
        question: `What schedule should be used for ${item.medicine}? Example: 1-0-1, twice daily, after dinner, or morning, after lunch, night`
      });
    }

    return prompts;
  });
}

function buildSetupQuestions(templates, userContext = {}) {
  const prompts = [];
  const context = mergeUserContext(userContext);
  const startDate = normalizeText(context.start_date);

  if (templates.length && !startDate) {
    prompts.push({
      id: 'global:start_date',
      field: 'start_date',
      question: 'From which date should these reminders start? Use YYYY-MM-DD.'
    });
  }

  const labels = templates.map((template) => normalizeText(template.time_label).toLowerCase());
  const needsBreakfast = labels.some((label) => label.includes('breakfast'));
  const needsLunch = labels.some((label) => label.includes('lunch'));
  const needsDinner = labels.some((label) => label.includes('dinner'));
  if (needsBreakfast && !normalizeText(context?.meal_times?.breakfast)) {
    prompts.push({
      id: 'global:meal_breakfast_time',
      field: 'meal_breakfast_time',
      question: 'What time is breakfast usually? Use HH:MM in 24-hour format.'
    });
  }

  if (needsLunch && !normalizeText(context?.meal_times?.lunch)) {
    prompts.push({
      id: 'global:meal_lunch_time',
      field: 'meal_lunch_time',
      question: 'What time is lunch usually? Use HH:MM in 24-hour format.'
    });
  }

  if (needsDinner && !normalizeText(context?.meal_times?.dinner)) {
    prompts.push({
      id: 'global:meal_dinner_time',
      field: 'meal_dinner_time',
      question: 'What time is dinner usually? Use HH:MM in 24-hour format.'
    });
  }

  for (const template of templates) {
    if (template.template_type === 'interval') {
      const key = context?.first_dose_datetimes?.[template.medicine];

      if (!normalizeText(key)) {
        prompts.push({
          id: `global:first_dose_datetime:${template.medicine}`,
          field: 'first_dose_datetime',
          medicine: template.medicine,
          question: `When should the first dose for ${template.medicine} happen? Use YYYY-MM-DD HH:MM.`
        });
      }
    }
  }

  return prompts;
}

function resolveReminderTemplates(templates, userContext = {}) {
  const context = mergeUserContext(userContext);
  const startDate = normalizeText(context.start_date);

  return templates.flatMap((template) => {
    if (template.template_type === 'interval') {
      const firstDoseAt = normalizeText(context?.first_dose_datetimes?.[template.medicine]);

      if (!firstDoseAt) {
        return [];
      }

      return [
        {
          medicine: template.medicine,
          reminder_type: 'interval',
          first_dose_at: firstDoseAt,
          repeat_every_hours: template.interval_hours,
          relation: template.relation || 'none',
          dosage: template.dosage,
          duration_text: template.duration_text,
          duration_days: template.duration_days,
          condition: template.condition,
          instructions: template.instructions
        }
      ];
    }

    const time = resolveTimeLabelToClock(template.time_label, context);

    if (!time || !startDate) {
      return [];
    }

    return [
      {
        medicine: template.medicine,
        reminder_type: 'daily',
        time_label: template.time_label,
        time,
        relation: template.relation || mapRelationForOutput(template),
        start_date: startDate,
        dose_count: template.dose_count,
        dosage: template.dosage,
        duration_text: template.duration_text,
        duration_days: template.duration_days,
        end_date:
          template.duration_days && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
            ? addDaysToDate(startDate, template.duration_days - 1)
            : '',
        condition: template.condition,
        instructions: template.instructions
      }
    ];
  });
}

function mapRelationForOutput(templateOrReminder) {
  const explicitRelation = normalizeText(templateOrReminder?.relation);

  if (explicitRelation) {
    return explicitRelation.replace(/\s+/g, '_');
  }

  const label = normalizeText(templateOrReminder?.time_label).toLowerCase();

  if (label.includes('before')) {
    return 'before_food';
  }

  if (label.includes('after')) {
    return 'after_food';
  }

  if (label.includes('with')) {
    return 'with_food';
  }

  if (label.includes('empty stomach')) {
    return 'empty_stomach';
  }

  return 'none';
}

function buildSimpleOutput(medicines, reminders, questions) {
  const grouped = new Map();
  const questionList = Array.isArray(questions) ? questions : [];

  for (const medicine of medicines) {
    grouped.set(medicine.medicine, {
      name: medicine.medicine,
      dosage: medicine.dosage,
      schedule: [],
      start_date: '',
      end_date: '',
      notes: medicine.instructions || medicine.special_instructions || '',
      status: 'ready',
      pending_questions: []
    });
  }

  for (const reminder of reminders) {
    const entry = grouped.get(reminder.medicine) || {
      name: reminder.medicine,
      dosage: reminder.dosage || '',
      schedule: [],
      start_date: '',
      end_date: '',
      notes: reminder.instructions || ''
    };

    entry.schedule.push({
      time: reminder.time || reminder.first_dose_at || '',
      relation: mapRelationForOutput(reminder)
    });
    entry.start_date = reminder.start_date || entry.start_date;
    entry.end_date = reminder.end_date || entry.end_date;
    entry.notes = entry.notes || reminder.instructions || '';

    grouped.set(reminder.medicine, entry);
  }

  for (const question of questionList) {
    if (!question?.medicine) {
      continue;
    }

    const entry = grouped.get(question.medicine);

    if (!entry) {
      continue;
    }

    entry.status = 'needs_clarification';
    entry.pending_questions.push(question.question);
  }

  for (const entry of grouped.values()) {
    if (!entry.schedule.length && entry.status !== 'needs_clarification') {
      entry.status = 'needs_schedule';
    }
  }

  return {
    medications: [...grouped.values()],
    clarifications_needed: (questions || []).map((question) => question.question)
  };
}

function compilePrescriptionData(items, options = {}) {
  const medicines = normalizePrescriptionItems(items, options.ocrText);
  const context = mergeUserContext(options.userContext || {});
  const reminder_templates = buildReminderTemplatesFromPrescriptionItems(medicines);
  const clarifications = buildClarifications(medicines);
  const setup_questions = buildSetupQuestions(reminder_templates, context);
  const reminders = resolveReminderTemplates(reminder_templates, context);
  const questions = [...clarifications, ...setup_questions];
  const preview = buildSimpleOutput(medicines, reminders, questions);

  return {
    medicines,
    reminder_templates,
    reminders,
    clarifications,
    setup_questions,
    questions,
    user_context: context,
    preview,
    medications: preview.medications,
    clarifications_needed: preview.clarifications_needed
  };
}

function applyClarificationAnswers(result, answers = {}) {
  const medicines = Array.isArray(result?.medicines)
    ? result.medicines.map((item) => ({ ...item }))
    : [];
  const userContext = mergeUserContext(result?.user_context || {});

  for (const medicine of medicines) {
    medicine.source_text = normalizeText(medicine.source_text);
  }

  for (const [key, answer] of Object.entries(answers)) {
    const value = normalizeText(answer);

    if (!value) {
      continue;
    }

    if (key.startsWith('global:')) {
      const parts = key.split(':');
      const field = parts[1];

      if (field === 'start_date') {
        if (isValidDateString(value)) {
          userContext.start_date = value;
        }
        continue;
      }

      if (field === 'meal_breakfast_time') {
        if (isClockTime(value)) {
          userContext.meal_times.breakfast = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'meal_lunch_time') {
        if (isClockTime(value)) {
          userContext.meal_times.lunch = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'meal_dinner_time') {
        if (isClockTime(value)) {
          userContext.meal_times.dinner = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'daypart_morning_time') {
        if (isClockTime(value)) {
          userContext.daypart_times.morning = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'daypart_afternoon_time') {
        if (isClockTime(value)) {
          userContext.daypart_times.afternoon = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'daypart_evening_time') {
        if (isClockTime(value)) {
          userContext.daypart_times.evening = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'daypart_night_time') {
        if (isClockTime(value)) {
          userContext.daypart_times.night = value.length === 5 ? value : formatMinutesAsTime(parseClockTimeToMinutes(value));
        }
        continue;
      }

      if (field === 'first_dose_datetime') {
        const medicineName = parts.slice(2).join(':');
        if (isValidDateTimeString(value)) {
          userContext.first_dose_datetimes[medicineName] = value;
        }
      }

      continue;
    }

    const [indexText, field] = key.split(':');
    const index = Number(indexText);

    if (!Number.isInteger(index) || !medicines[index]) {
      continue;
    }

    if (field === 'duration_text') {
      if (parseDurationDetails(value).text) {
        medicines[index].duration_text = value;
      }
      continue;
    }

    if (field === 'schedule_pattern') {
      const parsedPattern = extractSchedulePattern(value);
      const normalizedFrequency = normalizeFrequencyText(value);
      const normalizedTiming = normalizeText(value);

      if (isValidManualTimeList(value)) {
        medicines[index].manual_time_labels = splitManualTimeLabels(value);
        medicines[index].schedule_confirmed = true;
        medicines[index].schedule_ambiguous = false;
        continue;
      }

      if (parsedPattern.pattern || normalizedFrequency || isSpecificTimeLabel(normalizedTiming) || isClockTime(normalizedTiming)) {
        medicines[index].manual_time_labels = [];
        medicines[index].schedule_pattern = parsedPattern.pattern || medicines[index].schedule_pattern;
        medicines[index].frequency = normalizedFrequency || medicines[index].frequency;
        medicines[index].timing = normalizedTiming;
        medicines[index].schedule_confirmed = true;
        medicines[index].schedule_ambiguous = false;
      }
      continue;
    }

    if (field === 'timing') {
      if (isValidManualTimeList(value)) {
        medicines[index].manual_time_labels = splitManualTimeLabels(value);
        medicines[index].timing = '';
        medicines[index].schedule_confirmed = true;
        medicines[index].schedule_ambiguous = false;
        medicines[index].as_needed = false;
        continue;
      }

      if (isSpecificTimeLabel(value) || isClockTime(value)) {
        medicines[index].manual_time_labels = [];
        medicines[index].timing = value;
        medicines[index].frequency = normalizeFrequencyText(value) || medicines[index].frequency;
        medicines[index].special_instructions = medicines[index].special_instructions || medicines[index].instructions;
        medicines[index].as_needed = false;
      }
      continue;
    }

    if (field === 'conflict') {
      if (isValidManualTimeList(value)) {
        medicines[index].manual_time_labels = splitManualTimeLabels(value);
        medicines[index].schedule_confirmed = true;
        medicines[index].schedule_ambiguous = false;
        medicines[index].conflicts = [];
        continue;
      }

      if (isSpecificTimeLabel(value) || isClockTime(value) || extractSchedulePattern(value).pattern || normalizeFrequencyText(value)) {
        medicines[index].manual_time_labels = [];
        medicines[index].timing = value;
        medicines[index].frequency = normalizeFrequencyText(value) || medicines[index].frequency;
        medicines[index].schedule_pattern = extractSchedulePattern(value).pattern || medicines[index].schedule_pattern;
        medicines[index].schedule_confirmed = true;
        medicines[index].schedule_ambiguous = false;
        medicines[index].conflicts = [];
      }
    }
  }

  return compilePrescriptionData(medicines, { userContext });
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
                'Read this prescription image and transcribe only the medicine-related text.',
                'Preserve medicine lines, schedule notation like 1-0-1, and durations like for 5 days.',
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
          'Preserve schedule notation like 1-0-0 or 1-0-1 in schedule_pattern.',
          'Extract duration_text exactly when visible, like 5 days or 3 months.',
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

    return normalizePrescriptionItems(result?.items, text);
  } catch {
    return normalizePrescriptionItems([], text);
  }
}

async function extractPrescriptionData(imageSource, options = {}) {
  try {
    const ocrText = await extractPrescriptionText(imageSource, options);
    const medicines = await parsePrescriptionText(ocrText, options);
    return compilePrescriptionData(medicines, {
      ocrText,
      userContext: options.userContext || {}
    }).medicines;
  } catch (error) {
    if (options.debug) {
      console.error('[ocr] extractPrescriptionData failed:', error?.message || error);
    }
    return [];
  }
}

async function extractMedicinesAndReminders(imageSource, options = {}) {
  try {
    const ocrText = await extractPrescriptionText(imageSource, options);
    const medicines = await parsePrescriptionText(ocrText, options);
    return compilePrescriptionData(medicines, {
      ocrText,
      userContext: options.userContext || {}
    });
  } catch (error) {
    if (options.debug) {
      console.error('[ocr] extractMedicinesAndReminders failed:', error?.message || error);
    }
    return {
      medicines: [],
      reminders: [],
      clarifications: []
    };
  }
}

async function extractPrescriptionDebug(imageSource, options = {}) {
  try {
    const ocrText = await extractPrescriptionText(imageSource, options);
    const medicines = await parsePrescriptionText(ocrText, options);
    const compiled = compilePrescriptionData(medicines, {
      ocrText,
      userContext: options.userContext || {}
    });

    return {
      success: true,
      ocrText,
      items: compiled.medicines,
      reminders: compiled.reminders,
      clarifications: compiled.clarifications,
      simpleItems: toSimplePrescriptionItems(compiled.medicines)
    };
  } catch (error) {
    return {
      success: false,
      ocrText: '',
      items: [],
      reminders: [],
      clarifications: [],
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
  buildReminderTemplatesFromPrescriptionItems,
  resolveReminderTemplates,
  buildClarifications,
  buildSetupQuestions,
  compilePrescriptionData,
  applyClarificationAnswers,
  normalizePrescriptionItems,
  toSimplePrescriptionItems,
  parseDurationDetails,
  extractSchedulePattern
};
