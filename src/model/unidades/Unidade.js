'use strict';

const { ehTimeValido } = require('../constantes');

const METODOS_ABSTRATOS = ['getTipo', 'getSimbolo', 'getMensagemAfundamento'];

/**
 * Classe base ABSTRATA de todas as unidades do jogo (os 6 navios).
 *
 * JavaScript não tem a palavra-chave "abstract", então a regra é garantida no construtor:
 *  - `new Unidade(...)` lança erro (a classe não pode ser instanciada diretamente);
 *  - uma subclasse que não implementar os métodos abstratos também lança erro ao ser criada.
 *
 * Métodos ABSTRATOS (toda subclasse é obrigada a implementar):
 *   getTipo(), getSimbolo(), getMensagemAfundamento()
 *
 * Métodos VIRTUAIS (têm comportamento padrão e PODEM ser sobrescritos):
 *   getTamanho(), posicionar(), getPosicoes(), ocupa(), receberDisparo(),
 *   estaAfundada(), getDescricao()...
 *   Em JavaScript todo método de classe é virtual: a versão chamada é a da subclasse,
 *   se ela existir. O Galeao sobrescreve getDescricao() para mostrar isso.
 */
class Unidade {
  static TAMANHO = 3;

  #nome;
  #time;
  #origem = null;
  #orientacao = null;
  #avarias;

  constructor(nome, time) {
    if (new.target === Unidade) {
      throw new TypeError('Unidade é uma classe abstrata e não pode ser instanciada diretamente.');
    }
    for (const metodo of METODOS_ABSTRATOS) {
      if (this[metodo] === Unidade.prototype[metodo]) {
        throw new TypeError(`${new.target.name} precisa implementar o método abstrato ${metodo}().`);
      }
    }
    this.setNome(nome);
    this.setTime(time);
    this.#avarias = new Array(this.getTamanho()).fill(false);
  }

  // ------------------------------------------------------------ abstratos

  /** Código usado no arquivo de save para recriar o tipo certo de navio (ex.: "GALEAO"). */
  getTipo() {
    throw new Error('Método abstrato: getTipo()');
  }

  /** Letra que representa o navio no mapa do próprio dono. */
  getSimbolo() {
    throw new Error('Método abstrato: getSimbolo()');
  }

  /** Frase exibida quando o navio afunda. */
  getMensagemAfundamento() {
    throw new Error('Método abstrato: getMensagemAfundamento()');
  }

  // ------------------------------------------------------------ virtuais

  getTamanho() {
    return Unidade.TAMANHO;
  }

  /** Coloca o navio no mapa e zera as avarias. */
  posicionar(origem, orientacao) {
    if (!origem || !orientacao) {
      throw new Error('Origem e orientação são obrigatórias.');
    }
    this.#origem = origem;
    this.#orientacao = orientacao;
    this.#avarias.fill(false);
  }

  estaPosicionada() {
    return this.#origem !== null;
  }

  /** @returns {Coordenada[]} células ocupadas, da origem até a ponta */
  getPosicoes() {
    if (!this.estaPosicionada()) {
      return [];
    }
    const { passoLinha, passoColuna } = this.#orientacao;
    return Array.from({ length: this.getTamanho() }, (_, i) =>
      this.#origem.deslocar(i * passoLinha, i * passoColuna));
  }

  ocupa(coordenada) {
    return this.#indiceDe(coordenada) >= 0;
  }

  /** @returns {boolean} true se o disparo atingiu este navio */
  receberDisparo(alvo) {
    const i = this.#indiceDe(alvo);
    if (i < 0) {
      return false;
    }
    this.#avarias[i] = true;
    return true;
  }

  estaAvariadaEm(coordenada) {
    const i = this.#indiceDe(coordenada);
    return i >= 0 && this.#avarias[i];
  }

  estaAfundada() {
    return this.#avarias.every(Boolean);
  }

  contarAvarias() {
    return this.#avarias.filter(Boolean).length;
  }

  getDescricao() {
    const estado = this.estaAfundada()
      ? 'afundado'
      : `${this.contarAvarias()}/${this.getTamanho()} avariado`;
    return `${this.getNome()} [${this.getSimbolo()}] - ${estado}`;
  }

  toString() {
    return this.getDescricao();
  }

  // ------------------------------------------------------------ getters / setters

  getNome() {
    return this.#nome;
  }

  setNome(nome) {
    if (typeof nome !== 'string' || nome.trim() === '') {
      throw new Error('O navio precisa de um nome.');
    }
    this.#nome = nome.trim();
  }

  getTime() {
    return this.#time;
  }

  setTime(time) {
    if (!ehTimeValido(time)) {
      throw new Error(`Time inválido: ${time}`);
    }
    this.#time = time;
  }

  getOrigem() {
    return this.#origem;
  }

  getOrientacao() {
    return this.#orientacao;
  }

  /** @returns {boolean[]} cópia das avarias (uma posição por segmento) */
  getAvarias() {
    return [...this.#avarias];
  }

  /** Restaura as avarias (usado pelo leitor do arquivo de save). */
  setAvarias(avarias) {
    if (!Array.isArray(avarias) || avarias.length !== this.getTamanho()) {
      throw new Error(`O navio tem ${this.getTamanho()} segmentos de avaria.`);
    }
    this.#avarias = avarias.map(Boolean);
  }

  // ------------------------------------------------------------ auxiliares

  #indiceDe(coordenada) {
    if (!coordenada) {
      return -1;
    }
    return this.getPosicoes().findIndex((p) => p.igual(coordenada));
  }
}

module.exports = Unidade;
