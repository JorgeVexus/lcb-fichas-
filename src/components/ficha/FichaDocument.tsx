import { FichaPage1 } from "./FichaPage1";
import { FichaGalleryPage } from "./FichaGalleryPage";
import type { FichaData } from "@/types/ficha";

const EXTRA_PAGE_SIZE = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Fuente única de verdad del documento: el preview en pantalla y el HTML que
 * se imprime a PDF renderizan exactamente este mismo componente.
 *
 * `logoSrc` se pasa explícito (en vez de que cada header resuelva su propio
 * default) porque el render a PDF necesita un data: URI del logo -- ver
 * src/lib/pdf-render.ts -- mientras que el preview en pantalla usa la ruta
 * estática normal servida por Next.
 */
export function FichaDocument({ ficha, logoSrc }: { ficha: FichaData; logoSrc?: string }) {
  const extraChunks = chunk(ficha.extraPageImageIds, EXTRA_PAGE_SIZE);

  return (
    <>
      <FichaPage1 ficha={ficha} logoSrc={logoSrc} />
      <FichaGalleryPage ficha={ficha} title={ficha.galleryTitle} imageIds={ficha.galleryImageIds} logoSrc={logoSrc} />
      {extraChunks.map((ids, i) => (
        <FichaGalleryPage
          key={i}
          ficha={ficha}
          title={extraChunks.length > 1 ? `${ficha.extraPagesTitle} (${i + 1}/${extraChunks.length})` : ficha.extraPagesTitle}
          imageIds={ids}
          logoSrc={logoSrc}
        />
      ))}
    </>
  );
}
