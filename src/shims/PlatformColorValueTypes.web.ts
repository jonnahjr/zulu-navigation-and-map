// Minimal shim for PlatformColorValueTypes on web
// Returns null for platform color objects so processColor falls back.
export function processColorObject(obj: any): null {
  return null;
}

export default { processColorObject };
