import { Suspense } from 'react';
import { getIndex, getOrgans } from '../../lib/congreso/data';
import { Intro, date } from './common';

const titles: Record<string, [string, string?]> = {
  dias: ['Por día', 'Plenos y comisiones, con el debate y las votaciones de cada sesión.'],
  votaciones: ['Cada voto, a la vista'],
  leyes: [
    'Cómo avanza cada ley',
    'Desde la presentación hasta su aprobación, con el expediente oficial a un clic.',
  ],
  temas: ['El Congreso, por temas'],
  preguntas: [
    'Preguntas al Gobierno',
    'Lo que los diputados preguntan por escrito y las respuestas pendientes.',
  ],
  diputados: ['Quién te representa'],
  provincia: ['Tus diputados'],
  grupos: ['Los grupos parlamentarios'],
  oradores: [
    'Por orador',
    'Qué dijo cada persona, en qué contexto y con qué tono según el análisis.',
  ],
  organigrama: ['Quién ocupa cada cargo', 'Nombramientos y ceses publicados en el BOE.'],
  explora: [
    'Explora la legislatura',
    'Citas, propuestas y respuestas, con su contexto para comprobarlas.',
  ],
  geografia: [
    'España, en datos',
    'Población, renta, edad y representación, con datos del INE y del Congreso.',
  ],
};

async function Caption({ section }: { section: string }) {
  if (section === 'organigrama')
    return <>Actualizado el {date((await getOrgans()).actualizado)}.</>;
  return (
    <>Miembros actuales e históricos de la legislatura {(await getIndex()).meta.legislatura}.</>
  );
}

export function StaticIntro({
  section,
  detail,
  province,
}: {
  section: string;
  detail?: string;
  province: string;
}) {
  const entry = titles[section];
  if (!entry || detail) return null;
  const [title, description] = entry;
  const caption = ['diputados', 'provincia', 'organigrama'].includes(section);
  return (
    <Intro title={section === 'provincia' && province ? `${title} · ${province}` : title}>
      {(description || caption) && (
        <p>
          {description}
          {caption && (
            <Suspense fallback={null}>
              {' '}
              <Caption section={section} />
            </Suspense>
          )}
        </p>
      )}
    </Intro>
  );
}
