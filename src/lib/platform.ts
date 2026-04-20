export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent ?? "";
  const platformStr = (navigator as Navigator & { platform?: string }).platform ?? "";
  return /Mac/i.test(agent) || /Mac/i.test(platformStr);
}
