import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { app, Notification, session, type BrowserWindow } from 'electron';
import {
  crearProveedor,
  ejecutarTurno,
  LIMITES,
  estadoInicial,
  MARCADOR,
  type Anfitrion,
  type ConfigProveedor,
  type Detector,
  type EstadoAgente,
  type EventoAgente,
  type Perfil,
} from '@reforma-digital/agent';
import type {
  Descarga,
  EventoApp,
  ItemConversacion,
  Pregunta,
  Razonamiento,
  Rect,
  ResumenTramite,
  TramiteVista,
} from '../shared/api';
import type { Almacen } from './almacen';
import { interfacesComunitarias, leerConNavegador, NavegadorTramite, particion } from './navegador';

type Registro = {
  id: string;
  actualizado: string;
  estado: EstadoAgente;
  conversacion: ItemConversacion[];
  descargas: Descarga[];
};

export type Entorno = {
  perfil(): Perfil;
  guardarPerfil(valores: Perfil): Promise<void>;
  /** Configuración del proveedor, o `null` si la compilación no lleva la clave. */
  proveedor(): {
    cfg: ConfigProveedor;
    razonamiento: Razonamiento;
    limiteTurnoUsd: number;
  } | null;
  /** Touch ID para aprobar envíos; `true` si no está disponible o desactivado. */
  verificarIdentidad(motivo: string): Promise<boolean>;
  /** Detector local de datos personales; falla si el modelo no se puede cargar. */
  detector(): Promise<Detector>;
  /** Ruta de la extensión si la persona ha activado las interfaces comunitarias. */
  extension(): string | null;
  ventana(): BrowserWindow | null;
  emitir(e: EventoApp): void;
  alCambiarLista(): void;
};

/** Lo que queda en el historial de cada pregunta, sin valores. */
const RESULTADOS: Record<Pregunta['tipo'], [string, string]> = {
  formulario: ['Respondido', 'Sin responder'],
  confirmacion: ['Aprobado', 'No aprobado'],
  ayuda: ['Hecho', 'No has podido'],
};

type Espera = {
  tramite: string;
  resolver: (respuesta: Record<string, string> | boolean | null) => void;
};

const archivo = (id: string) => `tramite-${id}.bin`;
const ahora = () => new Date().toISOString();
/** Para lo que se ve fuera de la app (notificaciones, carpeta de descargas): sin datos. */
const sinMarcadores = (t: string) => t.replace(MARCADOR, '…');

/**
 * La persona ve en la app los datos que el asistente solo conoce como marcador ({{nombre_1}});
 * los de «Mis datos» siguen ocultos tras Touch ID.
 */
const mostrar = (r: Registro) => (t: string) =>
  t.replace(MARCADOR, (m, clave: string) => r.estado.datosTramite[clave] ?? m);

/** Una copia de `valor` (datos JSON) con `fn` aplicada a cada texto. */
const textos = <T>(valor: T, fn: (t: string) => string): T =>
  JSON.parse(JSON.stringify(valor), (_k, v: unknown) => (typeof v === 'string' ? fn(v) : v));

