import { Header, Footer } from "../../../components/header";
export default function Privacy() {
  return (
    <>
      <div className="page-shell">
        <Header />
        <main id="main" className="content-page prose">
          <span className="eyebrow">TUS DATOS, CON CUIDADO</span>
          <h1>Pregunta sin identificarte.</h1>
          <p className="lede">
            No necesitas una cuenta. No incluyas tu DNI, dirección, información
            médica, datos bancarios ni otros datos personales en la consulta.
          </p>
          <h2>Qué se procesa</h2>
          <p>
            En el modo conectado, tu pregunta se envía al proveedor de IA
            configurado para interpretar y responder con evidencias. Los
            fragmentos oficiales también se incluyen en esa petición. Si
            Langfuse está configurado, registra la consulta y las etapas de la
            respuesta para evaluar fallos.
          </p>
          <p>
            Antes de enviarla, tu navegador sustituye nombres, direcciones,
            DNI, correos, teléfonos y datos bancarios por marcadores. Si no
            puede hacerlo, la consulta no se envía.
          </p>
          <h2>Documentos adjuntos y dictado</h2>
          <p>
            El PDF se lee en tu navegador. Al enviar una pregunta, se procesa un
            máximo de 6.000 caracteres de su texto para entender el contexto,
            con los mismos proveedores y registros de la consulta. No se guarda
            el archivo PDF ni se incorpora al registro de fuentes oficiales.
            Evita documentos con datos personales. El dictado utiliza el
            servicio de reconocimiento de voz de tu navegador y solo se activa
            al pulsar el micrófono.
          </p>
          <h2>Qué se guarda</h2>
          <p>
            Cuando el feedback está habilitado, se guardan la consulta, los
            documentos recuperados, la respuesta y tu valoración. Esto permite
            revisar errores. Se intenta ocultar patrones habituales de DNI,
            correo, teléfono e IBAN; no es una garantía de anonimización.
          </p>
          <p>
            El operador debe aplicar la política de retención configurada y
            ofrecer un canal de contacto antes del lanzamiento público. Esta
            vista previa es un entorno de desarrollo, no una sede administrativa
            ni un servicio público desplegado.
          </p>
          <h2>Tu ubicación</h2>
          <p>
            No solicitamos permisos de localización. Solo utilizamos la
            localidad que indiques expresamente en tu pregunta. No instalamos
            cookies publicitarias. El área interna utiliza una cookie de sesión
            protegida para el acceso del administrador.
          </p>
        </main>
      </div>
      <Footer />
    </>
  );
}
