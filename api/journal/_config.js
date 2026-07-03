/**
 * Journal study configuration.
 * Edit QUESTIONS here, or override study dates via env vars on Vercel.
 */

export const STUDY_DURATION_DAYS = parseInt(process.env.JOURNAL_STUDY_DAYS || '32', 10);

/** Study period: Jul 7 – Aug 7, 2026 (inclusive). */
export const STUDY_START_DATE =
  process.env.JOURNAL_STUDY_START_DATE || '2026-07-07';

/**
 * Daily questions — same every day.
 * Types: text, textarea, yesno, select, multiselect
 * showWhen: { questionId, value } — only shown when another answer matches
 */
export const QUESTIONS = [
  {
    id: 'device_used',
    label: 'Did you use the device today?',
    type: 'yesno',
    skipRestWhen: 'no',
  },
  {
    id: 'send_count',
    label: 'If you use the device, roughly how many times did you use to send emotion?',
    type: 'text',
    placeholder: 'e.g. 3',
    showWhen: { questionId: 'device_used', value: 'yes' },
  },
  {
    id: 'send_reason',
    label: 'What is the reason to send emotion?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'genuine_feeling', label: 'I wanted to share how I was genuinely feeling' },
      { value: 'care_support', label: 'I wanted to show care or support for my partner' },
      { value: 'home_present', label: 'I wanted to signal that I was home / present' },
      { value: 'habit', label: 'Out of habit or routine' },
      { value: 'other', label: 'Other (brief description)', hasText: true },
    ],
  },
  {
    id: 'after_action',
    label: 'What did you do after sending or receiving an emotion today? (Select all that apply)',
    type: 'multiselect',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'text_partner', label: 'Text your partner' },
      { value: 'phone_video', label: 'Made a phone or video call' },
      { value: 'see_in_person', label: 'Went to see my partner in person' },
      {
        value: 'changed_activity',
        label: 'Changed what I was doing (e.g., paused work, took a break, checked in mentally)',
      },
      { value: 'ignored', label: 'Ignored it / did nothing differently' },
      { value: 'think_of_person', label: 'Think of the person' },
      { value: 'other', label: 'Other (please describe briefly)', hasText: true },
    ],
  },
  {
    id: 'connected_emotion',
    label: 'Which emotion state made you feel more emotionally connected to your partner?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
      { value: 'no_difference', label: 'No difference' },
    ],
  },
  {
    id: 'changed_behavior_emotion',
    label: 'Which emotion state led you to change what you were doing and do something else instead?',
    type: 'select',
    showWhen: { questionId: 'device_used', value: 'yes' },
    options: [
      { value: 'positive', label: 'Positive' },
      { value: 'negative', label: 'Negative' },
      { value: 'no_difference', label: 'No difference' },
    ],
  },
  {
    id: 'stood_out',
    label:
      'Is there any moment of using the device that stood out to you today? Or did anything unusual happen? Please describe.',
    type: 'textarea',
    showWhen: { questionId: 'device_used', value: 'yes' },
    placeholder: 'Describe what stood out or anything unusual that happened.',
  },
];

function participant(id, name) {
  return { id, name };
}

/** Four participants — each has their own URL (p1.html … p4.html). */
export const PARTICIPANTS = [
  participant('p1', 'Participant 1'),
  participant('p2', 'Participant 2'),
  participant('p3', 'Participant 3'),
  participant('p4', 'Participant 4'),
];

export function getParticipantById(id) {
  return PARTICIPANTS.find((p) => p.id === id) || null;
}

export function isQuestionVisible(q, answers) {
  if (!q.showWhen) return true;
  const parent = answers?.[q.showWhen.questionId];
  return parent === q.showWhen.value;
}

export function shouldSkipRest(answers) {
  const gate = QUESTIONS.find((q) => q.skipRestWhen);
  if (!gate) return false;
  return answers?.[gate.id] === gate.skipRestWhen;
}

export function getOptionLabel(q, value) {
  const opt = q.options?.find((o) => o.value === value);
  return opt?.label || value;
}

export function formatAnswerForDisplay(q, value, answers = {}) {
  if (value == null || String(value).trim() === '') return '';

  if (q.type === 'yesno') {
    return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;
  }

  if (q.type === 'select') {
    if (value === 'other') {
      const other = answers[`${q.id}_other`] || '';
      return other ? `Other: ${other}` : 'Other';
    }
    return getOptionLabel(q, value);
  }

  if (q.type === 'multiselect') {
    let selected = [];
    try {
      selected = JSON.parse(value);
    } catch {
      selected = String(value).split(',').filter(Boolean);
    }
    if (!Array.isArray(selected) || !selected.length) return '';
    return selected
      .map((v) => {
        if (v === 'other') {
          const other = answers[`${q.id}_other`] || '';
          return other ? `Other: ${other}` : 'Other';
        }
        return getOptionLabel(q, v);
      })
      .join('; ');
  }

  return String(value);
}

export function getStudyEndDate() {
  const start = parseDate(STUDY_START_DATE);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + STUDY_DURATION_DAYS - 1);
  return formatDate(end);
}

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getStudyDayForDate(isoDate) {
  const start = parseDate(STUDY_START_DATE);
  const current = parseDate(isoDate);
  const diffMs = current.getTime() - start.getTime();
  const day = Math.floor(diffMs / 86400000) + 1;
  if (day < 1 || day > STUDY_DURATION_DAYS) return null;
  return day;
}

export function formatDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

export function getStudyTimeZone() {
  return process.env.JOURNAL_TIMEZONE || 'America/New_York';
}

export function getTodayIso() {
  return formatDateInTimeZone(new Date(), getStudyTimeZone());
}

export function getStudyProgress(isoDate = getTodayIso()) {
  const endDate = getStudyEndDate();
  const day = getStudyDayForDate(isoDate);
  const start = parseDate(STUDY_START_DATE);
  const end = parseDate(endDate);
  const today = parseDate(isoDate);

  let daysRemaining = 0;
  if (today.getTime() <= end.getTime()) {
    daysRemaining = Math.floor((end.getTime() - today.getTime()) / 86400000) + 1;
  }

  let status = 'active';
  if (today.getTime() < start.getTime()) status = 'not_started';
  else if (today.getTime() > end.getTime()) status = 'ended';

  return {
    studyStartDate: STUDY_START_DATE,
    studyEndDate: endDate,
    studyDurationDays: STUDY_DURATION_DAYS,
    today: isoDate,
    currentDay: day,
    daysRemaining,
    status,
  };
}

export function getPublicConfig() {
  return {
    questions: QUESTIONS,
    studyStartDate: STUDY_START_DATE,
    studyEndDate: getStudyEndDate(),
    studyDurationDays: STUDY_DURATION_DAYS,
    participants: PARTICIPANTS.map((p) => ({ id: p.id, name: p.name })),
  };
}

/** All answer keys stored in the database (including _other fields). */
export function getAllAnswerKeys() {
  const keys = [];
  for (const q of QUESTIONS) {
    keys.push(q.id);
    if (q.type === 'select' && q.options?.some((o) => o.hasText)) {
      keys.push(`${q.id}_other`);
    }
    if (q.type === 'multiselect' && q.options?.some((o) => o.hasText)) {
      keys.push(`${q.id}_other`);
    }
  }
  return keys;
}
