'use strict';

/**
 * Posição imutável no tabuleiro. Linha e coluna começam em 0.
 * Na tela a coluna aparece como letra (A, B, C...) e a linha como número (1, 2, 3...).
 */
class Coordenada {
  constructor(linha, coluna) {
    if (!Number.isInteger(linha) || !Number.isInteger(coluna)) {
      throw new TypeError('Linha e coluna devem ser números inteiros.');
    }
    this.linha = linha;
    this.coluna = coluna;
    Object.freeze(this);
  }

  /**
   * Converte "B5" (ou "b5") em coordenada.
   * @returns {Coordenada|null} null se o texto não estiver no formato letra + número
   */
  static interpretar(texto) {
    const t = String(texto ?? '').trim().toUpperCase();
    const partes = /^([A-Z])(\d{1,2})$/.exec(t);
    if (!partes) {
      return null;
    }
    return new Coordenada(Number(partes[2]) - 1, partes[1].charCodeAt(0) - 65);
  }

  deslocar(dLinha, dColuna) {
    return new Coordenada(this.linha + dLinha, this.coluna + dColuna);
  }

  igual(outra) {
    return outra instanceof Coordenada && outra.linha === this.linha && outra.coluna === this.coluna;
  }

  toString() {
    return String.fromCharCode(65 + this.coluna) + (this.linha + 1);
  }
}

module.exports = Coordenada;
