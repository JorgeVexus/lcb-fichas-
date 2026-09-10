import type { DescriptionSection } from "@/lib/description-sections";

const LEFT_COLUMN = new Set(["PRECIO", "MEDIDAS", "CARGA Y DESCARGA"]);

function Section({ section, extraBullet }: { section: DescriptionSection; extraBullet?: string | null }) {
  if (section.bullets.length === 0 && !extraBullet) return null;
  return (
    <div className="ficha-desc-section">
      <div className="ficha-desc-section-title">{section.title}</div>
      {section.bullets.map((b, i) => (
        <div className="ficha-desc-bullet" key={i}>
          · {b.label ? `${b.label}: ${b.value}` : b.value}
        </div>
      ))}
      {extraBullet && <div className="ficha-desc-bullet">· Garantía: {extraBullet}</div>}
    </div>
  );
}

export function FichaDescription({
  sections,
  garantiaOption,
  illustrativeNotes,
}: {
  sections: DescriptionSection[];
  garantiaOption?: string | null;
  illustrativeNotes?: string[];
}) {
  const left = sections.filter((s) => LEFT_COLUMN.has(s.key));
  const right = sections.filter((s) => !LEFT_COLUMN.has(s.key));
  const notes = (illustrativeNotes ?? []).map((n) => n.trim()).filter(Boolean);

  return (
    <div className="ficha-description">
      <div className="ficha-description-title">Descripción</div>
      {/* Avisos tipo "*Fotos ilustrativas...*" -- sin título, debajo del
          título de la sección y antes de las dos columnas. Líneas vacías
          ya filtradas arriba, así que si no hay ninguna no se imprime nada. */}
      {notes.map((note, i) => (
        <div className="ficha-desc-note ficha-desc-note--top" key={i}>
          *{note}*.
        </div>
      ))}
      <div className="ficha-description-columns">
        <div>
          {left.map((s) => (
            <Section key={s.key} section={s} />
          ))}
        </div>
        <div>
          {right.map((s) => (
            <Section
              key={s.key}
              section={s}
              extraBullet={s.key === "REQUISITOS" ? garantiaOption : null}
            />
          ))}
          <div className="ficha-desc-note">*El precio puede cambiar sin aviso previo*.</div>
        </div>
      </div>
    </div>
  );
}
