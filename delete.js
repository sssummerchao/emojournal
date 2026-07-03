import { getParticipantById } from './_config.js';
import { deleteEntry } from './_storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, date } = req.body || {};
  if (!userId || !date) {
    return res.status(400).json({ error: 'Participant and date are required.' });
  }

  if (!getParticipantById(userId)) {
    return res.status(400).json({ error: 'Invalid participant.' });
  }

  const deleted = await deleteEntry(userId, date);
  if (!deleted) {
    return res.status(404).json({ error: 'Entry not found.' });
  }

  return res.status(200).json({ ok: true, userId, date });
}
