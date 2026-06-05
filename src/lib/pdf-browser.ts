// Browser-only PDF rasterization + cropping helpers (uses pdfjs-dist).
import * as pdfjsLib from "pdfjs-dist";
// Use a CDN worker matching the installed version (avoids bundling the worker).
// pdfjs-dist v6 ships ESM worker.
const PDFJS_VERSION = (pdfjsLib as any).version as string;
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

const docCache = new Map<string, Promise<any>>();

export function loadPdf(url: string): Promise<any> {
  if (!docCache.has(url)) {
    docCache.set(
      url,
      (pdfjsLib as any).getDocument({ url, withCredentials: false }).promise,
    );
  }
  return docCache.get(url)!;
}

export async function renderPdfPageToCanvas(
  url: string,
  pageNumber: number,
  targetWidth = 1400,
): Promise<HTMLCanvasElement> {
  const pdf = await loadPdf(url);
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas;
}

export function canvasToBase64(canvas: HTMLCanvasElement, type = "image/png"): string {
  const dataUrl = canvas.toDataURL(type, 0.92);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export async function cropImageUrl(
  imageUrl: string,
  crop: { x: number; y: number; width: number; height: number }, // normalized 0-1
): Promise<{ base64: string; contentType: string }> {
  const img = await loadImage(imageUrl);
  const sx = Math.max(0, crop.x * img.naturalWidth);
  const sy = Math.max(0, crop.y * img.naturalHeight);
  const sw = Math.max(1, crop.width * img.naturalWidth);
  const sh = Math.max(1, crop.height * img.naturalHeight);
  const c = document.createElement("canvas");
  c.width = Math.round(sw);
  c.height = Math.round(sh);
  c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return { base64: canvasToBase64(c, "image/png"), contentType: "image/png" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}
