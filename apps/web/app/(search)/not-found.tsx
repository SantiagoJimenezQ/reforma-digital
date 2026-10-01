import Link from "next/link";
import { Header, Footer } from "../../components/header";
export default function NotFound() {
  return (
    <>
      <div className="page-shell">
        <Header />
        <main id="main" className="content-page">
          <h1>Por aquí no era.</h1>
          <p className="lede">
            No encontramos esta página. Vuelve al buscador para encontrar tu
            trámite.
          </p>
          <Link href="/composer" className="primary-link">
            Volver al inicio
          </Link>
        </main>
      </div>
      <Footer />
    </>
  );
}
