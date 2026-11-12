/**
 * js/backup.js
 * Data serialization, export, and import subsystem for catalog_pdf_pwa.
 */

import { getConfig, getAllProducts, restoreDatabase } from './db.js';

/**
 * Triggers a browser download of the complete catalog database as a .json file.
 * Automatically timestamps the filename (e.g., catalog_backup_2026-11-11.json).
 * 
 * @returns {Promise<void>}
 */
export async function exportBackupFile() {
  const [config, products] = await Promise.all([
    getConfig(),
    getAllProducts()
  ]);

  const backupPayload = {
    app: 'catalog_pdf_pwa',
    version: 1,
    export_date: new Date().toISOString(),
    config,
    products
  };

  const jsonString = JSON.stringify(backupPayload);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);

  const dateSlug = new Date().toISOString().split('T')[0];
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `catalog_backup_${dateSlug}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Delay revocation so mobile download managers have time to read the Blob
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
}

/**
 * Parses and validates an uploaded backup file, restoring its data into IndexedDB.
 * 
 * @param {File} file - User-selected JSON file from file input.
 * @returns {Promise<void>}
 */
export function importBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.name.endsWith('.json')) {
      return reject(new Error('Debes seleccionar un archivo de respaldo válido con extensión .json.'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de respaldo desde el dispositivo.'));
    };

    reader.onload = async (event) => {
      try {
        const rawContent = event.target.result;
        const parsed = JSON.parse(rawContent);

        // Basic payload integrity check
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo no contiene un formato JSON válido.');
        }

        if (!Array.isArray(parsed.products)) {
          throw new Error('El archivo no contiene un listado de productos legible.');
        }

        // Restore into IndexedDB stores
        await restoreDatabase(parsed);
        resolve();
      } catch (err) {
        reject(new Error(`No se pudo restaurar el respaldo: ${err.message}`));
      }
    };

    reader.readAsText(file);
  });
}