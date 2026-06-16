function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function filterOptionsByMatchQuality(options: string[], value: string): string[] {
  if (!value) return options;

  const normalizedValue = value.toLowerCase();
  const exact: string[] = [];
  const startsWith: string[] = [];
  const wordBoundary: string[] = [];
  const includes: string[] = [];
  const wordRe = new RegExp(`\\b${escapeRegExp(normalizedValue)}`, "i");

  for (const option of options) {
    const optionLower = option.toLowerCase();
    if (optionLower === normalizedValue) exact.push(option);
    else if (optionLower.startsWith(normalizedValue)) startsWith.push(option);
    else if (wordRe.test(option)) wordBoundary.push(option);
    else if (optionLower.includes(normalizedValue)) includes.push(option);
  }

  return [...exact, ...startsWith, ...wordBoundary, ...includes];
}
