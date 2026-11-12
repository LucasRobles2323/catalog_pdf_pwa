/**
 * js/image-helper.js
 * Low-RAM client-side image processing pipeline for catalog_pdf_pwa.
 * Uses ObjectURLs and explicit canvas memory release for 1GB-2GB RAM devices.
 */

const MAX_DIMENSION = 750; // Optimal resolution for A4 2-4 column print with 44% less RAM usage
const JPEG_QUALITY = 0.80; // Balanced compression (~70-130 KB per photo)

/**
 * Validates whether a file object is a supported image MIME type.
 * @param {File} file - File object from file input.
 * @returns {boolean}
 */
export function isValidImageFile(file) {
  if (!file || !(file instanceof File)) return false;
  return file.type.startsWith('image/');
}

/**
 * Processes an image File into an optimized 1:1 square JPEG DataURL with minimal RAM footprint.
 * 
 * @param {File} file - Image file from file input.
 * @param {number} [maxSize=MAX_DIMENSION] - Target box limit.
 * @param {number} [quality=JPEG_QUALITY] - Output JPEG quality (0.0 - 1.0).
 * @returns {Promise<string>} Resolves with base64 DataURL ('data:image/jpeg;base64,...').
 */
export function processImageFile(file, maxSize = MAX_DIMENSION, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    if (!isValidImageFile(file)) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    // Use a lightweight blob pointer instead of loading a huge base64 string into RAM
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al decodificar la imagen seleccionada.'));
    };

    img.onload = () => {
      try {
        const optimizedDataUrl = cropAndCompressImage(img, maxSize, quality);
        resolve(optimizedDataUrl);
      } catch (err) {
        reject(new Error(`Fallo en el procesamiento de imagen: ${err.message}`));
      } finally {
        // Immediately free raw image memory from mobile RAM
        URL.revokeObjectURL(objectUrl);
        img.src = '';
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Executes the 1:1 crop calculation, renders to Canvas, and immediately releases GPU/RAM buffer.
 */
function cropAndCompressImage(img, targetBoxSize, quality) {
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  if (naturalWidth === 0 || naturalHeight === 0) {
    throw new Error('Dimensiones de imagen inválidas.');
  }

  const minSide = Math.min(naturalWidth, naturalHeight);
  const cropX = (naturalWidth - minSide) / 2;
  const cropY = (naturalHeight - minSide) / 2;
  const finalDimension = Math.min(minSide, targetBoxSize);

  const canvas = document.createElement('canvas');
  canvas.width = finalDimension;
  canvas.height = finalDimension;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D de Canvas.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalDimension, finalDimension);

  ctx.drawImage(
    img,
    cropX, cropY, minSide, minSide,
    0, 0, finalDimension, finalDimension
  );

  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  // Force immediate release of offscreen canvas bitmap memory on low-RAM phones
  ctx.clearRect(0, 0, finalDimension, finalDimension);
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}