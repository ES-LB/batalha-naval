'use strict';

const Coordenada = require('./Coordenada');
const Unidade = require('./unidades/Unidade');
const { Orientacao, EstadoCelula, ResultadoDisparo } = require('./constantes');

/** Mar de um dos lados: guarda os navios do dono e o registro dos disparos que recebeu. */
class Tabuleiro {
  static TAMANHO_PADRAO = 8;

  #tamanho;
  #unidades = [];
  #estados;

  constructor(tamanho = Tabuleiro.TAMANHO_PADRAO) {
    if (!Number.isInteger(tamanho) || tamanho < Unidade.TAMANHO || tamanho > 26) {
      throw new Error(`Tamanho de tabuleiro inválido: ${tamanho}`);
    }
    this.#tamanho = tamanho;
    this.#estados = Array.from({ length: tamanho }, () => new Array(tamanho).fill(EstadoCelula.DESCONHECIDO));
  }

  getTamanho() {
    return this.#tamanho;
  }

  dentro(c) {
    return c instanceof Coordenada
      && c.linha >= 0 && c.linha < this.#tamanho
      && c.coluna >= 0 && c.coluna < this.#tamanho;
  }

  /** Percorre todas as células, linha por linha. */
  * celulas() {
    for (let l = 0; l < this.#tamanho; l++) {
      for (let c = 0; c < this.#tamanho; c++) {
        yield new Coordenada(l, c);
      }
    }
  }

  // ------------------------------------------------------------ posicionamento

  /** O navio caberia aqui sem sair do mapa nem ficar em cima de outro? */
  podePosicionar(unidade, origem, orientacao) {
    for (let i = 0; i < unidade.getTamanho(); i++) {
      const c = origem.deslocar(i * orientacao.passoLinha, i * orientacao.passoColuna);
      if (!this.dentro(c)) {
        return false;
      }
      const outra = this.unidadeEm(c);
      if (outra && outra !== unidade) {
        return false;
      }
    }
    return true;
  }

  posicionar(unidade, origem, orientacao) {
    if (!this.podePosicionar(unidade, origem, orientacao)) {
      throw new Error(`Posição inválida para ${unidade.getNome()}.`);
    }
    unidade.posicionar(origem, orientacao);
    if (!this.#unidades.includes(unidade)) {
      this.#unidades.push(unidade);
    }
  }

  /** Adiciona um navio que já vem posicionado (e talvez avariado) do arquivo de save. */
  adicionarPosicionada(unidade) {
    if (!unidade.estaPosicionada()) {
      throw new Error(`${unidade.getNome()} não tem posição definida.`);
    }
    if (!this.podePosicionar(unidade, unidade.getOrigem(), unidade.getOrientacao())) {
      throw new Error(`${unidade.getNome()} sai do mapa ou se sobrepõe a outro navio.`);
    }
    this.#unidades.push(unidade);
  }

  /** @param {() => number} sorteio função que devolve um número em [0, 1) */
  posicionarAleatoriamente(frota, sorteio = Math.random) {
    const orientacoes = Object.values(Orientacao);
    const aleatorio = (n) => Math.floor(sorteio() * n);
    for (const unidade of frota) {
      let origem;
      let orientacao;
      do {
        origem = new Coordenada(aleatorio(this.#tamanho), aleatorio(this.#tamanho));
        orientacao = orientacoes[aleatorio(orientacoes.length)];
      } while (!this.podePosicionar(unidade, origem, orientacao));
      this.posicionar(unidade, origem, orientacao);
    }
  }

  // ------------------------------------------------------------ combate

  /** @returns {{alvo: Coordenada, resultado: string, atingida: Unidade|null}} */
  receberDisparo(alvo) {
    if (!this.dentro(alvo)) {
      return { alvo, resultado: ResultadoDisparo.FORA_DO_MAPA, atingida: null };
    }
    if (this.getEstado(alvo) !== EstadoCelula.DESCONHECIDO) {
      return { alvo, resultado: ResultadoDisparo.REPETIDO, atingida: null };
    }
    const atingida = this.unidadeEm(alvo);
    if (!atingida) {
      this.setEstado(alvo, EstadoCelula.AGUA);
      return { alvo, resultado: ResultadoDisparo.AGUA, atingida: null };
    }
    atingida.receberDisparo(alvo);
    if (atingida.estaAfundada()) {
      atingida.getPosicoes().forEach((c) => this.setEstado(c, EstadoCelula.AFUNDADO));
      return { alvo, resultado: ResultadoDisparo.AFUNDOU, atingida };
    }
    this.setEstado(alvo, EstadoCelula.ACERTO);
    return { alvo, resultado: ResultadoDisparo.ACERTO, atingida };
  }

  todasAfundadas() {
    return this.#unidades.length > 0 && this.#unidades.every((u) => u.estaAfundada());
  }

  contarNaviosAtivos() {
    return this.#unidades.filter((u) => !u.estaAfundada()).length;
  }

  // ------------------------------------------------------------ consultas

  /** Estado visível para o adversário. */
  getEstado(c) {
    return this.#estados[c.linha][c.coluna];
  }

  setEstado(c, estado) {
    if (!this.dentro(c) || !Object.values(EstadoCelula).includes(estado)) {
      throw new Error('Célula ou estado inválido.');
    }
    this.#estados[c.linha][c.coluna] = estado;
  }

  unidadeEm(c) {
    return this.#unidades.find((u) => u.ocupa(c)) ?? null;
  }

  getUnidades() {
    return [...this.#unidades];
  }

  /**
   * Confere se a grade de disparos bate com as avarias dos navios.
   * Serve para recusar saves corrompidos ou editados à mão.
   */
  verificarConsistencia() {
    for (const c of this.celulas()) {
      const estado = this.getEstado(c);
      const u = this.unidadeEm(c);
      if (!u) {
        if (estado !== EstadoCelula.DESCONHECIDO && estado !== EstadoCelula.AGUA) {
          throw new Error(`Célula ${c} marcada como acerto, mas não há navio nela.`);
        }
        continue;
      }
      let esperado = EstadoCelula.DESCONHECIDO;
      if (u.estaAvariadaEm(c)) {
        esperado = u.estaAfundada() ? EstadoCelula.AFUNDADO : EstadoCelula.ACERTO;
      }
      if (estado !== esperado) {
        throw new Error(`Célula ${c} está como '${estado}', mas as avarias de ${u.getNome()} indicam '${esperado}'.`);
      }
    }
  }
}

module.exports = Tabuleiro;
