'use strict';

const readline = require('readline');

/** Lançado quando a entrada é fechada (Ctrl+D / Ctrl+C / fim do arquivo), para sair sem erro. */
class EntradaEncerradaError extends Error {
  constructor() {
    super('Entrada encerrada pelo usuário.');
    this.name = 'EntradaEncerradaError';
  }
}

/**
 * Lê linhas do teclado. Guarda numa fila as linhas que chegam antes de serem pedidas,
 * o que permite também rodar o jogo com entrada redirecionada de um arquivo (útil em testes).
 */
class EntradaConsole {
  #saida;
  #rl;
  #fila = [];
  #esperando = null;
  #fechada = false;

  constructor(entrada = process.stdin, saida = process.stdout) {
    this.#saida = saida;
    this.#rl = readline.createInterface({ input: entrada, terminal: false });
    this.#rl.on('line', (linha) => {
      if (this.#esperando) {
        const { resolver } = this.#esperando;
        this.#esperando = null;
        resolver(linha);
      } else {
        this.#fila.push(linha);
      }
    });
    this.#rl.on('close', () => {
      this.#fechada = true;
      if (this.#esperando) {
        const { rejeitar } = this.#esperando;
        this.#esperando = null;
        rejeitar(new EntradaEncerradaError());
      }
    });
  }

  /** Mostra o prompt e devolve a linha digitada, sem espaços nas pontas. */
  async ler(prompt) {
    this.#saida.write(prompt);
    if (this.#fila.length > 0) {
      return this.#fila.shift().trim();
    }
    if (this.#fechada) {
      throw new EntradaEncerradaError();
    }
    const linha = await new Promise((resolver, rejeitar) => {
      this.#esperando = { resolver, rejeitar };
    });
    return linha.trim();
  }

  fechar() {
    this.#rl.close();
  }
}

module.exports = { EntradaConsole, EntradaEncerradaError };
