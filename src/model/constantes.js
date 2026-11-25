'use strict';

/** Lado ao qual uma unidade pertence. */
const Time = Object.freeze({
  JOGADOR: 'JOGADOR',
  COMPUTADOR: 'COMPUTADOR',
});

function adversario(time) {
  return time === Time.JOGADOR ? Time.COMPUTADOR : Time.JOGADOR;
}

function ehTimeValido(valor) {
  return Object.values(Time).includes(valor);
}

/** Direção em que uma unidade se estende a partir da sua origem. */
const Orientacao = Object.freeze({
  HORIZONTAL: Object.freeze({ sigla: 'H', passoLinha: 0, passoColuna: 1 }),
  VERTICAL: Object.freeze({ sigla: 'V', passoLinha: 1, passoColuna: 0 }),
});

/** @returns a orientação da sigla H ou V, ou null se o texto for inválido */
function orientacaoPorSigla(texto) {
  const sigla = String(texto ?? '').trim().toUpperCase();
  return Object.values(Orientacao).find((o) => o.sigla === sigla) ?? null;
}

/**
 * O que o ADVERSÁRIO sabe sobre uma célula. O valor é o próprio caractere gravado no save.
 * A IA só consulta isso, então não "trapaceia".
 */
const EstadoCelula = Object.freeze({
  DESCONHECIDO: '.',
  AGUA: 'o',
  ACERTO: 'X',
  AFUNDADO: '#',
});

function ehEstadoValido(caractere) {
  return Object.values(EstadoCelula).includes(caractere);
}

/** O que aconteceu com um disparo. */
const ResultadoDisparo = Object.freeze({
  AGUA: 'AGUA',
  ACERTO: 'ACERTO',
  AFUNDOU: 'AFUNDOU',
  REPETIDO: 'REPETIDO', // célula já alvejada: o turno não é gasto
  FORA_DO_MAPA: 'FORA_DO_MAPA', // coordenada inválida: o turno não é gasto
});

function consomeTurno(resultado) {
  return [ResultadoDisparo.AGUA, ResultadoDisparo.ACERTO, ResultadoDisparo.AFUNDOU].includes(resultado);
}

module.exports = {
  Time,
  adversario,
  ehTimeValido,
  Orientacao,
  orientacaoPorSigla,
  EstadoCelula,
  ehEstadoValido,
  ResultadoDisparo,
  consomeTurno,
};