export class Tramites {
  private registros = new Map<string, Registro>();
  private ejecuciones = new Map<string, AbortController>();
  private esperas = new Map<string, Espera>();
  private navegadores = new Map<string, NavegadorTramite>();
  /** Lo que el agente ha escrito en cada navegador; vive en memoria, como sus sesiones. */
  private escritos = new Map<string, Map<string, string>>();
  private pendienteEmitir = new Set<string>();
  /** Última escritura de cada trámite: se encadenan para que una antigua no pise a otra nueva. */
  private escrituras = new Map<string, Promise<void>>();
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    private almacen: Almacen,
    private entorno: Entorno,
  ) {}

  async cargar() {
    for (const f of await this.almacen.lista('tramite-')) {
      const r = await this.almacen.leer<Registro>(f).catch(() => undefined);
      if (!r) continue;
      // Lo que esperaba respuesta cuando se cerró la app ya no tiene a nadie esperando.
      r.conversacion = r.conversacion.map((i) =>
        i.tipo === 'pregunta' && i.estado === 'pendiente'
          ? { ...i, estado: 'cancelada', resultado: 'Se cerró la app' }
          : i,
      );
      // Un turno que no terminó (la app se cerró mientras trabajaba) se puede retomar.
      const ultimo = r.conversacion.at(-1);
      if (ultimo && ultimo.tipo !== 'asistente' && ultimo.tipo !== 'aviso')
        r.conversacion.push({
          tipo: 'aviso',
          id: randomUUID(),
          tono: 'info',
          texto:
            'La app se cerró mientras el asistente trabajaba. Pulsa «Continuar» para retomarlo donde lo dejó.',
          continuar: true,
        });
      this.registros.set(r.id, r);
    }
  }

  lista(): ResumenTramite[] {
    return [...this.registros.values()]
      .map((r) => this.resumen(r))
      .sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  }

  private resumen(r: Registro): ResumenTramite {
    const esperando = [...this.esperas.values()].some((e) => e.tramite === r.id);
    return {
      id: r.id,
      titulo: mostrar(r)(r.estado.titulo || 'Nuevo trámite'),
      ejecucion: esperando ? 'esperando' : this.ejecuciones.has(r.id) ? 'trabajando' : 'inactivo',
      actualizado: r.actualizado,
      costeUsd: r.estado.uso.costeUsd,
    };
  }

  vista(id: string): TramiteVista | null {
    const r = this.registros.get(id);
    if (!r) return null;
    const nav = this.navegadores.get(id);
    return {
      ...this.resumen(r),
      // El texto de las páginas se queda en el proceso principal: la interfaz no lo necesita.
      fuentes: r.estado.fuentes.map(({ texto: _texto, ...f }) => f),
      conversacion: textos(r.conversacion, mostrar(r)),
      uso: r.estado.uso,
      descargas: r.descargas,
      navegador: nav
        ? {
            url: nav.url(),
            puedeVolver: nav.webContents.navigationHistory.canGoBack(),
          }
        : null,
    };
  }

  /** Agrupa los cambios rápidos (texto que llega a trozos) en un aviso cada 60 ms. */
  private cambio(id: string) {
    this.pendienteEmitir.add(id);
    if (this.temporizador) return;
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      for (const t of this.pendienteEmitir) {
        const v = this.vista(t);
        if (v) this.entorno.emitir({ tipo: 'tramite', vista: v });
      }
      this.pendienteEmitir.clear();
      this.entorno.alCambiarLista();
    }, 60);
  }

  private guardar(r: Registro) {
    r.actualizado = ahora();
    const escritura = (this.escrituras.get(r.id) ?? Promise.resolve())
      .catch(() => undefined)
      // Un turno que sigue después de borrar el trámite no debe volver a escribirlo en disco.
      .then(() =>
        this.registros.get(r.id) === r ? this.almacen.escribir(archivo(r.id), r) : undefined,
      );
    this.escrituras.set(r.id, escritura);
    return escritura;
  }

  async crear(texto: string): Promise<string> {
    const id = randomUUID();
    // El título lo pone el asistente: el mensaje puede llevar datos personales y el título se ve
    // en las notificaciones y nombra la carpeta de descargas.
    const r: Registro = {
      id,
      actualizado: ahora(),
      estado: estadoInicial(),
      conversacion: [],
      descargas: [],
    };
    this.registros.set(id, r);
    await this.guardar(r);
    await this.enviar(id, texto);
    return id;
  }

  async enviar(id: string, texto: string) {
    const r = this.registros.get(id);
    if (!r) throw new Error('Trámite no encontrado');
    if (this.ejecuciones.has(id)) throw new Error('El asistente sigue trabajando en este trámite');
    const config = this.entorno.proveedor();
    r.conversacion.push({ tipo: 'usuario', id: randomUUID(), texto, protegidos: 0 });
    if (!config) {
      r.conversacion.push({
        tipo: 'aviso',
        id: randomUUID(),
        tono: 'error',
        texto:
          'Esta compilación de la app no lleva la clave del asistente. Compílala con AI_GATEWAY_API_KEY.',
      });
      await this.guardar(r);
      this.cambio(id);
      return;
    }
    const control = new AbortController();
    this.ejecuciones.set(id, control);
    this.cambio(id);
    void this.ejecutar(r, texto, config, control)
      .catch(async (e: unknown) => {
        r.conversacion.push({
          tipo: 'aviso',
          id: randomUUID(),
          tono: 'error',
          texto: `No se ha podido guardar el trámite: ${e instanceof Error ? e.message : String(e)}`,
        });
        await this.guardar(r).catch(() => undefined);
      })
      .finally(() => {
        this.ejecuciones.delete(id);
        this.cambio(id);
      });
  }

  private preguntar(r: Registro, pregunta: Pregunta, signal: AbortSignal) {
    const id = randomUUID();
    const item: Extract<ItemConversacion, { tipo: 'pregunta' }> = {
      tipo: 'pregunta',
      id,
      pregunta,
      estado: 'pendiente',
    };
    r.conversacion.push(item);
    this.cambio(r.id);
    this.avisar(r, pregunta);
    return new Promise<Record<string, string> | boolean | null>((resolver, rechazar) => {
      const terminar = () => {
        this.esperas.delete(id);
        this.actualizarInsignia();
      };
      this.esperas.set(id, {
        tramite: r.id,
        resolver: (v) => {
          terminar();
          resolver(v);
        },
      });
      this.actualizarInsignia();
      signal.addEventListener(
        'abort',
        () => {
          if (!this.esperas.has(id)) return;
          terminar();
          Object.assign(item, { estado: 'cancelada', resultado: 'Cancelada' });
          rechazar(signal.reason);
        },
        { once: true },
      );
    });
  }

  /** La respuesta de la persona a una pregunta pendiente; `false` si sigue pendiente. */
  async responder(
    tramite: string,
    preguntaId: string,
    respuesta: Record<string, string> | boolean | null,
  ) {
    const espera = this.esperas.get(preguntaId);
    const r = this.registros.get(tramite);
    const item = r?.conversacion.find((i) => i.id === preguntaId);
    if (!espera || espera.tramite !== tramite || !r || item?.tipo !== 'pregunta') return true;
    // Si Touch ID se cancela o falla, la pregunta sigue pendiente: no es lo mismo que decir que no.
    if (
      item.pregunta.tipo === 'confirmacion' &&
      respuesta === true &&
      item.pregunta.confirmacion.tipo !== 'abrir_web' &&
      !(await this.entorno.verificarIdentidad(item.pregunta.confirmacion.accion))
    )
      return false;
    // Mientras Touch ID esperaba, el turno se ha podido detener o la pregunta responder.
    if (this.esperas.get(preguntaId) !== espera || item.estado !== 'pendiente') return true;
    const [si, no] = RESULTADOS[item.pregunta.tipo];
    Object.assign(item, { estado: 'respondida', resultado: respuesta ? si : no });
    espera.resolver(respuesta);
    this.cambio(tramite);
    return true;
  }

  private avisar(r: Registro, p: Pregunta) {
    this.notificar(
      r,
      p.tipo === 'formulario'
        ? p.formulario.titulo
        : p.tipo === 'confirmacion'
          ? `Pide tu permiso: ${p.confirmacion.accion}`
          : p.ayuda.instrucciones,
    );
  }

  /** Notificación del sistema solo si la ventana no está delante; al pulsarla, la trae. */
  private notificar(r: Registro, cuerpo: string) {
    const ventana = this.entorno.ventana();
    if (ventana?.isFocused() || !Notification.isSupported()) return;
    const n = new Notification({
      title: sinMarcadores(r.estado.titulo || 'Reforma Digital'),
      body: sinMarcadores(cuerpo),
    });
    n.on('click', () => {
      ventana?.show();
      ventana?.focus();
    });
    n.show();
  }

  private cargarExtension(nav: NavegadorTramite) {
    return interfacesComunitarias(nav.webContents.session, this.entorno.extension()).catch(
      () => undefined,
    );
  }

  private actualizarInsignia() {
    app.dock?.setBadge(this.esperas.size ? String(this.esperas.size) : '');
  }

  navegador(id: string): NavegadorTramite {
    let nav = this.navegadores.get(id);
    if (!nav) {
      const r = this.registros.get(id);
      nav = new NavegadorTramite(id, {
        ventana: () => this.entorno.ventana(),
        carpetaDescargas: () =>
          path.join(
            app.getPath('downloads'),
            'Reforma Digital',
            sinMarcadores(r?.estado.titulo || id)
              .replace(/[/\\:]/g, '-')
              .slice(0, 60),
          ),
        alCambiar: () => this.cambio(id),
        alDescargar: (d) => {
          r?.descargas.push(d);
          r?.conversacion.push({
            tipo: 'aviso',
            id: randomUUID(),
            tono: 'info',
            texto: `Descargado «${d.nombre}» en tu carpeta de Descargas.`,
            archivo: d.ruta,
          });
          if (r) void this.guardar(r).catch((e: unknown) => console.error(e));
          this.cambio(id);
        },
      });
      this.navegadores.set(id, nav);
      void this.cargarExtension(nav);
    }
    return nav;
  }

  colocarNavegador(id: string, rect: Rect | null) {
    const ventana = this.entorno.ventana();
    for (const [otro, nav] of this.navegadores)
      if (otro !== id && ventana) nav.colocar(ventana, null);
    if (!ventana) return;
    if (rect) this.navegador(id).colocar(ventana, rect);
    else this.navegadores.get(id)?.colocar(ventana, null);
    this.cambio(id);
  }

  private async ejecutar(
    r: Registro,
    texto: string,
    config: NonNullable<ReturnType<Entorno['proveedor']>>,
    control: AbortController,
  ) {
    let actual: Extract<ItemConversacion, { tipo: 'asistente' }> | null = null;
    // Las fuentes van debajo de la respuesta a la que sirvieron: las consultadas desde la anterior.
    // Se ponen al terminar el turno y antes de cada pregunta, para que se vean mientras espera.
    const respuestas: Extract<ItemConversacion, { tipo: 'asistente' }>[] = [];
    let desde = ahora();
    const marcarFuentes = () => {
      const ultima = respuestas.at(-1);
      const usadas = r.estado.fuentes.filter((f) => f.consultada >= desde).map((f) => f.id);
      if (!ultima || !usadas.length) return;
      ultima.fuentes = [...new Set([...(ultima.fuentes ?? []), ...usadas])];
      desde = ahora();
    };
    const anfitrion: Anfitrion = {
      perfil: () => this.entorno.perfil(),
      guardarPerfil: (v) => this.entorno.guardarPerfil(v),
      preguntar: async (formulario, signal) => {
        marcarFuentes();
        const v = await this.preguntar(r, { tipo: 'formulario', formulario }, signal);
        return v && typeof v === 'object' ? v : null;
      },
      confirmar: async (confirmacion, signal) => {
        marcarFuentes();
        return (await this.preguntar(r, { tipo: 'confirmacion', confirmacion }, signal)) === true;
      },
      pedirAyuda: async (ayuda, signal) => {
        marcarFuentes();
        const v = await this.preguntar(r, { tipo: 'ayuda', ayuda }, signal);
        return { hecho: v === true };
      },
      navegador: async () => this.navegador(r.id),
      leerConNavegador,
    };
    const evento = (e: EventoAgente) => {
      if (e.tipo === 'texto') {
        if (!actual) {
          actual = { tipo: 'asistente', id: randomUUID(), texto: '' };
          respuestas.push(actual);
          r.conversacion.push(actual);
        }
        actual.texto += e.delta;
      } else if (e.tipo === 'actividad') {
        actual = null;
        const previo = r.conversacion.find((i) => i.tipo === 'actividad' && i.id === e.id);
        const item: ItemConversacion = {
          tipo: 'actividad',
          id: e.id,
          herramienta: e.herramienta,
          resumen: e.resumen,
          estado: e.estado,
          ...(e.detalle ? { detalle: e.detalle } : {}),
        };
        if (previo) Object.assign(previo, item);
        else r.conversacion.push(item);
      } else if (e.tipo === 'protegidos') {
        const usuario = r.conversacion.findLast((i) => i.tipo === 'usuario');
        if (usuario) usuario.protegidos = e.cantidad;
      } else if (e.tipo === 'fuentes') r.estado.fuentes = e.fuentes;
      else if (e.tipo === 'uso') r.estado.uso = e.uso;
      this.cambio(r.id);
    };
    const escritos = this.escritos.get(r.id) ?? new Map<string, string>();
    this.escritos.set(r.id, escritos);
    let detector: Detector;
    try {
      detector = await this.entorno.detector();
    } catch (e) {
      r.conversacion.push({
        tipo: 'aviso',
        id: randomUUID(),
        tono: 'error',
        texto: `No se ha podido cargar la protección de datos personales, así que no se ha enviado nada al asistente. Reinstala la app si sigue pasando. (${e instanceof Error ? e.message : String(e)})`,
      });
      await this.guardar(r);
      return;
    }
    const resultado = await ejecutarTurno({
      proveedor: (guarda) => crearProveedor(config.cfg, guarda),
      detector,
      escritos,
      anfitrion,
      estado: r.estado,
      texto,
      evento,
      guardar: async (estado) => {
        r.estado = estado;
        await this.guardar(r);
      },
      signal: control.signal,
      limites: { ...LIMITES, costeUsd: config.limiteTurnoUsd },
      razonamiento: config.razonamiento,
    });
    r.estado = resultado.estado;
    marcarFuentes();
    const aviso = {
      limite_pasos:
        'He dado muchos pasos seguidos y me he parado para que lo revises. Pulsa «Continuar» si quieres que siga.',
      limite_coste:
        'He llegado al límite de gasto de este turno. Pulsa «Continuar» si quieres que siga.',
      cancelado: 'Has detenido al asistente.',
      error: resultado.error ?? 'Ha ocurrido un error.',
      respondido: '',
    }[resultado.fin];
    if (aviso)
      r.conversacion.push({
        tipo: 'aviso',
        id: randomUUID(),
        tono: resultado.fin === 'error' ? 'error' : 'info',
        texto: aviso,
        ...(resultado.fin === 'limite_pasos' || resultado.fin === 'limite_coste'
          ? { continuar: true }
          : {}),
      });
    await this.guardar(r);
    if (resultado.fin === 'respondido')
      this.notificar(r, 'El asistente ha terminado. Revisa la respuesta.');
  }

  detener(id: string) {
    this.ejecuciones.get(id)?.abort(new Error('Detenido por la persona'));
  }

  async borrar(id: string) {
    // Primero sale del registro: desde aquí ninguna escritura nueva lo vuelve a guardar.
    this.registros.delete(id);
    this.detener(id);
    const nav = this.navegadores.get(id);
    this.navegadores.delete(id);
    this.escritos.delete(id);
    await nav?.cerrar();
    await session.fromPartition(particion(id)).clearStorageData();
    await this.escrituras.get(id)?.catch(() => undefined);
    this.escrituras.delete(id);
    await this.almacen.borrar(archivo(id));
    this.entorno.alCambiarLista();
  }

  /** Aplica el ajuste de interfaces comunitarias a los navegadores ya abiertos. */
  async aplicarExtension() {
    for (const nav of this.navegadores.values()) await this.cargarExtension(nav);
  }

  registro(id: string) {
    return this.registros.get(id);
  }

  async borrarTodo() {
    for (const id of [...this.registros.keys()]) await this.borrar(id);
  }

  detenerTodo() {
    for (const c of this.ejecuciones.values()) c.abort(new Error('La app se cierra'));
  }
}
