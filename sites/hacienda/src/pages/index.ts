import { asistenciaPage } from './asistencia/page';
import { catalogoPage } from './catalogo/page';

/**
 * Pantallas públicas de «Asistencia y Cita». La identificación (NIF y nombre) y los pasos
 * siguientes no tienen pantalla registrada: conservan la interfaz original.
 */
export const pages = [asistenciaPage, catalogoPage];
