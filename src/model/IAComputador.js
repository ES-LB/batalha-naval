'use strict';

const Unidade = require('./unidades/Unidade');
const { EstadoCelula } = require('./constantes');

const DIRECOES = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/**
 * Decide onde o computador atira. Funciona em três modos:
 *  1. Alinhar: com dois acertos vizinhos num navio ainda flutuando, continua na mesma linha.
 *  2. Cercar: com um acerto isolado, atira nas células vizinhas.
 *  3. Caçar: sem pistas, atira nas diagonais em que (linha + coluna) é múltiplo de 3.
 *     Todo navio 3x1 passa por uma delas, então a IA cobre o mar com 1/3 dos tiros.
 *
 * A IA só consulta o que é visível (água / acerto / afundado), então não trapaceia.
 * Como não guarda estado próprio, nada dela precisa ir para o arquivo de save.
 */
class IAComputador {
  /** @param {() => number} sorteio função que devolve um número em [0, 1) */
  constructor(sorteio = Math.random) {
    this.sorteio = sorteio;
  }

  escolherAlvo(marInimigo) {
    const acertos = this.#celulasCom(marInimigo, EstadoCelula.ACERTO);
    const estrategias = [
      () => this.#alvosEmLinha(marInimigo, acertos),
      () => this.#vizinhosDesconhecidos(marInimigo, acertos),
      () => this.#alvosDeCaca(marInimigo),
      () => this.#celulasCom(marInimigo, EstadoCelula.DESCONHECIDO),
    ];
    for (const estrategia of estrategias) {
      const candidatos = estrategia();
      if (candidatos.length > 0) {
        return candidatos[Math.floor(this.sorteio() * candidatos.length)];
      }
    }
    throw new Error('Não há mais células para atirar.');
  }

  #alvosEmLinha(mar, acertos) {
    const alvos = [];
    for (const a of acertos) {
      for (const [dl, dc] of DIRECOES) {
        const vizinho = a.deslocar(dl, dc);
        if (!mar.dentro(vizinho) || mar.getEstado(vizinho) !== EstadoCelula.ACERTO) {
          continue;
        }
        // a e vizinho formam uma linha: segue nessa direção até passar dos acertos
        let ponta = vizinho;
        while (mar.dentro(ponta) && mar.getEstado(ponta) === EstadoCelula.ACERTO) {
          ponta = ponta.deslocar(dl, dc);
        }
        IAComputador.#adicionarSeDesconhecido(mar, alvos, ponta);
      }
    }
    return alvos;
  }

  #vizinhosDesconhecidos(mar, acertos) {
    const alvos = [];
    for (const a of acertos) {
      for (const [dl, dc] of DIRECOES) {
        IAComputador.#adicionarSeDesconhecido(mar, alvos, a.deslocar(dl, dc));
      }
    }
    return alvos;
  }

  #alvosDeCaca(mar) {
    return this.#celulasCom(mar, EstadoCelula.DESCONHECIDO)
      .filter((c) => (c.linha + c.coluna) % Unidade.TAMANHO === 0);
  }

  #celulasCom(mar, estado) {
    return [...mar.celulas()].filter((c) => mar.getEstado(c) === estado);
  }

  static #adicionarSeDesconhecido(mar, lista, c) {
    if (mar.dentro(c) && mar.getEstado(c) === EstadoCelula.DESCONHECIDO && !lista.some((x) => x.igual(c))) {
      lista.push(c);
    }
  }
}

module.exports = IAComputador;
