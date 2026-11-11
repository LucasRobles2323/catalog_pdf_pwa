/**
 * js/theme.js
 * Visual theme, color palettes, and layout configuration manager for catalog_pdf_pwa.
 */

export const THEME_PRESETS = {
  botanico: {
    name: 'Botánico / Artesanal',
    colors: {
      bg: '#f4f5f7',
      card_bg: '#ffffff',
      text: '#2d3748',
      accent: '#44683c'
    }
  },
  lujo: {
    name: 'Minimalista / Lujo',
    colors: {
      bg: '#18181b',
      card_bg: '#27272a',
      text: '#f4f4f5',
      accent: '#d4af37'
    }
  },
  pastel: {
    name: 'Pastel / Suave',
    colors: {
      bg: '#faf5ff',
      card_bg: '#ffffff',
      text: '#4a3f44',
      accent: '#d98292'
    }
  },
  neutro: {
    name: 'Neutro / Moderno',
    colors: {
      bg: '#f8fafc',
      card_bg: '#ffffff',
      text: '#1e293b',
      accent: '#2563eb'
    }
  }
};

const DEFAULT_SVG_PLACEHOLDER = 'assets/default.svg';

/**
 * Applies layout and visual variables directly to the root CSS (:root).
 * 
 * @param {Object} config - Application settings object.
 */
export function applyTheme(config) {
  if (!config) return;

  const root = document.documentElement;

  // 1. Resolve colors based on preset or custom values
  let activeColors = config.colors;
  if (config.theme_preset !== 'custom' && THEME_PRESETS[config.theme_preset]) {
    activeColors = THEME_PRESETS[config.theme_preset].colors;
  }

  if (activeColors) {
    root.style.setProperty('--bg-color', activeColors.bg || '#f4f5f7');
    root.style.setProperty('--card-bg', activeColors.card_bg || '#ffffff');
    root.style.setProperty('--text-color', activeColors.text || '#2d3748');
    root.style.setProperty('--accent-color', activeColors.accent || '#44683c');
  }

  // 2. Set dynamic grid columns (2, 3 or 4)
  const columns = config.columns || 3;
  root.style.setProperty('--grid-columns', columns.toString());

  // 3. Update DOM header texts
  const titleEl = document.getElementById('view-catalog-title');
  const subtitleEl = document.getElementById('view-catalog-subtitle');

  if (titleEl && config.catalog_title) {
    titleEl.textContent = config.catalog_title;
  }
  if (subtitleEl) {
    const subText = config.catalog_subtitle ?? '';
    subtitleEl.textContent = subText;
    subtitleEl.classList.toggle('hidden', subText.length === 0);
  }

  // 4. Update banner state and contents
  const bannerEl = document.getElementById('view-catalog-banner');
  if (bannerEl && config.banner) {
    if (config.banner.active) {
      bannerEl.classList.remove('hidden');
      const badgeEl = document.getElementById('view-banner-badge');
      const bannerTitleEl = document.getElementById('view-banner-title');
      const bannerTextEl = document.getElementById('view-banner-text');

      if (badgeEl) badgeEl.textContent = config.banner.badge || 'Aviso';
      if (bannerTitleEl) bannerTitleEl.textContent = config.banner.title || '';
      if (bannerTextEl) bannerTextEl.textContent = config.banner.text || '';
    } else {
      bannerEl.classList.add('hidden');
    }
  }
}

/**
 * Resolves which placeholder image source to use when a product lacks an image.
 * Uses the custom uploaded image if available; falls back to default.svg.
 * 
 * @param {Object} config - Application settings object.
 * @returns {string} Image src string (DataURL or path).
 */
export function getPlaceholderImage(config) {
  if (config && config.custom_placeholder) {
    return config.custom_placeholder;
  }
  return DEFAULT_SVG_PLACEHOLDER;
}