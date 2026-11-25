'use strict';

const Unidade = require('./Unidade');

/** Embarcação leve de dois mastros. */
class Escuna extends Unidade {
  static TIPO = 'ESCUNA';

  getTipo() {
    return Escuna.TIPO;
  }

  getSimbolo() {
    return 'E';
  }

  getMensagemAfundamento() {
    return `A escuna ${this.getNome()} virou e sumiu nas ondas!`;
  }
}

module.exports = Escuna;
