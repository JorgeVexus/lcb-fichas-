import type { EasyBrokerPropertyDetail } from "@/lib/easybroker";
import {
  parseDescriptionSections,
  parseIllustrativeNotes,
  type DescriptionSection,
} from "@/lib/description-sections";
import { matchGarantiaOption, DEFAULT_GARANTIA } from "@/lib/garantia-options";
import { formatMexPhone } from "@/lib/agents";
import { buildDefaultFileName, sanitizeFileName } from "@/lib/filename";
import type { FichaData, FichaVariant } from "@/types/ficha";

const DEFAULT_CTA = "AGENDA TU CITA CON 24 HRS. DE ANTICIPACIÓN PARA CONOCERLA.";

function formatAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted} ${currency}`;
}

function formatNumberEsMx(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

/**
 * Re-formatea el primer número de un texto con separador de miles
 * consistente ("5721" -> "5,721", "5,721" se queda igual), sin importar
 * cómo lo haya escrito quien capturó la propiedad en EasyBroker -- el
 * bullet de descripción es texto libre, así que a veces trae la coma y a
 * veces no.
 */
function normalizeNumberInText(text: string): string {
  const match = text.match(/-?[\d,]+(?:\.\d+)?/);
  if (!match) return text;
  const numeric = parseFloat(match[0].replace(/,/g, ""));
  if (Number.isNaN(numeric)) return text;
  return text.replace(match[0], formatNumberEsMx(numeric));
}

function findBulletValue(
  sections: DescriptionSection[],
  sectionKey: string,
  labelIncludes: string
): string | null {
  const section = sections.find((s) => s.key === sectionKey);
  const bullet = section?.bullets.find((b) => b.label.toLowerCase().includes(labelIncludes));
  return bullet?.value ?? null;
}

export function easyBrokerToFichaData(detail: EasyBrokerPropertyDetail): FichaData {
  const { sections, garantiaText } = parseDescriptionSections(detail.description ?? "");

  const images = detail.property_images.map((img, i) => ({
    id: `img-${i}`,
    url: img.url,
  }));

  const variant: FichaVariant = images.length >= 3 ? "3-fotos" : "2-fotos";
  const secondaryCount = variant === "3-fotos" ? 2 : 1;

  // Cada foto solo puede ser portada, secundaria o galería -- nunca dos a la
  // vez -- así que la galería toma las siguientes fotos distintas en vez de
  // repetir las primeras 6 (la mayoría de propiedades trae de sobra).
  const galleryStart = 1 + secondaryCount;

  const saleOrRental = detail.operations.find((op) => op.type === "rental" || op.type === "sale");
  // Siempre se recalcula con Intl (2 decimales fijos) en vez de usar
  // formatted_amount tal cual -- EasyBroker a veces no trae decimales.
  const priceLabel = saleOrRental ? formatAmount(saleOrRental.amount, saleOrRental.currency) : "Precio a consultar";
  const priceOperation = saleOrRental?.type === "sale" ? "en Venta" : "en Renta";

  const areaFromBullet = findBulletValue(sections, "MEDIDAS", "área total construida");
  const areaLabel = areaFromBullet
    ? normalizeNumberInText(/m2|m²/i.test(areaFromBullet) ? areaFromBullet.replace(/m2/i, "m²") : `${areaFromBullet} m²`)
    : detail.construction_size
      ? `${formatNumberEsMx(detail.construction_size)} m²`
      : detail.lot_size
        ? `${formatNumberEsMx(detail.lot_size)} m²`
        : "";

  const maintenanceLabel = findBulletValue(sections, "PRECIO", "cuota de mantenimiento");

  const andenes = findBulletValue(sections, "CARGA Y DESCARGA", "andenes");
  const extraHeadline = andenes ? `${andenes} andenes para trailers` : null;

  // Siempre deja al menos 2 líneas editables en el formulario, aunque
  // EasyBroker no traiga ninguna -- el asesor puede agregar el aviso a
  // mano; las líneas vacías simplemente no se imprimen en el PDF.
  const illustrativeNotes = parseIllustrativeNotes(detail.description ?? "");
  while (illustrativeNotes.length < 2) illustrativeNotes.push("");

  return {
    publicId: detail.public_id,
    variant,

    title: detail.title,
    agent: {
      name: detail.agent?.full_name ?? detail.agent?.name ?? "",
      phone: formatMexPhone(detail.agent?.mobile_phone ?? ""),
      email: detail.agent?.email ?? "",
    },

    allImages: images,
    heroImageId: images[0]?.id ?? null,
    secondaryImageIds: images.slice(1, galleryStart).map((img) => img.id),
    galleryImageIds: images.slice(galleryStart, galleryStart + 6).map((img) => img.id),
    extraPageImageIds: [],

    priceLabel,
    priceOperation,
    maintenanceLabel,
    areaLabel,
    extraHeadline,

    location: {
      address: detail.location?.name ?? "",
      latitude: detail.location?.latitude ?? null,
      longitude: detail.location?.longitude ?? null,
    },
    mapEmbedUrl: null,
    googleMapsUrl: null,
    customMapImage: null,

    descriptionSections: sections,
    garantiaOption: matchGarantiaOption(garantiaText) ?? DEFAULT_GARANTIA,
    illustrativeNotes,

    galleryTitle: "Fotografías",
    extraPagesTitle: "Planos",
    ctaText: DEFAULT_CTA,
    fileName: sanitizeFileName(buildDefaultFileName(detail.title, areaLabel)),
    extraFiles: [],
  };
}
