import { ArrowUpRight } from 'lucide-react';
import { links } from '../landing/site';
import Image from 'next/image';
import { ProjectBrand } from './project-header';

export default function Initiative() {
  return (
    <div className="initiative" id="iniciativa">
      <section className="initiative-intro" aria-labelledby="initiative-title">
        <div className="initiative-intro-copy">
          <span className="eyebrow">LA INICIATIVA</span>
          <h2 id="initiative-title">
            Una mejora que podemos
            <br />
            <em>construir entre todos.</em>
          </h2>
          <p>
            Entender un requisito o encontrar un botón no debería ser lo más difícil de un trámite.
            Reforma Digital nace para trabajar en esa distancia: entre lo que la Administración
            ofrece y lo que las personas consiguen hacer con ello.
          </p>
          <p>
            Compartimos el código, las decisiones y lo que aprendemos. Cada trámite que mejoramos es
            un punto de partida para el siguiente.
          </p>
        </div>
        <figure
          className="initiative-network"
          aria-label="Fuentes y servicios públicos conectados con Reforma Digital"
        >
          <svg
            className="initiative-network-lines"
            viewBox="0 0 500 460"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M95 65 C200 65 160 230 250 230 M70 230 H250 M95 395 C200 395 160 230 250 230 M405 65 C300 65 340 230 250 230 M430 230 H250 M405 395 C300 395 340 230 250 230" />
          </svg>
          {[
            ['clave.png', 'Cl@ve', 'Identidad digital'],
            ['sepe.svg', 'SEPE', 'Empleo'],
            ['boe.svg', 'BOE', 'Normativa'],
            ['dgt.svg', 'DGT', 'Tráfico'],
            ['communities', 'Comunidades autónomas', 'Tu comunidad'],
            ['gobierno.svg', 'Gobierno de España', 'Administración'],
          ].map(([file, name, label], index) => (
            <div className={`initiative-network-source network-source-${index}`} key={file}>
              {file === 'communities' ? (
                <div className="community-mosaic" aria-label="Las 17 comunidades autónomas">
                  {[
                    ['andalucia.png', 'Andalucía'],
                    ['aragon.svg', 'Aragón'],
                    ['asturias.svg', 'Asturias'],
                    ['baleares.png', 'Illes Balears'],
                    ['canarias.svg', 'Canarias'],
                    ['cantabria.png', 'Cantabria'],
                    ['castilla-leon.png', 'Castilla y León'],
                    ['castilla-mancha.svg', 'Castilla-La Mancha'],
                    ['catalunya.svg', 'Cataluña'],
                    ['valencia.png', 'Comunitat Valenciana'],
                    ['extremadura.png', 'Extremadura'],
                    ['galicia.svg', 'Galicia'],
                    ['madrid.svg', 'Comunidad de Madrid'],
                    ['murcia.svg', 'Región de Murcia'],
                    ['navarra.svg', 'Navarra'],
                    ['euskadi.gif', 'País Vasco'],
                    ['rioja.svg', 'La Rioja'],
                  ].map(([logo, community]) => (
                    <Image
                      key={logo}
                      src={`/organismos/comunidades/${logo}`}
                      alt={community!}
                      title={community}
                      width={36}
                      height={20}
                      unoptimized
                    />
                  ))}
                </div>
              ) : (
                <Image
                  src={`/organismos/${file}`}
                  alt={name!}
                  width={120}
                  height={42}
                  unoptimized
                />
              )}
              <span>{label}</span>
            </div>
          ))}
          <div className="initiative-network-center">
            <ProjectBrand />
            <small>Un punto de partida.</small>
          </div>
        </figure>
      </section>
      <section className="initiative-principles" aria-labelledby="principles-title">
        <div>
          <span className="initiative-number">LA INICIATIVA</span>
          <h2 id="principles-title">
            Lo público,
            <br />
            <em>pensado para quien lo usa.</em>
          </h2>
        </div>
        <dl>
          <div>
            <dt>Mejoramos la interfaz.</dt>
            <dd>
              Textos más claros, buscadores y pasos ordenados. Cambios pequeños donde hacer un
              trámite se vuelve difícil.
            </dd>
          </div>
          <div>
            <dt>La sede sigue siendo la oficial.</dt>
            <dd>
              Las normas, la identificación y el envío de datos pertenecen a cada organismo. La
              extensión no sustituye al servicio público.
            </dd>
          </div>
          <div>
            <dt>Lo construimos en abierto.</dt>
            <dd>
              Código y decisiones compartidos para que cualquier persona pueda proponer mejoras y
              cualquier equipo público pueda aprovecharlas.
            </dd>
          </div>
        </dl>
      </section>
      <section className="initiative-join" aria-labelledby="join-title">
        <span className="eyebrow">ESTO ACABA DE EMPEZAR</span>
        <h2 id="join-title">
          La próxima reforma,
          <br />
          <em>hecha en comunidad.</em>
        </h2>
        <p>
          Un trámite que se atasca, una idea, unas líneas de código.
          <br />
          Hay muchas maneras de echar una mano.
        </p>
        <div>
          <a href={links.contributing} className="initiative-primary">
            Cómo participar <ArrowUpRight size={17} />
          </a>
          <a href={links.repo} className="initiative-text-link">
            Ver el código <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
    </div>
  );
}
