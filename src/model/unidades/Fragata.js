'use strict';

const Unidade = require('./Unidade');

/** Navio de guerra rápido. */
class Fragata extends Unidade {
  static TIPO = 'FRAGATA';

  getTipo() {
    return Fragata.TIPO;
  }

  getSimbolo() {
    return 'F';
  }

  getMensagemAfundamento() {
    return `A fragata ${this.getNome()} partiu ao meio e afundou!`;
  }
}

module.exports = Fragata;
