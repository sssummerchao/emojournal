import {
  QUESTIONS,
  PARTICIPANTS,
  getStudyDayForDate,
  formatAnswerForDisplay,
} from './_config.js';
import { getAllEntries } from './_storage.js';

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(allEntries) {
  const headers = [
    'participant_id',
    'participant_name',
    'date',
    'study_day',
    'submitted_at',
    ...QUESTIONS.map((q) => q.id),
  ];

  const lines = [headers.join(',')];

  for (const p of PARTICIPANTS) {
    const userEntries = allEntries[p.id] || {};
    const dates = Object.keys(userEntries).sort();

    for (const date of dates) {
      const entry = userEntries[date];
      const answers = entry.answers || {};
      const row = [
        p.id,
        p.name,
        date,
        getStudyDayForDate(date) ?? '',
        entry.submittedAt || '',
        ...QUESTIONS.map((q) => formatAnswerForDisplay(q, answers[q.id], answers)),
      ];
      lines.push(row.map(csvEscape).join(','));
    }
  }

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const allEntries = await getAllEntries();
  const csv = buildCsv(allEntries);
  const filename = `journal-export-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}
