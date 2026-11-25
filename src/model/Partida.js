'use strict';

const { Time, adversario, consomeTurno } = require('./constantes');

/**
 * Estado e regras de uma partida: de quem é a vez, os dois mares e quem venceu.
 * Não lê teclado nem escreve na tela (isso é papel do Controller e da View).
 */
class Partida {
  #nomeJogador;
  #turno;
  #mares;
  #vencedor = null;

  constructor({ nomeJogador, turno = Time.JOGADOR, marJogador, marComputador }) {
    this.#nomeJogador = nomeJogador;
    this.#turno = turno;
    this.#mares = { [Time.JOGADOR]: marJogador, [Time.COMPUTADOR]: marComputador };
  }

  getNomeJogador() {
    return this.#nomeJogador;
  }

  getTurno() {
    return this.#turno;
  }

  marDo(time) {
    return this.#mares[time];
  }

  getVencedor() {
    return this.#vencedor;
  }

  estaTerminada() {
    return this.#vencedor !== null;
  }

  /**
   * Quem está na vez dispara contra o mar do adversário (1 disparo por turno).
   * Se o disparo for válido, a vez passa para o outro lado.
   *
   * @returns {{atirador: string, alvo, resultado: string, atingida, vencedor: string|null}}
   */
  disparar(alvo) {
    if (this.estaTerminada()) {
      throw new Error('A partida já terminou.');
    }
    const atirador = this.#turno;
    const disparo = this.marDo(adversario(atirador)).receberDisparo(alvo);
    if (consomeTurno(disparo.resultado)) {
      if (this.marDo(adversario(atirador)).todasAfundadas()) {
        this.#vencedor = atirador;
      } else {
        this.#turno = adversario(atirador);
      }
    }
    return { atirador, ...disparo, vencedor: this.#vencedor };
  }
}

module.exports = Partida;
