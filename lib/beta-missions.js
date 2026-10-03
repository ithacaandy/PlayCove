export const MISSION_KEY = 'heading_out_group';

export function parseBetaAction(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.');
  const { action } = value;
  const payload = value.payload || {};
  if (typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid request.');
  if (!['welcome_next', 'welcome_back', 'welcome_skip', 'welcome_complete', 'welcome_import', 'start', 'defer', 'feedback'].includes(action)) throw new Error('Invalid action.');
  if (['welcome_next', 'welcome_back', 'welcome_import'].includes(action) && (!Number.isInteger(payload.step) || payload.step < 0 || payload.step > 4)) throw new Error('Invalid welcome step.');
  if (action === 'feedback') {
    if (!['easy', 'confusing', 'blocked'].includes(payload.rating) || typeof payload.message !== 'string' || payload.message.length > 2000) throw new Error('Check your feedback.');
    return { action, payload: { rating: payload.rating, message: payload.message.trim() } };
  }
  return { action, payload: ['welcome_next', 'welcome_back', 'welcome_import'].includes(action) ? { step: payload.step } : {} };
}

export function missionStatus(mission) {
  if (!mission) return 'Not assigned';
  if (mission.completedAt) return 'Completed';
  if (mission.deferredAt) return 'Saved for later';
  if (mission.outing && !mission.outing.cancelled && !mission.outing.ended) return 'Waiting for a group response';
  return mission.startedAt ? 'Started' : 'Assigned';
}

export async function betaRequest(action = 'status', payload = {}, signal) {
  const response = await fetch('/api/beta', {
    method: action === 'status' ? 'GET' : 'POST', cache: 'no-store',
    ...(action === 'status' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) }),
    signal: signal || AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Beta progress could not be saved.');
  return data;
}
