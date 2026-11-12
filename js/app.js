/**
 * js/app.js
 * Main controller and event orchestrator for catalog_pdf_pwa.
 */

import { 
  getConfig, 
  saveConfig, 
  getAllProducts, 
  saveProduct, 
  deleteProduct 
} from './db.js';

import { 
  maskPriceInput, 
  parsePrice, 
  formatDisplayPrice, 
  sanitizeText, 
  sanitizeDescription, 
  normalizeIngredients, 
  splitIngredientsList 
} from './rules.js';

import { processImageFile } from './image-helper.js';
import { THEME_PRESETS, applyTheme, getPlaceholderImage } from './theme.js';
import { initDragAndDrop } from './drag-drop.js';
import { exportBackupFile, importBackupFile } from './backup.js';

// Global runtime cache
let currentConfig = null;
let currentProducts = [];

/**
 * Escapes special characters to prevent broken HTML attributes on render.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================================
   DOM ELEMENTS CACHE
   ========================================================================== */
const catalogGrid = document.getElementById('catalog-grid');

// Modals
const modalProduct = document.getElementById('modal-product');
const modalSettings = document.getElementById('modal-settings');
const modalBackup = document.getElementById('modal-backup');

// Product Form Controls
const formProduct = document.getElementById('form-product');
const prodIdInput = document.getElementById('prod-id');
const prodNameInput = document.getElementById('prod-name');
const prodFormatInput = document.getElementById('prod-format');
const prodPriceInput = document.getElementById('prod-price');
const prodStockInput = document.getElementById('prod-stock');
const prodDescInput = document.getElementById('prod-desc');
const prodIngredientsInput = document.getElementById('prod-ingredients');
const prodImageInput = document.getElementById('prod-image-input');
const prodImagePreview = document.getElementById('prod-image-preview');
const btnTriggerFile = document.getElementById('btn-trigger-file');
const modalProductTitle = document.getElementById('modal-product-title');
const quickTagsContainer = document.getElementById('quick-tags-container');

// Settings Form Controls
const formSettings = document.getElementById('form-settings');
const settingTitle = document.getElementById('setting-title');
const settingSubtitle = document.getElementById('setting-subtitle');
const settingBannerActive = document.getElementById('setting-banner-active');
const settingBannerBadge = document.getElementById('setting-banner-badge');
const settingBannerTitle = document.getElementById('setting-banner-title');
const settingBannerText = document.getElementById('setting-banner-text');
const settingColumns = document.getElementById('setting-columns');
const settingIngredientsMode = document.getElementById('setting-ingredients-mode');
const settingThemePreset = document.getElementById('setting-theme-preset');
const colorBg = document.getElementById('color-bg');
const colorCard = document.getElementById('color-card');
const colorText = document.getElementById('color-text');
const colorAccent = document.getElementById('color-accent');
const settingPlaceholderInput = document.getElementById('setting-placeholder-input');
const settingPlaceholderPreview = document.getElementById('setting-placeholder-preview');
const btnTriggerPlaceholder = document.getElementById('btn-trigger-placeholder');
const btnResetPlaceholder = document.getElementById('btn-reset-placeholder');

// Top Action Buttons
const btnNewProduct = document.getElementById('btn-new-product');
const btnSettings = document.getElementById('btn-settings');
const btnBackup = document.getElementById('btn-backup');
const btnPrintPdf = document.getElementById('btn-print-pdf');

// Backup Buttons
const btnExportJson = document.getElementById('btn-export-json');
const inputImportJson = document.getElementById('input-import-json');
const btnTriggerImport = document.getElementById('btn-trigger-import');

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentConfig = await getConfig();
    currentProducts = await getAllProducts();

    applyTheme(currentConfig);
    renderCatalog();

    initDragAndDrop(catalogGrid, () => {
      // Sync in-memory array order with DOM without re-reading all base64 images from IndexedDB
      const orderedIds = Array.from(catalogGrid.querySelectorAll('.product-card')).map(el => el.dataset.id);
      currentProducts.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
    });

    bindEvents();
    registerServiceWorker();
  } catch (err) {
    console.error('Initialization error:', err);
    alert('Error al cargar los datos locales: ' + err.message);
  }
});

/* ==========================================================================
   CATALOG RENDERING
   ========================================================================== */
