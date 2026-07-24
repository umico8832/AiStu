export function selectDevelopmentRendererUrl(
  isPackaged: boolean,
  rawUrl: string | undefined,
): string | null {
  if (isPackaged) {
    return null;
  }
  return rawUrl?.trim() || null;
}
