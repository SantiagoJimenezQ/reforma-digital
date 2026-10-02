/** Small, frozen official excerpts for UI inspection. Never a production index or an eval gold. */
import type { Evidence } from '@gov/core';
import { sourceById } from '@gov/government';
const excerpts = [
  [
    'vida-laboral',
    'seg-social',
    'Informe de tu vida laboral',
    'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida+laboral+e+informes/Informes+sobre+tu+situacion+laboral/Informe+de+tu+vida+laboral',
    'Qué puedes hacer',
    'Consultar todas tus situaciones de alta y baja en los distintos regímenes de la Seguridad Social.\nObtener un informe en PDF de tu vida laboral completa o acotada según tu búsqueda.\nSolicitar la incorporación o modificación de datos si detectas errores.\nSi no has estado de alta en la Seguridad Social no podrás obtener este informe.',
  ],
  [
    'situacion-actual',
    'seg-social',
    'Informe de situación actual del trabajador',
    'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bsobre%2Btu%2Bsituacion%2Blaboral/Informe%2Bde%2Bsituacion%2Blaboral%2Bactual',
    'A quién va dirigido',
    'Todos los ciudadanos, tengan o no asignado un Número de la Seguridad Social (NUSS) y hayan estado o no de alta en algún régimen.\nConsultar tu situación actual en la Seguridad Social.\nDescargar el informe en PDF.',
  ],
  [
    'alta-censal',
    'aeat',
    'Modelo 036. Alta en el censo de empresarios, profesionales y retenedores',
    'https://www3.agenciatributaria.gob.es/Sede/procedimientos/G322.shtml',
    'Declaración censal de alta',
    'Quienes hayan de formar parte del Censo de empresarios, profesionales y retenedores deberán presentar una declaración de alta en el mismo, utilizando el modelo 036.',
  ],
  [
    'paro',
    'sepe',
    'Prestaciones por desempleo · prestación contributiva',
    'https://www.sepe.es/HomeSepe/es/Personas/distributiva-prestaciones.html',
    'Prestación contributiva',
    'Si tienes 360 días o más cotizados a la contingencia por desempleo, has perdido tu empleo y cumples todos los requisitos, puedes tener derecho a una prestación contributiva (paro).',
  ],
  [
    'demanda-madrid',
    'comunidad-madrid',
    'Inscripción como demandante de empleo en Madrid',
    'https://www.comunidad.madrid/empleo/oficina-empleo',
    'La demanda de empleo',
    'Los trabajadores que quieran inscribirse deben residir en la Comunidad de Madrid y estar en edad laboral.\nPara inscribirte de forma presencial puedes hacerlo solicitando previamente cita online o llamando al 012.\nPara poder inscribirte de forma telemática necesitas disponer de uno de los sistemas de firma electrónica reconocidos por la Comunidad de Madrid.',
  ],
  [
    'oficina-virtual',
    'comunidad-madrid',
    'Tu oficina virtual de empleo',
    'https://www.comunidad.madrid/empleo/tu-oficina-virtual-empleo',
    'Tu espacio privado',
    'Desde este espacio podrás solicitar el alta como demandante de empleo, realizar trámites sobre tu demanda y acceder a servicios personalizados que mejoren tus oportunidades de encontrar el empleo que buscas.',
  ],
  [
    'padron-madrid',
    'ayuntamiento-madrid',
    'Padrón Municipal. Empadronamiento (altas y cambios de domicilio)',
    'https://sede.madrid.es/portal/site/tramites/menuitem.1f3361415fda829be152e15284f1a5a0/?vgnextchannel=775ba38813180210VgnVCM100000c90da8c0RCRD&vgnextoid=3e3debb41f6e2410VgnVCM2000000c205a0aRCRD',
    'Cita previa',
    'Oficinas de Atención a la Ciudadanía Línea Madrid.\nSeleccione, en categoría: Padrón y en trámite o servicio Altas, Bajas y Cambio de domicilio en Padrón.',
  ],
  [
    'becas',
    'educacion',
    'Becas y ayudas para estudiantes',
    'https://www.becaseducacion.gob.es/becas-y-ayudas/',
    'Beca general · curso 2026/2027',
    'Estudios universitarios y Enseñanzas Artísticas Superiores (Grado y Máster) y no universitarios (FP, Bachillerato y otros).\nRecuerda que debes entrar en sede electrónica periódicamente para ver el estado de tramitación de tu solicitud de beca por si tienes alguna notificación. Si te piden algún documento, tienes un plazo para entregarlo.',
  ],
  [
    'examen-conducir',
    'dgt',
    'Exámenes y pruebas de aptitud para conducir',
    'https://sede.dgt.gob.es/es/permisos-de-conducir/examenes-y-pruebas/',
    'Consulta de notas de examen',
    'Si te has examinado para la obtención de un permiso de conducir, podrás consultar por internet el resultado del examen que hayas hecho, tanto si se trata del examen teórico cómo del práctico. En función del tipo de examen se podrá consultar el resultado el mismo día del examen o al día siguiente.',
  ],
  [
    'cotizacion-autonomo',
    'seg-social',
    'Informe de datos de cotización de trabajo autónomo',
    'https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bde%2Btus%2Bcotizaciones/Informe_datos_cotizacion_trabajo_autonomo',
    'Qué puedes hacer',
    'Podrás consultar los datos de los últimos 12 meses.\nConsultar y obtener un informe de tus datos de cotización del periodo mensual seleccionado.\nDescargar el informe en un PDF certificado.',
  ],
] as const;
export const previewCorpus: Evidence[] = excerpts.map(
  ([id, sourceId, title, canonicalUrl, heading, content]) => {
    const s = sourceById(sourceId);
    return {
      chunkId: `preview-${id}-0`,
      documentId: `preview-${id}`,
      sourceId,
      title,
      canonicalUrl,
      heading,
      content,
      organization: s.organization,
      jurisdiction: s.jurisdictionValue,
      authorityScore: s.authorityScore,
      crawledAt: '2026-09-30T00:00:00.000Z',
      sourceUpdatedAt: null,
      available: true,
      score: 0,
    };
  },
);
