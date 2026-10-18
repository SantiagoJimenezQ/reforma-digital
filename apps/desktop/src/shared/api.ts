/** Contrato entre el proceso principal, el preload y la interfaz. Solo tipos. */
import type {
  Ayuda,
  CampoPerfil,
  Confirmacion,
  Formulario,
  Fuente,
  Uso,
} from '@reforma-digital/agent';

export type { Ayuda, CampoPerfil, Confirmacion, Formulario, Fuente, Uso };

export type Razonamiento = 'low' | 'medium' | 'high';

export type Ajustes = {
  modelo: string;
  /** Pedir Touch ID antes de aprobar envíos, pagos y firmas. */
  touchIdEnConfirmaciones: boolean;
  /** Cargar la extensión de Reforma Digital en el navegador de los trámites (experimental). */
  interfacesComunitarias: boolean;
  /** Usar solo proveedores de IA que no guardan las peticiones (en Vercel exige el plan Pro). */
  retencionCero: boolean;
  /** Borrar las sesiones de las webs (cookies, inicios de sesión) al cerrar la app. */
  cerrarSesiones: boolean;
};

export type Pregunta =
  | { tipo: 'formulario'; formulario: Formulario }
  | { tipo: 'confirmacion'; confirmacion: Confirmacion }
  | { tipo: 'ayuda'; ayuda: Ayuda };

export type ItemConversacion =
  | { tipo: 'usuario'; id: string; texto: string; protegidos: number }
  | { tipo: 'asistente'; id: string; texto: string }
  | {
      tipo: 'actividad';
      id: string;
      herramienta: string;
      resumen: string;
      estado: 'inicio' | 'fin' | 'error';
      detalle?: string;
      /** Desde cuándo trabajaba el asistente en lo que llevó a esta acción, y cuándo terminó (ISO). */
      desde?: string;
      hasta?: string;
      /** Las webs que encontró. */
      fuentes?: string[];
    }
  | {
      tipo: 'pregunta';
      id: string;
      pregunta: Pregunta;
      estado: 'pendiente' | 'respondida' | 'cancelada';
      /** Resumen sin valores, para el historial: «Respondido», «Aprobado», «No aprobado». */
      resultado?: string;
    }
  | {
      tipo: 'aviso';
      id: string;
      tono: 'info' | 'error';
      texto: string;
      continuar?: boolean;
      /** Documento descargado al que lleva el aviso. */
      archivo?: string;
    };

export type EstadoEjecucion = 'inactivo' | 'trabajando' | 'esperando';

export type Descarga = { nombre: string; ruta: string };

export type ResumenTramite = {
  id: string;
  titulo: string;
  ejecucion: EstadoEjecucion;
  /**
   * `oferta`: espera a que la persona diga si el asistente lo hace por ella; `terminado`: acabó
   * con una respuesta.
   */
  aviso: 'oferta' | 'terminado' | null;
  fijado: boolean;
  razonamiento: Razonamiento;
  actualizado: string;
  costeUsd: number;
};

/** Una fuente como la ve la interfaz: sin su texto, que se queda en el proceso principal. */
export type FuenteVista = Omit<Fuente, 'texto'>;

export type TramiteVista = ResumenTramite & {
  fuentes: FuenteVista[];
  conversacion: ItemConversacion[];
  uso: Uso;
  descargas: Descarga[];
  navegador: { url: string; puedeVolver: boolean } | null;
};

export type DatoPerfil = { clave: string; guardado: boolean; vista: string };

export type EstadoApp = {
  version: string;
  ajustes: Ajustes;
  /** Temporal: el modelo de NaN Builders que usa el asistente (fijo), o `null` con Vercel AI Gateway. */
  modeloNan: string | null;
  tramites: ResumenTramite[];
  campos: readonly CampoPerfil[];
  perfil: DatoPerfil[];
  touchId: boolean;
  /** Avisos que salen de Mis datos, p. ej. un DNI a punto de caducar. */
  recordatorios: { texto: string; sugerencia: string }[];
};

export type Rect = { x: number; y: number; width: number; height: number };

export type EventoApp =
  | { tipo: 'estado'; estado: EstadoApp }
  | { tipo: 'tramite'; vista: TramiteVista }
  /** Atajos del menú de la app. */
  | { tipo: 'menu'; vista: 'inicio' | 'datos' | 'ajustes' };

/** Lo que el preload expone en `window.rd`. */
export type ApiRd = {
  estado(): Promise<EstadoApp>;
  guardarAjustes(a: Partial<Ajustes>): Promise<{ ok: true } | { ok: false; error: string }>;
  probarConexion(a: {
    modelo: string;
    retencionCero?: boolean;
  }): Promise<{ ok: boolean; error?: string }>;
  crearTramite(texto: string, razonamiento: Razonamiento): Promise<string>;
  /** Fija el trámite arriba de la lista o cambia cuánto piensa el asistente en él. */
  ajustarTramite(
    id: string,
    cambios: { fijado?: boolean; razonamiento?: Razonamiento },
  ): Promise<void>;
  verTramite(id: string): Promise<TramiteVista | null>;
  enviar(id: string, texto: string): Promise<void>;
  detener(id: string): Promise<void>;
  borrarTramite(id: string): Promise<void>;
  responder(
    id: string,
    preguntaId: string,
    respuesta: Record<string, string> | boolean | null,
  ): Promise<boolean>;
  /** `null` oculta el navegador del trámite. */
  colocarNavegador(id: string, rect: Rect | null): Promise<void>;
  navegar(id: string, accion: 'atras' | 'recargar'): Promise<void>;
  /** Abre una web en el navegador del trámite. */
  abrirEnTramite(id: string, url: string): Promise<void>;
  revelarPerfil(): Promise<Record<string, string> | null>;
  guardarPerfil(valores: Record<string, string>): Promise<Record<string, string>>;
  borrarDatos(que: 'perfil' | 'todo'): Promise<void>;
  abrirEnlace(url: string): Promise<void>;
  mostrarArchivo(ruta: string): Promise<void>;
  on(listener: (e: EventoApp) => void): () => void;
};
