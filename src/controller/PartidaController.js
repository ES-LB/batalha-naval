'use strict';

const Coordenada = require('../model/Coordenada');
const { Time, EstadoCelula } = require('../model/constantes');

const NOME_COMPUTADOR = 'Marinha Real';

/** Resultado de uma partida, do ponto de vista do jogador. */
const Desfecho = Object.freeze({
  VITORIA: 'VITORIA',
  DERROTA: 'DERROTA',
  INTERROMPIDA: 'INTERROMPIDA',
});

/**
 * CONTROLLER do laço de turnos: lê o comando do jogador, pede o alvo à IA,
 * aplica o disparo no Model (Partida) e manda a View mostrar o resultado.
 */
class PartidaController {
  constructor({ partida, view, entrada, perguntas, ia, gravador, caminhoSave }) {
    this.partida = partida;
    this.view = view;
    this.entrada = entrada;
    this.perguntas = perguntas;
    this.ia = ia;
    this.gravador = gravador;
    this.caminhoSave = caminhoSave;
  }

  async executar() {
    const marJogador = this.partida.marDo(Time.JOGADOR);
    const marComputador = this.partida.marDo(Time.COMPUTADOR);

    while (!this.partida.estaTerminada()) {
      let alvo;
      if (this.partida.getTurno() === Time.JOGADOR) {
        this.view.desenharMares(marJogador, marComputador);
        this.view.placar(marJogador, marComputador);
        const comando = await this.#lerComandoDoJogador(marComputador);
        if (comando.tipo === 'SALVAR') {
          this.#salvar();
          continue; // salvar não gasta o turno
        }
        if (comando.tipo === 'SAIR') {
          if (await this.#sairConfirmado()) {
            return Desfecho.INTERROMPIDA;
          }
          continue;
        }
        alvo = comando.alvo;
      } else {
        alvo = this.ia.escolherAlvo(marJogador);
      }
      this.view.narrarDisparo(this.partida.disparar(alvo), NOME_COMPUTADOR);
    }

    const vitoria = this.partida.getVencedor() === Time.JOGADOR;
    this.view.desenharMares(marJogador, marComputador, true);
    this.view.fimDeJogo(vitoria, NOME_COMPUTADOR);
    return vitoria ? Desfecho.VITORIA : Desfecho.DERROTA;
  }

  /** @returns {Promise<{tipo: 'DISPARAR'|'SALVAR'|'SAIR', alvo?: Coordenada}>} */
  async #lerComandoDoJogador(marInimigo) {
    const nome = this.partida.getNomeJogador();
    for (;;) {
      const texto = (await this.entrada.ler(`Sua vez, ${nome}! Alvo (ex: B5) | S = salvar | Q = sair: `)).toUpperCase();
      if (texto === 'S') {
        return { tipo: 'SALVAR' };
      }
      if (texto === 'Q') {
        return { tipo: 'SAIR' };
      }
      const alvo = Coordenada.interpretar(texto);
      if (!alvo || !marInimigo.dentro(alvo)) {
        const ultimaLetra = String.fromCharCode(64 + marInimigo.getTamanho());
        this.view.mostrar(`Coordenada inválida. Use uma letra de A a ${ultimaLetra} e um número de 1 a ${marInimigo.getTamanho()}.`);
        continue;
      }
      if (marInimigo.getEstado(alvo) !== EstadoCelula.DESCONHECIDO) {
        this.view.mostrar(`Você já atirou em ${alvo}. Escolha outro alvo.`);
        continue;
      }
      return { tipo: 'DISPARAR', alvo };
    }
  }

  #salvar() {
    try {
      this.gravador.salvar(this.caminhoSave, this.partida);
      this.view.mostrar(`Jogo salvo em ${this.caminhoSave}.`);
      return true;
    } catch (erro) {
      this.view.mostrar(`Não foi possível salvar o jogo: ${erro.message}`);
      return false;
    }
  }

  async #sairConfirmado() {
    if (!(await this.perguntas.confirmar('Deseja salvar antes de sair?'))) {
      return true;
    }
    if (this.#salvar()) {
      return true;
    }
    this.view.mostrar('Como o jogo não foi salvo, a partida continua.');
    return false;
  }
}

module.exports = { PartidaController, Desfecho };
