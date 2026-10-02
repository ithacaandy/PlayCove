export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return '/';
  try {
    const parsed = new URL(value, 'https://playcove.invalid');
    if (parsed.origin !== 'https://playcove.invalid' || (parsed.pathname.startsWith('/auth') && parsed.pathname !== '/auth/update-password')) return '/';
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return '/'; }
}