function renderCatalog() {
  catalogGrid.innerHTML = '';

  if (currentProducts.length === 0) {
    catalogGrid.innerHTML = `
      <div class="empty-state">
        <p>Tu catálogo está vacío.</p>
        <p>Presiona <strong>"+ Nuevo Producto"</strong> para comenzar a crearlo.</p>
      </div>
    `;
    return;
  }

  const fallbackPlaceholder = getPlaceholderImage(currentConfig);
  const isDetailsMode = currentConfig.ingredients_mode === 'details';
  const fragment = document.createDocumentFragment();

  currentProducts.forEach((product) => {
    const card = document.createElement('article');
    card.className = `product-card ${!product.in_stock ? 'product-card--out-of-stock' : ''}`;
    card.dataset.id = product.id;
    card.draggable = true;

    const formattedPrice = formatDisplayPrice(product.price);
    const imageSrc = product.image || fallbackPlaceholder;
    const safeName = escapeHtml(product.name);
    const safeFormat = escapeHtml(product.format);
    const safeDesc = escapeHtml(product.description);

    // Ingredients rendering according to configured mode
    let ingredientsHtml = '';
    if (product.ingredients) {
      if (isDetailsMode) {
        const listItems = splitIngredientsList(product.ingredients)
          .map(item => `<li>${escapeHtml(item)}</li>`)
          .join('');
        ingredientsHtml = `
          <details class="card__ingredients-dropdown">
            <summary>Ver componentes</summary>
            <ul>${listItems}</ul>
          </details>
        `;
      } else {
        ingredientsHtml = `<p class="card__ingredients">${escapeHtml(product.ingredients)}</p>`;
      }
    }

    card.innerHTML = `
      <div class="card__media">
        <img src="${imageSrc}" alt="${safeName}" loading="lazy" decoding="async" class="card__image">
        ${!product.in_stock ? '<span class="badge badge--danger">Agotado</span>' : ''}
        
        <div class="card__reorder-tools no-print">
          <button type="button" class="btn-tool" data-move="up" title="Mover arriba">▲</button>
          <button type="button" class="btn-tool drag-handle" title="Arrastrar">⠿</button>
          <button type="button" class="btn-tool" data-move="down" title="Mover abajo">▼</button>
        </div>
      </div>

      <div class="card__body">
        <div class="card__header-row">
          <h2 class="card__title">${safeName}</h2>
          ${safeFormat ? `<span class="card__format">${safeFormat}</span>` : ''}
        </div>

        <div class="card__price-row">
          ${formattedPrice 
            ? `<span class="card__price">${formattedPrice}</span>` 
            : '<span class="card__price card__price--empty">Sin precio</span>'}
        </div>

        ${safeDesc ? `<p class="card__description">${safeDesc}</p>` : ''}
        ${ingredientsHtml}
      </div>

      <footer class="card__footer no-print">
        <button type="button" class="btn btn--small btn--secondary" data-action="edit" data-id="${product.id}">
          Editar
        </button>
        <button type="button" class="btn btn--small btn--secondary" data-action="clone" data-id="${product.id}">
          Duplicar
        </button>
        <button type="button" class="btn btn--small btn--danger" data-action="delete" data-id="${product.id}">
          Eliminar
        </button>
      </footer>
    `;

    fragment.appendChild(card);
  });
  catalogGrid.appendChild(fragment);
}

/* ==========================================================================
   EVENT LISTENERS & BINDINGS
   ========================================================================== */
