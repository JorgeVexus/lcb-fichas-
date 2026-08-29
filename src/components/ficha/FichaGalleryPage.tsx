import { FichaHeader } from "./FichaHeader";
import { FichaFooter } from "./FichaFooter";
import type { FichaData } from "@/types/ficha";

/**
 * Página de cuadrícula de fotos reutilizable: la sirve tanto la galería de
 * la propiedad (página 2) como cualquier página extra de planos/archivos
 * subidos -- mismo formato visual, distinta fuente de imágenes/título.
 */
export function FichaGalleryPage({
  ficha,
  title,
  imageIds,
  logoSrc,
}: {
  ficha: FichaData;
  title: string;
  imageIds: string[];
  logoSrc?: string;
}) {
  const photos = imageIds
    .map((id) => ficha.allImages.find((img) => img.id === id)?.url)
    .filter(Boolean) as string[];

  return (
    <div className="ficha-page">
      <FichaHeader title="" agent={ficha.agent} logoSrc={logoSrc} />
      <div className="ficha-gallery-title">{title}</div>
      <div className="ficha-gallery-grid">
        {photos.map((url, i) => (
          <div key={i}>
            <img src={url} alt="" />
          </div>
        ))}
      </div>
      <FichaFooter text={ficha.ctaText} />
    </div>
  );
}
