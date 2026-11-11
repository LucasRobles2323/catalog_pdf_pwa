/**
 * js/rules.js
 * Business rules, live input masking, and string normalization for catalog_pdf_pwa.
 */

/**
 * Currency formatter instance for standard thousand-separator notation ($X.XXX).
 */
const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

/**
 * Cleans a raw numeric string and applies live currency masking ($X.XXX).
 * Intended for the `input` event on price input elements.
 * 
 * @param {string} rawValue - Raw value from input field.
 * @returns {string} Formatted string with currency prefix, or empty string.
 */
export function maskPriceInput(rawValue) {
  if (!rawValue) return '';

  // Strip all non-digit characters
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return '';

  const numericValue = parseInt(digits, 10);
  if (isNaN(numericValue) || numericValue === 0) return '';

  return currencyFormatter.format(numericValue);
}

/**
 * Extracts a pure positive integer from a masked price string or number.
 * 
 * @param {string|number} value - Masked price string (e.g., "$4.500") or integer.
 * @returns {number} Pure integer, or 0 if empty/invalid.
 */
export function parsePrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  if (!value || typeof value !== 'string') return 0;

  const digits = value.replace(/\D/g, '');
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

/**
 * Formats a stored integer price for display in catalog cards.
 * Returns null if the price is 0 or invalid (triggers "Sin precio" label in UI).
 * 
 * @param {number} price - Numeric price.
 * @returns {string|null} Formatted price ($4.500) or null.
 */
export function formatDisplayPrice(price) {
  const cleanPrice = parsePrice(price);
  if (cleanPrice <= 0) return null;
  return currencyFormatter.format(cleanPrice);
}

/**
 * Sanitizes generic single-line text (names, titles, formats).
 * Capitalizes the first letter and trims redundant spaces.
 * 
 * @param {string} str - Raw string.
 * @returns {string} Sanitized string.
 */
export function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  const clean = str.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Normalizes multi-line descriptions.
 * Trims excess whitespace but retains natural paragraph breaks.
 * 
 * @param {string} str - Raw description.
 * @returns {string} Clean multi-line string.
 */
export function sanitizeDescription(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter((line, index, arr) => line.length > 0 || (index > 0 && arr[index - 1].length > 0))
    .join('\n')
    .trim();
}

/**
 * Intelligently cleans and normalizes an ingredient or component string.
 * 
 * Features:
 * - Fixes abbreviations missing space after dot (e.g., "vit.E" -> "vit. E").
 * - Splits by commas, semicolons, hyphens, or newlines.
 * - Trims redundant internal whitespace.
 * - Capitalizes each ingredient element.
 * - Reassembles into standard comma-separated format.
 * 
 * @param {string} rawIngredients - Unprocessed ingredient string.
 * @returns {string} Canonical comma-separated string (e.g., "Avena, Miel, Vit. E").
 */
export function normalizeIngredients(rawIngredients) {
  if (!rawIngredients || typeof rawIngredients !== 'string') return '';

  return rawIngredients
    // 1. Fix dots stuck to letters in abbreviations (e.g., "vit.E" -> "vit. E")
    .replace(/\.([a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '. $1')
    // 2. Replace bullet hyphens (at start of line or surrounded by spaces) with commas
    .replace(/(?:^|\s+)-\s+/gm, ', ')
    // 3. Split by commas, semicolons, bullets, or line breaks
    .split(/[,;\n\r•]+/)
    .map(item => {
      const clean = item.replace(/\s+/g, ' ').trim();
      if (!clean) return null;
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Splits normalized ingredients into an array of strings (for dropdown/details mode).
 * 
 * @param {string} ingredientsString - Comma-separated ingredients.
 * @returns {Array<string>} List of individual ingredients.
 */
export function splitIngredientsList(ingredientsString) {
  if (!ingredientsString) return [];
  return ingredientsString
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);
}