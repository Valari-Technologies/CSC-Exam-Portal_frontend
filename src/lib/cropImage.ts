/** Crop helpers for the profile-photo cropper (react-easy-crop). */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
  });
}

/**
 * Produce a cropped JPEG Blob from a source image URL and the pixel crop area that
 * react-easy-crop reports. JPEG (not PNG) so the resulting file matches the backend's
 * accepted types and stays small.
 */
export async function getCroppedBlob(imageSrc: string, area: CropArea): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot process this image.');

  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))),
      'image/jpeg',
      0.9,
    );
  });
}
