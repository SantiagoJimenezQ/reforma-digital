import { describe, expect, it } from 'vitest';
import { conFuentesDelTurno } from '../apps/desktop/src/shared/fuentes';
import type { Fuente, ItemConversacion } from '../apps/desktop/src/shared/api';

const fuente: Fuente = {
  id: 'F1',
  url: 'https://www.boe.es/prueba',
  titulo: 'Información de prueba',
  origen: 'busqueda',
  oficial: true,
};
const usuario: ItemConversacion = { tipo: 'usuario', id: 'u1', texto: 'Consulta', protegidos: 0 };
const busqueda: ItemConversacion = {
  tipo: 'actividad',
  id: 'b1',
  herramienta: 'buscar',
  resumen: 'Ha buscado',
  estado: 'fin',
  fuentes: ['F1'],
  consultadas: [fuente],
};
const respuesta: ItemConversacion = { tipo: 'asistente', id: 'a1', texto: 'Respuesta de prueba' };

describe('fuentes de la respuesta del trámite', () => {
  it('las muestra mientras espera una tarjeta, sin modificar el historial guardado', () => {
    const conversacion: ItemConversacion[] = [
      usuario,
      busqueda,
      respuesta,
      {
        tipo: 'pregunta',
        id: 'p1',
        estado: 'pendiente',
        pregunta: {
          tipo: 'formulario',
          formulario: {
            titulo: 'Consulta de prueba',
            accion: 'Pedir la cita',
            campos: [{ clave: 'municipio', etiqueta: 'Municipio', tipo: 'texto' }],
          },
        },
      },
    ];
    expect(conFuentesDelTurno(conversacion, [fuente], false)[2]).toMatchObject({
      fuentes: [fuente],
    });
    expect(respuesta).not.toHaveProperty('fuentes');
    expect(
      conFuentesDelTurno([usuario, busqueda, respuesta], [fuente], true)[2],
    ).not.toHaveProperty('fuentes');
    // La respuesta anterior sigue teniendo fuentes cuando el asistente retoma la tarjeta.
    expect(conFuentesDelTurno(conversacion, [fuente], true)[2]).toMatchObject({
      fuentes: [fuente],
    });
  });

  it('recupera las fuentes registradas en historiales cancelados sin inventar otras', () => {
    const antigua = { ...busqueda };
    delete antigua.consultadas;
    const otra: Fuente = { ...fuente, id: 'F2', url: 'https://example.com/otra' };
    const conversacion: ItemConversacion[] = [
      usuario,
      antigua,
      respuesta,
      {
        tipo: 'aviso',
        id: 'aviso',
        tono: 'info',
        texto: 'Has detenido al asistente.',
      },
    ];
    // Que la web se leyera después no convierte esta búsqueda histórica en una lectura.
    const vista = conFuentesDelTurno(conversacion, [{ ...fuente, origen: 'pagina' }, otra], false);
    expect(vista[2]).toMatchObject({ fuentes: [fuente] });
  });

  it('incluye las fuentes posteriores a una tarjeta aunque termine sin otro texto', () => {
    const otra: Fuente = { ...fuente, id: 'F2', url: 'https://www.boe.es/otra' };
    const conversacion: ItemConversacion[] = [
      usuario,
      busqueda,
      respuesta,
      {
        tipo: 'pregunta',
        id: 'p1',
        estado: 'respondida',
        pregunta: { tipo: 'confianza', web: 'example.com' },
        resultado: 'Aprobado',
      },
      { ...busqueda, id: 'b2', fuentes: [otra.id], consultadas: [otra] },
      { tipo: 'aviso', id: 'aviso', tono: 'info', texto: 'Has detenido al asistente.' },
    ];
    expect(conFuentesDelTurno(conversacion, [fuente, otra], false)[2]).toMatchObject({
      fuentes: [fuente, otra],
    });
    expect(respuesta).not.toHaveProperty('fuentes');
    // Las fuentes ya guardadas de una respuesta conservan su instantánea.
    conversacion[2] = { ...respuesta, fuentes: [fuente] };
    expect(conFuentesDelTurno(conversacion, [fuente, otra], false)[2]).toMatchObject({
      fuentes: [fuente],
    });
  });

  it('deduplica y separa turnos, conserva las lecturas y no añade fuentes a una respuesta sin consultas', () => {
    const lectura: Fuente = { ...fuente, origen: 'pagina' };
    const conversacion: ItemConversacion[] = [
      usuario,
      busqueda,
      { ...busqueda, id: 'l1', herramienta: 'leer_pagina', consultadas: [lectura] },
      respuesta,
      { ...usuario, id: 'u2' },
      { ...busqueda, id: 'b2' },
      { ...respuesta, id: 'a2' },
      { ...usuario, id: 'u3' },
      { ...respuesta, id: 'a3' },
    ];
    const vista = conFuentesDelTurno(conversacion, [lectura], false);
    expect(vista[3]).toMatchObject({ fuentes: [lectura] });
    expect(vista[6]).toMatchObject({ fuentes: [fuente] });
    expect(vista[8]).not.toHaveProperty('fuentes');
    expect(conFuentesDelTurno(conversacion, [lectura], true)[3]).toMatchObject({
      fuentes: [lectura],
    });
  });
});
