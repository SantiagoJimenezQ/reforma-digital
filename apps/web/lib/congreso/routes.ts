export const congressBase = '/congreso';
export const congressSections = [
  {
    title: 'Portada y pestañas',
    pages: [
      ['Inicio', ''],
      ['Elecciones', 'elecciones'],
      ['Geografía', 'geografia'],
      ['Método', 'metodo'],
    ],
  },
  {
    title: 'Actividad',
    pages: [
      ['Por día', 'dias'],
      ['Votaciones', 'votaciones'],
      ['Leyes', 'leyes'],
      ['Temas', 'temas'],
      ['Preguntas al Gobierno', 'preguntas'],
      ['Explora', 'explora'],
      ['La semana en el Congreso', 'semana'],
    ],
  },
  {
    title: 'Quién es quién',
    pages: [
      ['Diputados', 'diputados'],
      ['Grupos', 'grupos'],
      ['Por orador', 'oradores'],
      ['Organigrama del Estado', 'organigrama'],
      ['Tus diputados', 'provincia'],
    ],
  },
  {
    title: 'Entender',
    pages: [
      ['Glosario', 'glosario'],
      ['Cómo se hace una ley', 'como-ley'],
      ['Sobre los datos', 'sobre'],
    ],
  },
];

export function congressRoute(path: string[] = []) {
  const [section = '', detail] = path;
  if (path.length > 2) return null;
  const title = congressSections
    .flatMap(({ pages }) => pages)
    .find(([, route]) => route === section)?.[0];
  const details = new Map([
    ['diputado', 'Diputado'],
    ['votacion', 'Votación'],
    ['sesion', 'Sesión'],
    ['iniciativa', 'Iniciativa'],
    ['tema', 'Tema'],
    ['cargo', 'Cargo'],
  ]);
  const detailTitle = details.get(section);
  if (detailTitle) return detail ? { section, detail, title: detailTitle } : null;
  if (!title || (detail && !['elecciones', 'geografia', 'provincia', 'semana'].includes(section)))
    return null;
  return { section, detail, title };
}