function bindEvents() {
  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.dataset.closeModal;
      const targetModal = document.getElementById(modalId);
      if (targetModal && typeof targetModal.close === 'function') {
        targetModal.close();
      }
    });
  });

  btnNewProduct.addEventListener('click', () => {
    resetProductForm();
    modalProductTitle.textContent = 'Nuevo Producto';
    modalProduct.showModal();
  });

  btnSettings.addEventListener('click', () => {
    populateSettingsForm();
    modalSettings.showModal();
  });

  btnBackup.addEventListener('click', () => {
    modalBackup.showModal();
  });

  btnPrintPdf.addEventListener('click', () => {
    document.querySelectorAll('.card__ingredients-dropdown').forEach(d => d.setAttribute('open', ''));
    document.querySelectorAll('.card__image').forEach(img => img.removeAttribute('loading'));
    // Wait one frame so low-RAM mobile browsers decode all images before opening PDF preview
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 60);
    });
  });

  prodPriceInput.addEventListener('input', (event) => {
    event.target.value = maskPriceInput(event.target.value);
  });

  btnTriggerFile.addEventListener('click', () => prodImageInput.click());

  prodImageInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const croppedBase64 = await processImageFile(file);
      prodImagePreview.src = croppedBase64;
      prodImagePreview.dataset.hasCustomImage = 'true';
    } catch (err) {
      alert(err.message);
      prodImageInput.value = '';
    }
  });

  quickTagsContainer.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-ingredient]');
    if (!chip) return;

    const added = chip.dataset.ingredient;
    const currentText = prodIngredientsInput.value.trim();

    if (!currentText) {
      prodIngredientsInput.value = added;
    } else {
      prodIngredientsInput.value = `${currentText}, ${added}`;
    }
  });

  formProduct.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = sanitizeText(prodNameInput.value);
    if (!name) {
      alert('Debes ingresar al menos el nombre del producto.');
      return;
    }

    const id = prodIdInput.value || `prod_${Date.now()}`;
    const rawPrice = parsePrice(prodPriceInput.value);
    const existingIndex = currentProducts.findIndex(p => p.id === id);
    const order = existingIndex >= 0 ? currentProducts[existingIndex].order : currentProducts.length;
    const hasCustomImage = prodImagePreview.dataset.hasCustomImage === 'true';

    const payload = {
      id,
      order,
      name,
      format: sanitizeText(prodFormatInput.value),
      price: rawPrice,
      in_stock: prodStockInput.checked,
      description: sanitizeDescription(prodDescInput.value),
      ingredients: normalizeIngredients(prodIngredientsInput.value),
      image: hasCustomImage && prodImagePreview.src.startsWith('data:image') ? prodImagePreview.src : null
    };

    await saveProduct(payload);
    if (existingIndex >= 0) {
      currentProducts[existingIndex] = payload;
    } else {
      currentProducts.push(payload);
    }
    renderCatalog();
    modalProduct.close();
  });

  catalogGrid.addEventListener('click', async (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const prodId = actionBtn.dataset.id;
    const targetProduct = currentProducts.find(p => p.id === prodId);
    if (!targetProduct) return;

    if (action === 'edit') {
      loadProductIntoForm(targetProduct);
      modalProductTitle.textContent = 'Editar Producto';
      modalProduct.showModal();
    } else if (action === 'clone') {
      const cloned = {
        ...targetProduct,
        id: `prod_${Date.now()}`,
        name: `${targetProduct.name} (Copia)`,
        order: currentProducts.length
      };
      await saveProduct(cloned);
      currentProducts.push(cloned);
      renderCatalog();
    } else if (action === 'delete') {
      const confirmDelete = confirm(`¿Estás seguro de eliminar "${targetProduct.name}"?`);
      if (confirmDelete) {
        await deleteProduct(prodId);
        currentProducts = currentProducts.filter(p => p.id !== prodId);
        renderCatalog();
      }
    }
  });

  // Sync theme preset selector with color pickers
  settingThemePreset.addEventListener('change', () => {
    const presetKey = settingThemePreset.value;
    if (presetKey !== 'custom' && THEME_PRESETS[presetKey]) {
      const c = THEME_PRESETS[presetKey].colors;
      colorBg.value = c.bg;
      colorCard.value = c.card_bg;
      colorText.value = c.text;
      colorAccent.value = c.accent;
    }
  });

  [colorBg, colorCard, colorText, colorAccent].forEach((picker) => {
    picker.addEventListener('input', () => {
      settingThemePreset.value = 'custom';
    });
  });

  btnTriggerPlaceholder.addEventListener('click', () => settingPlaceholderInput.click());

  settingPlaceholderInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const base64 = await processImageFile(file);
      settingPlaceholderPreview.src = base64;
    } catch (err) {
      alert(err.message);
    }
  });

  btnResetPlaceholder.addEventListener('click', () => {
    settingPlaceholderInput.value = '';
    settingPlaceholderPreview.src = 'assets/default.svg';
  });

  formSettings.addEventListener('submit', async (event) => {
    event.preventDefault();

    const placeholderSrc = settingPlaceholderPreview.src;
    const customPlaceholder = placeholderSrc.startsWith('data:image') ? placeholderSrc : null;

    const updatedConfig = {
      ...currentConfig,
      catalog_title: sanitizeText(settingTitle.value) || 'Catálogo de Productos',
      catalog_subtitle: sanitizeText(settingSubtitle.value),
      columns: parseInt(settingColumns.value, 10) || 3,
      ingredients_mode: settingIngredientsMode.value,
      theme_preset: settingThemePreset.value,
      custom_placeholder: customPlaceholder,
      colors: {
        bg: colorBg.value,
        card_bg: colorCard.value,
        text: colorText.value,
        accent: colorAccent.value
      },
      banner: {
        active: settingBannerActive ? settingBannerActive.checked : false,
        badge: settingBannerBadge ? sanitizeText(settingBannerBadge.value) || 'Aviso' : 'Aviso',
        title: settingBannerTitle ? sanitizeText(settingBannerTitle.value) : '',
        text: settingBannerText ? sanitizeText(settingBannerText.value) : ''
      }
    };

    currentConfig = await saveConfig(updatedConfig);
    applyTheme(currentConfig);
    renderCatalog();
    modalSettings.close();
  });

  btnExportJson.addEventListener('click', async () => {
    await exportBackupFile();
  });

  btnTriggerImport.addEventListener('click', () => inputImportJson.click());

  inputImportJson.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const confirmed = confirm('Restaurar este respaldo reemplazará los productos actuales. ¿Deseas continuar?');
    if (!confirmed) {
      inputImportJson.value = '';
      return;
    }

    try {
      await importBackupFile(file);
      currentConfig = await getConfig();
      currentProducts = await getAllProducts();
      applyTheme(currentConfig);
      renderCatalog();
      modalBackup.close();
      alert('¡Catálogo restaurado exitosamente!');
    } catch (err) {
      alert(err.message);
    } finally {
      inputImportJson.value = '';
    }
  });

  // Ensure all <details> dropdowns open automatically when exporting to PDF
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.card__ingredients-dropdown').forEach(d => d.setAttribute('open', ''));
    document.querySelectorAll('.card__image').forEach(img => img.removeAttribute('loading'));
  });

  modalProduct.addEventListener('close', () => {
    prodImagePreview.src = 'assets/default.svg';
    prodImagePreview.dataset.hasCustomImage = 'false';
  });
}

