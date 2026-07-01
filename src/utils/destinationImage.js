// Keyless, CORS-friendly destination image helper.
//
// The app previously relied on `source.unsplash.com`, which Unsplash shut down
// in 2024, leaving broken images. Keyword services like LoremFlickr are
// unreliable and return nothing for arbitrary phrases (e.g. venue names), so
// images still failed to load. Picsum always serves a real photo for any seed,
// loads fast and works cross-origin, which guarantees the feed never breaks.

function hashSeed(value) {
  const text = String(value || "travel");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

/**
 * Build a stable, always-loadable destination image URL.
 * @param {string} keywords - Free text like "Jaipur beach travel".
 * @param {{ width?: number, height?: number, seed?: string|number }} [options]
 * @returns {string} A working image URL suitable for an <img> src.
 */
export function destinationImageUrl(keywords, options = {}) {
  const { width = 1600, height = 900, seed } = options;
  const basis = seed != null ? seed : keywords;
  const stableSeed = hashSeed(basis);
  return `https://picsum.photos/seed/${stableSeed}/${width}/${height}`;
}

/**
 * Deterministic guaranteed-load fallback for <img @error> handlers when a
 * primary photo URL (e.g. Google Places) fails to load.
 * @param {string} keywords
 * @param {number} [width]
 * @param {number} [height]
 * @returns {string}
 */
export function fallbackImageUrl(keywords, width = 1200, height = 900) {
  return destinationImageUrl(keywords, { width, height });
}
