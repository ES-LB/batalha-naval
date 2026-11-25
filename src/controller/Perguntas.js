'use strict';

/** Perguntas que se repetem até o usuário dar uma resposta válida. */
class Perguntas {
  constructor(view, entrada) {
    this.view = view;
    this.entrada = entrada;
  }

  /** Lê uma opção numérica entre min e max (inclusive). */
  async opcao(prompt, min, max) {
    for (;;) {
      const resposta = await this.entrada.ler(prompt);
      if (/^\d+$/.test(resposta)) {
        const valor = Number(resposta);
        if (valor >= min && valor <= max) {
          return valor;
        }
      }
      this.view.mostrar(`Digite um número de ${min} a ${max}.`);
    }
  }

  /** Pergunta sim/não. */
  async confirmar(pergunta) {
    for (;;) {
      const resposta = (await this.entrada.ler(`${pergunta} (S/N): `)).toUpperCase();
      if (['S', 'SIM'].includes(resposta)) {
        return true;
      }
      if (['N', 'NAO', 'NÃO'].includes(resposta)) {
        return false;
      }
      this.view.mostrar('Responda S ou N.');
    }
  }
}

module.exports = Perguntas;
