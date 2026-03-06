/**
 * FNV-1a hash for cookieless fingerprinting.
 * Fast, non-cryptographic, deterministic.
 */
export function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Generate a stable, cookieless browser fingerprint.
 * Combines non-PII browser properties to create a unique-ish identifier.
 * Does NOT use canvas/WebGL fingerprinting (privacy-invasive).
 */
export function generateFingerprint(): string {
  const components = [
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
    // Session-stable random to add entropy without cookies
    getSessionSeed(),
  ];

  return fnv1a(components.join('|'));
}

function getSessionSeed(): string {
  const key = '__pa_s';
  let seed = sessionStorage.getItem(key);
  if (!seed) {
    seed = Math.random().toString(36).substring(2, 10);
    try { sessionStorage.setItem(key, seed); } catch { /* private browsing */ }
  }
  return seed;
}
