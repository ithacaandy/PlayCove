export function feedbackPagePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  const path = value.split(/[?#]/)[0];
  return /^\/[A-Za-z0-9/_-]*$/.test(path) && path.length <= 200 ? path : '/';
}
export function parseFeedback(value) {
  if (!value || !['bug', 'idea', 'other'].includes(value.category)) throw new Error('Choose a feedback type.');
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  if (message.length < 10 || message.length > 2000) throw new Error('Please write between 10 and 2,000 characters.');
  return { category: value.category, message, page_path: feedbackPagePath(value.page_path) };
}

export function feedbackReturnPath(value) {
  const path = feedbackPagePath(value);
  return ['/feedback', '/invite', '/event-invite'].includes(path) ? '/' : path;
}
