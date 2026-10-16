/** Contrato entre el proceso principal, el preload y la interfaz. Solo tipos. */
import type {
  Ayuda,
  CampoPerfil,
  Confirmacion,
  Formulario,
  Fuente,
  Tarjeta,
  Uso,
} from '@reforma-digital/agent';

export type { Ayuda, CampoPerfil, Confirmacion, Formulario, Fuente, Tarjeta, Uso };

export type Razonamiento = 'low' | 'medium' | 'high';

export type Ajustes = {
  modelo: string;
  razonamiento: Razonamiento;
  /** Gasto máximo de un turno del asistente, en dólares. */
  limiteTurnoUsd: number;
  /** Pedir Touch ID antes de aprobar envíos, pagos y firmas. */
  touchIdEnConfirmaciones: boolean;
  /** Cargar la extensión de Reforma Digital en el navegador de los trámites (experimental). */
  interfacesComunitarias: boolean;
  /** Usar solo proveedores de IA que no guardan las peticiones (en Vercel exige el plan Pro). */
  retencionCero: boolean;
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
    }
  | {
      tipo: 'pregunta';
      id: string;
      pregunta: Pregunta;
      estado: 'pendiente' | 'respondida' | 'cancelada';
      /** Resumen sin valores, para el historial: «Respondido», «Aprobado», «No aprobado». */
      resultado?: string;
    }
  | { tipo: 'aviso'; id: string; tono: 'info' | 'error'; texto: string; continuar?: boolean };

export type EstadoEjecucion = 'inactivo' | 'trabajando' | 'esperando';

export type Descarga = { nombre: string; ruta: string };

export type ResumenTramite = {
  id: string;
  titulo: string;
  organismo?: string;
  estado: Tarjeta['estado'];
  ejecucion: EstadoEjecucion;
  actualizado: string;
  costeUsd: number;
};

export type TramiteVista = ResumenTramite & {
  tarjeta: Tarjeta;
  fuentes: Fuente[];
  conversacion: ItemConversacion[];
  uso: Uso;
  descargas: Descarga[];
  navegador: { url: string; puedeVolver: boolean } | null;
};

export type DatoPerfil = { clave: string; guardado: boolean; vista: string };

export type EstadoApp = {
  version: string;
  ajustes: Ajustes;
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
  crearTramite(texto: string): Promise<string>;
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
  /** Abre una web oficial en el navegador del trámite. */
  abrirEnTramite(id: string, url: string): Promise<void>;
  revelarPerfil(): Promise<Record<string, string> | null>;
  guardarPerfil(valores: Record<string, string>): Promise<Record<string, string>>;
  borrarDatos(que: 'perfil' | 'todo'): Promise<void>;
  abrirEnlace(url: string): Promise<void>;
  mostrarArchivo(ruta: string): Promise<void>;
  exportarCita(id: string): Promise<void>;
  on(listener: (e: EventoApp) => void): () => void;
};
