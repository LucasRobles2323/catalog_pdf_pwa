/**
 * js/image-helper.js
 * Client-side image processing pipeline for catalog_pdf_pwa.
 * Handles automatic 1:1 center-cropping and JPEG compression via HTML5 Canvas.
 */

const MAX_DIMENSION = 1000; // Maximum width/height in pixels
const JPEG_QUALITY = 0.82;   // Compression ratio balancing sharpness and memory weight

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
 * Reads a File object and processes it into an optimized 1:1 square JPEG DataURL.
 * 
 * Process steps:
 * 1. Reads File via FileReader into an Image element.
 * 2. Computes center-crop coordinates to enforce 1:1 aspect ratio without distortion.
 * 3. Scales down to MAX_DIMENSION (1000x1000 px max) if original resolution is larger.
 * 4. Renders to offscreen Canvas and exports as image/jpeg at 82% quality.
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

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo de imagen desde el dispositivo.'));
    };

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Error al decodificar la imagen seleccionada.'));
      };

      img.onload = () => {
        try {
          const optimizedDataUrl = cropAndCompressImage(img, maxSize, quality);
          resolve(optimizedDataUrl);
        } catch (err) {
          reject(new Error(`Fallo en el procesamiento de imagen: ${err.message}`));
        }
      };

      img.src = readerEvent.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Executes the 1:1 crop calculation and canvas render for an HTMLImageElement.
 * 
 * @param {HTMLImageElement} img - Loaded image element.
 * @param {number} targetBoxSize - Max bound for width and height.
 * @param {number} quality - JPEG compression quality.
 * @returns {string} Compressed DataURL.
 */
function cropAndCompressImage(img, targetBoxSize, quality) {
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  if (naturalWidth === 0 || naturalHeight === 0) {
    throw new Error('Dimensiones de imagen inválidas.');
  }

  // 1. Determine shortest side to extract centered square crop
  const minSide = Math.min(naturalWidth, naturalHeight);
  const cropX = (naturalWidth - minSide) / 2;
  const cropY = (naturalHeight - minSide) / 2;

  // 2. Bound canvas output dimension
  const finalDimension = Math.min(minSide, targetBoxSize);

  // 3. Render on offscreen Canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalDimension;
  canvas.height = finalDimension;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D de Canvas.');
  }

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw white background first to avoid black artifacts if source has transparency (PNG/WEBP)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalDimension, finalDimension);

  // Draw cropped center portion scaled down into square target canvas
  ctx.drawImage(
    img,
    cropX, cropY, minSide, minSide,   // Source crop rectangle
    0, 0, finalDimension, finalDimension // Destination canvas rectangle
  );

  return canvas.toDataURL('image/jpeg', quality);
}