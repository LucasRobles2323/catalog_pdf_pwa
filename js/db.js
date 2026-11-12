/**
 * js/db.js
 * IndexedDB persistence layer for catalog_pdf_pwa.
 * Handles database initialization, app configuration, and product CRUD.
 */

const DB_NAME = 'CatalogPdfDB';
const DB_VERSION = 1;

const STORES = {
  CONFIG: 'config',
  PRODUCTS: 'products'
};

const DEFAULT_CONFIG = {
  id: 'app_settings',
  catalog_title: 'Catálogo de Productos',
  catalog_subtitle: 'Colección Artesanal',
  columns: 3,
  ingredients_mode: 'inline',
  theme_preset: 'botanico',
  custom_placeholder: null,
  colors: {
    bg: '#f4f5f7',
    card_bg: '#ffffff',
    text: '#2d3748',
    accent: '#44683c'
  },
  banner: {
    active: false,
    badge: 'Aviso Especial',
    title: '¡Listos para regalar!',
    text: 'Todos nuestros artículos incluyen empaque individual artesanal.'
  }
};

let dbInstance = null;

/**
 * Opens or upgrades the IndexedDB instance (cached singleton).
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.CONFIG)) {
        db.createObjectStore(STORES.CONFIG, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('order', 'order', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };

    request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
  });
}

/**
 * Retrieves the global application configuration.
 * Automatically inserts DEFAULT_CONFIG if no settings exist yet.
 * @returns {Promise<Object>}
 */
export async function getConfig() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFIG], 'readonly');
    const store = transaction.objectStore(STORES.CONFIG);
    const request = store.get(DEFAULT_CONFIG.id);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        // First run only: write default settings
        const writeTx = db.transaction([STORES.CONFIG], 'readwrite');
        writeTx.objectStore(STORES.CONFIG).put(DEFAULT_CONFIG);
        writeTx.oncomplete = () => resolve(DEFAULT_CONFIG);
        writeTx.onerror = () => reject(writeTx.error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Updates application configuration values.
 * @param {Object} updatedConfig - Partial or full configuration object.
 * @returns {Promise<Object>}
 */
export async function saveConfig(updatedConfig) {
  const db = await openDatabase();
  const currentConfig = await getConfig();
  const merged = { ...currentConfig, ...updatedConfig, id: DEFAULT_CONFIG.id };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFIG], 'readwrite');
    const store = transaction.objectStore(STORES.CONFIG);
    const request = store.put(merged);

    request.onsuccess = () => resolve(merged);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all products ordered by their 'order' index ascending.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllProducts() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readonly');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const index = store.index('order');
    const request = index.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a product (creates if new, updates if ID exists).
 * @param {Object} product - Product record matching the schema.
 * @returns {Promise<Object>}
 */
export async function saveProduct(product) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const request = store.put(product);

    request.onsuccess = () => resolve(product);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a product by its ID.
 * @param {string} id - Product unique identifier.
 * @returns {Promise<void>}
 */
export async function deleteProduct(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Updates the 'order' property of products based on an ordered array of product IDs.
 * Avoids duplicating full base64 payloads in DOM attributes.
 * @param {Array<string>} orderedIds - Array of product IDs in their new sequence.
 * @returns {Promise<void>}
 */
export async function updateProductsOrder(orderedIds) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);

    orderedIds.forEach((id, index) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const product = getReq.result;
        if (product) {
          product.order = index;
          store.put(product);
        }
      };
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Replaces the entire database content (used during backup restoration).
 * @param {Object} backupData - Object containing { config, products }.
 * @returns {Promise<void>}
 */
export async function restoreDatabase(backupData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFIG, STORES.PRODUCTS], 'readwrite');
    const configStore = transaction.objectStore(STORES.CONFIG);
    const productsStore = transaction.objectStore(STORES.PRODUCTS);

    configStore.clear();
    productsStore.clear();

    if (backupData.config) {
      configStore.put({ ...DEFAULT_CONFIG, ...backupData.config, id: DEFAULT_CONFIG.id });
    }

    if (Array.isArray(backupData.products)) {
      backupData.products.forEach((product, index) => {
        if (typeof product.order !== 'number') {
          product.order = index;
        }
        productsStore.put(product);
      });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}