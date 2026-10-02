import { sources } from '@gov/government';
import { Header, Footer } from '../../../components/header';
import { ArrowUpRight, Landmark } from 'lucide-react';
export default function Sources() {
  return (
    <>
      <div className="page-shell">
        <Header />
        <main id="main" className="content-page">
          <span className="eyebrow">INFORMACIÓN CON ORIGEN</span>
          <h1>Las fuentes importan.</h1>
          <p className="lede">
            Un registro limitado de organismos oficiales. No buscamos en toda Internet: cada
            respuesta se construye a partir de documentos de estas fuentes aprobadas.
          </p>
          <div className="registry-grid">
            {sources.map((s) => (
              <article className="registry-card" key={s.id}>
                <Landmark size={23} />
                <h2>{s.name}</h2>
                <p>
                  {s.jurisdictionType === 'country'
                    ? 'Ámbito estatal'
                    : s.jurisdictionType === 'region'
                      ? 'Comunidad de Madrid'
                      : 'Municipio de Madrid'}
                </p>
                <span className="registry-meta">
                  Fuente aprobada · Web oficial
                  <br />
                  Consultada mediante búsqueda web
                </span>
                <a href={s.baseUrl} target="_blank" rel="noopener noreferrer">
                  Visitar organismo <ArrowUpRight size={15} />
                </a>
              </article>
            ))}
          </div>
          <div className="prose">
            <h2>Las respuestas dependen de la evidencia disponible.</h2>
            <p>
              Buscamos en la web de estos organismos para cada consulta. Si la información
              recuperada no basta, el buscador lo indica. La fecha de consulta y el fragmento
              utilizado se muestran en cada cita.
            </p>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
