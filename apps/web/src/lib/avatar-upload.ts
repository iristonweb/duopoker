const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** Resize static images; GIFs pass through with a size cap. */
export async function prepareAvatarUpload(file: File, maxBytes = 280_000): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('notImage');
  }

  if (file.type === 'image/gif') {
    if (file.size > 450_000) throw new Error('tooLarge');
    return readFileAsDataUrl(file);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const maxSide = 320;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, 0, 0, w, h);

  for (const quality of [0.88, 0.75, 0.6, 0.45]) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) continue;
    if (blob.size <= maxBytes) {
      return readFileAsDataUrl(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    }
  }

  throw new Error('tooLarge');
}
