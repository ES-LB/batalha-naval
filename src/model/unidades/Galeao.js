'use strict';

const Unidade = require('./Unidade');

/** Nau capitânia da frota. */
class Galeao extends Unidade {
  static TIPO = 'GALEAO';

  getTipo() {
    return Galeao.TIPO;
  }

  getSimbolo() {
    return 'G';
  }

  getMensagemAfundamento() {
    return `O galeão ${this.getNome()} foi a pique levando o tesouro junto!`;
  }

  /** Sobrescreve o método virtual da classe base para destacar a nau capitânia. */
  getDescricao() {
    return `${super.getDescricao()} (capitânia)`;
  }
}

module.exports = Galeao;
