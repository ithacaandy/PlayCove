export function parseKidAges(input) {
  if (!input.trim()) return [];
  const parts = input.split(',').map((part) => part.trim());
  if (parts.some((part) => !/^\d+$/.test(part) || Number(part) > 18)) {
    throw new Error('Enter kid ages as whole numbers from 0 to 18, separated by commas.');
  }
  return parts.map(Number);
}
