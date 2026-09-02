export interface DescriptionBullet {
  label: string;
  value: string;
}

export interface DescriptionSection {
  /** Identidad fija (PRECIO, MEDIDAS, ...) -- de esto dependen el mapeo de
   * columnas y el bullet de Garantía. Nunca se edita. */
  key: SectionTitle;
  /** Rótulo visible en la ficha; editable por el asesor, empieza igual a `key`. */
  title: string;
  bullets: DescriptionBullet[];
}

const SECTION_TITLES = [
  "PRECIO",
  "MEDIDAS",
  "CARGA Y DESCARGA",
  "MATERIALES",
  "SERVICIOS",
  "FECHAS",
  "REQUISITOS",
] as const;

export type SectionTitle = (typeof SECTION_TITLES)[number];

const HEADER_BY_NORMALIZED = new Map<string, SectionTitle>(
  SECTION_TITLES.map((title) => [normalizeHeader(title), title])
);

function normalizeHeader(line: string): string {
  return line
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita acentos: "CARGA Y DESCARGA" calza aunque EasyBroker varíe mayúsculas/acentos
}

/** "· Garantía: ..." se extrae aparte (dropdown de opciones fijas), nunca como bullet libre. */
export const GARANTIA_LABEL_RE = /garant[ií]a/i;

function looksLikeMeasurement(value: string): boolean {
  return /\d\s*(m2|m²|m\b|mts?\b|tons?\/m2)/i.test(value) && !/\$/.test(value);
}

/**
 * Red de seguridad SOLO para cuando no hay un header de sección detectado
 * arriba de un bullet (no debería pasar con el formato real de EasyBroker,
 * pero por si acaso el texto viene incompleto o con otro orden).
 */
function guessSectionFor(label: string, value: string): SectionTitle {
  const l = label.toLowerCase();

  if (/^(precio|renta|venta) de/.test(l) || l.includes("mantenimiento") || l.includes("mensualidad")) {
    return "PRECIO";
  }
  if (looksLikeMeasurement(value)) {
    return "MEDIDAS";
  }
  if (l.includes("andenes") || l.includes("rampa") || l.includes("estacionamiento") || l.includes("maniobras")) {
    return "CARGA Y DESCARGA";
  }
  if (l.includes("techo") || l.includes("muro") || l.includes("luz natural")) {
    return "MATERIALES";
  }
  if (l.includes("vigilancia") || l.includes("incendio") || l.includes("luminaria") || l.includes("baño")) {
    return "SERVICIOS";
  }
  if (l.includes("disponible") || l.includes("antigüedad") || l.includes("antiguedad")) {
    return "FECHAS";
  }
  return "REQUISITOS";
}

/**
 * Convierte el campo `description` de EasyBroker en las 7 secciones
 * editables del diseño, más el valor de "Garantía" por separado (dropdown
 * de opciones fijas, no bullet libre).
 *
 * EasyBroker ya manda estas secciones como encabezados de texto plano
 * dentro de la descripción -- "PRECIO", "MEDIDAS", "CARGA Y DESCARGA", etc.,
 * cada uno seguido de sus bullets "· Etiqueta: Valor" -- así que la sección
 * de cada bullet se toma del encabezado real que le precede en el texto,
 * en vez de adivinar por el nombre de la etiqueta. Eso es lo que evita que
 * "Drop Lots", "Largo", etc. (variantes que EasyBroker no siempre repite
 * igual) se cuelen en la sección equivocada: no importa qué tan rara sea
 * la etiqueta, si viene debajo de "CARGA Y DESCARGA" en el texto, se queda
 * en CARGA Y DESCARGA. La heurística por palabras clave solo se usa como
 * último recurso si un bullet aparece sin ningún encabezado detectado antes.
 */
export function parseDescriptionSections(description: string): {
  sections: DescriptionSection[];
  garantiaText: string | null;
} {
  const sections = new Map<SectionTitle, DescriptionBullet[]>(
    SECTION_TITLES.map((title) => [title, []])
  );
  let garantiaText: string | null = null;
  let currentSection: SectionTitle | null = null;

  for (const rawLine of description.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const asHeader = HEADER_BY_NORMALIZED.get(normalizeHeader(line));
    if (asHeader) {
      currentSection = asHeader;
      continue;
    }

    if (!line.startsWith("·")) continue; // texto suelto (ej. el CTA al final) -- no es un bullet
    const bulletText = line.slice(1).trim();
    if (!bulletText) continue;

    const idx = bulletText.indexOf(":");
    // No todos los bullets de REQUISITOS traen "Etiqueta: Valor" -- a veces
    // es una sola frase ("Garantía corporativa o 12 meses en garantía").
    // Sin ":" se guarda como valor con etiqueta vacía, para no perder el
    // contenido en vez de descartarlo en silencio.
    const label = idx === -1 ? "" : bulletText.slice(0, idx).trim();
    const value = idx === -1 ? bulletText : bulletText.slice(idx + 1).trim();
    if (!value) continue;

    if (GARANTIA_LABEL_RE.test(label) || GARANTIA_LABEL_RE.test(value)) {
      garantiaText = value;
      continue;
    }

    const section = currentSection ?? guessSectionFor(label, value);
    sections.get(section)!.push({ label, value });
  }

  return {
    sections: SECTION_TITLES.map((key) => ({ key, title: key, bullets: sections.get(key)! })),
    garantiaText,
  };
}
