'use strict';

const { Time } = require('../constantes');
const Galeao = require('./Galeao');
const Fragata = require('./Fragata');
const Escuna = require('./Escuna');

/** Quantidade de navios por time. */
const NAVIOS_POR_TIME = 3;

const CLASSES_POR_TIPO = {
  [Galeao.TIPO]: Galeao,
  [Fragata.TIPO]: Fragata,
  [Escuna.TIPO]: Escuna,
};

/** Cria uma unidade a partir do código de tipo gravado no save. */
function criarUnidade(tipo, nome, time) {
  const Classe = CLASSES_POR_TIPO[String(tipo ?? '').trim().toUpperCase()];
  if (!Classe) {
    throw new Error(`Tipo de unidade desconhecido: ${tipo}`);
  }
  return new Classe(nome, time);
}

/** Frota inicial (ainda sem posição) de um time. */
function criarFrota(time) {
  if (time === Time.JOGADOR) {
    return [
      new Galeao('Vingança da Rainha', time),
      new Fragata('Corvo Negro', time),
      new Escuna('Maré Alta', time),
    ];
  }
  return [
    new Galeao('Coroa de Ferro', time),
    new Fragata('Leão dos Mares', time),
    new Escuna('Sentinela', time),
  ];
}

module.exports = { NAVIOS_POR_TIME, criarUnidade, criarFrota };