/* ==========================================================================
   FORM HELPERS
   ========================================================================== */
function resetProductForm() {
  formProduct.reset();
  prodIdInput.value = '';
  prodStockInput.checked = true;
  prodImagePreview.src = getPlaceholderImage(currentConfig);
  prodImagePreview.dataset.hasCustomImage = 'false';
  prodImageInput.value = '';
}

function loadProductIntoForm(product) {
  resetProductForm();
  prodIdInput.value = product.id;
  prodNameInput.value = product.name || '';
  prodFormatInput.value = product.format || '';
  prodPriceInput.value = product.price ? maskPriceInput(product.price.toString()) : '';
  prodStockInput.checked = product.in_stock !== false;
  prodDescInput.value = product.description || '';
  prodIngredientsInput.value = product.ingredients || '';
  prodImagePreview.src = product.image || getPlaceholderImage(currentConfig);
  prodImagePreview.dataset.hasCustomImage = product.image ? 'true' : 'false';
}

function populateSettingsForm() {
  settingPlaceholderInput.value = '';
  settingTitle.value = currentConfig.catalog_title || '';
  settingSubtitle.value = currentConfig.catalog_subtitle || '';
  settingColumns.value = currentConfig.columns || 3;
  settingIngredientsMode.value = currentConfig.ingredients_mode || 'inline';
  settingThemePreset.value = currentConfig.theme_preset || 'botanico';

  if (currentConfig.colors) {
    colorBg.value = currentConfig.colors.bg || '#f4f5f7';
    colorCard.value = currentConfig.colors.card_bg || '#ffffff';
    colorText.value = currentConfig.colors.text || '#2d3748';
    colorAccent.value = currentConfig.colors.accent || '#44683c';
  }

  if (currentConfig.banner && settingBannerActive) {
    settingBannerActive.checked = Boolean(currentConfig.banner.active);
    settingBannerBadge.value = currentConfig.banner.badge || '';
    settingBannerTitle.value = currentConfig.banner.title || '';
    settingBannerText.value = currentConfig.banner.text || '';
  }

  settingPlaceholderPreview.src = getPlaceholderImage(currentConfig);
}

/* ==========================================================================
   SERVICE WORKER REGISTRATION (OFFLINE SUPPORT)
   ========================================================================== */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('ServiceWorker registered with scope:', reg.scope))
        .catch(err => console.warn('ServiceWorker registration failed:', err));
    });
  }
}