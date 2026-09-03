import sharp from "sharp";

// Las fotos de EasyBroker (y las imágenes subidas a mano) suelen venir a
// resolución de cámara/celular -- 3,000-4,000px de ancho -- pero en la
// ficha ninguna se muestra a más de ~1,300px real. Achicarlas antes de que
// Chromium las imprima corta el peso del PDF varias veces sin que se note
// a simple vista, ni impresas ni en pantalla.
const MAX_WIDTH = 1400;
const JPEG_QUALITY = 78;

async function toOptimizedDataUri(buffer: Buffer): Promise<string> {
  const optimized = await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${optimized.toString("base64")}`;
}

/**
 * Optimiza una imagen (URL remota o ya en data:) para incrustarla en el
 * PDF -- reduce tamaño y recomprime a JPEG. Si algo falla (URL caída,
 * formato raro), regresa la original tal cual en vez de tumbar la ficha
 * completa por una sola foto.
 */
export async function optimizeImage(src: string): Promise<string> {
  try {
    if (src.startsWith("data:")) {
      const match = src.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) return src;
      return await toOptimizedDataUri(Buffer.from(match[1], "base64"));
    }

    const res = await fetch(src);
    if (!res.ok) return src;
    const buffer = Buffer.from(await res.arrayBuffer());
    return await toOptimizedDataUri(buffer);
  } catch {
    return src;
  }
}
