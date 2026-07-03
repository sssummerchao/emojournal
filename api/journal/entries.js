import { requireParticipant } from './_users.js';
import {
  QUESTIONS,
  getParticipantById,
  getPublicConfig,
  getStudyDayForDate,
  getStudyEndDate,
  getStudyProgress,
  getTodayIso,
  parseDate,
} from './_config.js';
import { getUserEntries, loadStore, upsertEntry } from './_storage.js';
import { sanitizeAnswers } from './_validate.js';

export default async function handler(req, res) {
  const userId = requireParticipant(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const store = await loadStore();
    const entries = getUserEntries(store, userId);
    const today = getTodayIso();
    const progress = getStudyProgress(today);
    const participant = getParticipantById(userId);

    const history = Object.entries(entries)
      .map(([date, entry]) => ({
        date,
        studyDay: getStudyDayForDate(date),
        answers: entry.answers,
        submittedAt: entry.submittedAt,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return res.status(200).json({
      userId,
      name: participant?.name || userId,
      config: getPublicConfig(),
      progress,
      today,
      todayEntry: entries[today] || null,
      history,
      questions: QUESTIONS,
    });
  }

  if (req.method === 'POST') {
    const { date, answers } = req.body || {};
    const entryDate = date || getTodayIso();
    const today = getTodayIso();

    if (parseDate(entryDate).getTime() > parseDate(today).getTime()) {
      return res.status(400).json({ error: 'You cannot submit an entry for a future date.' });
    }

    if (parseDate(entryDate).getTime() > parseDate(getStudyEndDate()).getTime()) {
      return res.status(400).json({ error: 'This date is after the study period.' });
    }

    const progress = getStudyProgress(today);
    if (progress.status === 'ended' && entryDate === today) {
      return res.status(400).json({ error: 'The study has ended.' });
    }

    const validation = sanitizeAnswers(answers, entryDate);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const saved = await upsertEntry(userId, entryDate, validation.answers);
    return res.status(200).json({
      ok: true,
      date: entryDate,
      entry: saved,
      progress: getStudyProgress(today),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
