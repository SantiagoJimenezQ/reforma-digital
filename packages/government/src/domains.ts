/**
 * Dominios de las administraciones públicas españolas, por sufijo de host. Sirven como lista de
 * confianza: dónde se puede navegar, leer páginas y escribir datos personales sin preguntar. No
 * convierten una página en evidencia: eso lo decide `sources` con sus hosts exactos.
 *
 * Lista adaptada de SpainAssist (https://github.com/MeLlamoPablo/SpainAssist,
 * packages/shared/src/official.ts), licencia MIT, © 2026 Pablo Rodríguez Caballero.
 */
export type AdministrationLevel = 'estatal' | 'autonomica' | 'local' | 'europea';

const level = (name: AdministrationLevel, suffixes: string) =>
  suffixes.split(' ').map((suffix) => ({ suffix, level: name }));

export const officialDomains: readonly { suffix: string; level: AdministrationLevel }[] = [
  ...level(
    'estatal',
    'gob.es boe.es agenciatributaria.es seg-social.es sepe.es dgt.es policia.es ' +
      'dnielectronico.es citapreviadnie.es fnmt.es cert.fnmt.es guardiacivil.es mjusticia.es ' +
      'justicia.es catastro.minhap.es redsara.es correos.es ine.es imserso.es mites.gob.es ' +
      'exteriores.gob.es',
  ),
  ...level(
    'autonomica',
    'juntadeandalucia.es aragon.es asturias.es caib.es gobiernodecanarias.org cantabria.es ' +
      'jcyl.es castillalamancha.es gencat.cat aoc.cat gva.es juntaex.es xunta.gal madrid.org ' +
      'comunidad.madrid carm.es navarra.es euskadi.eus larioja.org ceuta.es melilla.es',
  ),
  ...level(
    'local',
    'madrid.es barcelona.cat bcn.cat valencia.es zaragoza.es sevilla.org malaga.eu murcia.es ' +
      'palma.cat palma.es laspalmasgc.es alicante.es bilbao.eus cordoba.es valladolid.es ' +
      'vigo.org l-h.cat gijon.es vitoria-gasteiz.org coruna.gal lacoruna.es elche.es ' +
      'granada.org terrassa.cat badalona.cat sabadell.cat oviedo.es cartagena.es mostoles.es ' +
      'jerez.es aytojerez.es santacruzdetenerife.es pamplona.es almeriaciudad.es aytoalmeria.es ' +
      'ayto-alcaladehenares.es leganes.org getafe.es ayto-fuenlabrada.es fuenlabrada.es ' +
      'donostia.eus castello.es aytoburgos.es ayto-alcorcon.es santander.es albacete.es ' +
      'aytolalaguna.es marbella.es logrono.es aytobadajoz.es paeria.cat aytosalamanca.es ' +
      'tarragona.cat ayto-torrejon.es huelva.es doshermanas.es ayuntamientoparla.es mataro.cat ' +
      'algeciras.es gramenet.cat aytoleon.es alcobendas.org aytojaen.es reus.cat ' +
      'aytoroquetas.org roquetasdemar.es cadiz.es girona.cat ourense.gal telde.es ' +
      'rivasciudad.es barakaldo.eus santiagodecompostela.gal concellodelugo.gal lugo.gal ' +
      'lugo.es ayto-caceres.es caceres.es guadalajara.es toledo.es pontevedra.gal ' +
      'aytopalencia.es ciudadreal.es merida.es zamora.es avila.es huesca.es cuenca.es ' +
      'segovia.es soria.es teruel.es dipalme.org dipucadiz.es dipucordoba.es eprinsa.es ' +
      'dipgra.es diphuelva.es dipujaen.es malaga.es prpmalaga.es dipusevilla.es ' +
      'sedeelectronicadipusevilla.es opaef.es dip-badajoz.es dip-caceres.es ' +
      'diputacionalicante.es dipcas.es dival.es dipualba.es dipucr.es dipucuenca.es ' +
      'dguadalajara.es diputoledo.es diputacionavila.es burgos.es diputaciondeburgos.es ' +
      'dipuleon.es diputaciondepalencia.es dip-palencia.es lasalina.es dipsegovia.es ' +
      'dipsoria.es diputaciondevalladolid.es diputaciondezamora.es dphuesca.es dpteruel.es ' +
      'dpz.es diba.cat ddgi.cat diputaciolleida.cat dipta.cat dacoruna.gal deputacionlugo.gal ' +
      'deputacionlugo.org depourense.gal depourense.es depo.gal araba.eus bizkaia.eus ' +
      'bizkaia.net ebizkaia.eus gipuzkoa.eus gipuzkoa.net sede.grancanaria.com tenerife.es ' +
      'cabildodelanzarote.com cabildofuer.es cabildodelapalma.es lagomera.es elhierro.es ' +
      'conselldemallorca.es conselldemallorca.cat conselldemallorca.net secimallorca.net ' +
      'cime.es www.carpetaciutadana.org conselldeivissa.es conselldeivissa.cat ' +
      'conselldeformentera.cat consellinsulardeformentera.cat consellformentera.com ' +
      'sedipualba.es seu-e.cat seu.cat sedelectronica.es sedelectronica.gal eadministracio.cat ' +
      'egoitzaelektronikoa.eus',
  ),
  ...level('europea', 'europa.eu'),
];

/** Nivel de la administración a la que pertenece una URL HTTPS, o `undefined` si no es oficial. */
export function officialLevel(url: string): AdministrationLevel | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  // Sufijo con límite de etiqueta: «sede.agenciatributaria.gob.es» encaja en «gob.es»; «evilgob.es» no.
  return officialDomains.find((d) => host === d.suffix || host.endsWith('.' + d.suffix))?.level;
}
