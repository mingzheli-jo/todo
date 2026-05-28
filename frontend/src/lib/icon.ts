export function safeIcon(icon: string | null | undefined, fallback = "📁"): string {
  if (!icon) return fallback;
  if (icon.length > 4) return fallback;
  return icon;
}
