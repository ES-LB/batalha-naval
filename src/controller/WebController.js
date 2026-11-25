'use strict';

const fs = require('fs');
const path = require('path');
const Coordenada = require('../model/Coordenada');
const Tabuleiro = require('../model/Tabuleiro');
const Partida = require('../model/Partida');
const IAComputador = require('../model/IAComputador');
const { Time, EstadoCelula, orientacaoPorSigla } = require('../model/constantes');
const { criarFrota } = require('../model/unidades/FabricaUnidades');
const GravadorJogo = require('../model/persistencia/GravadorJogo');
const LeitorArquivoJogo = require('../model/persistencia/LeitorArquivoJogo');
const ArquivoSaveInvalidoError = require('../model/persistencia/ArquivoSaveInvalidoError');

const NOME_COMPUTADOR = 'Marinha Real';
const TAMANHO_MAX_NOME = 20;

/** Fases da tela no navegador. */
const Fase = Object.freeze({
  SEM_PARTIDA: 'SEM_PARTIDA',
  POSICIONANDO: 'POSICIONANDO',
  JOGANDO: 'JOGANDO',
  FIM: 'FIM',
});

/** Erro causado por um pedido inválido do usuário (vira HTTP 400). */
class PedidoInvalidoError extends Error {}

/**
 * CONTROLLER da versão web. Recebe as ações do navegador (pedidos JSON), chama o MESMO Model
 * usado pela versão de console e devolve o estado pronto para a View web desenhar.
 *
 * Rotas (todas POST, exceto /api/estado):
 *   GET  /api/estado
 *   POST /api/nova         { nome }
 *   POST /api/posicionar   { celula: "B3", orientacao: "H" | "V" }
 *   POST /api/sortear
 *   POST /api/disparar     { alvo: "B5" }
 *   POST /api/salvar
 *   POST /api/carregar
 */
class WebController {
  #caminhoSave;
  #sorteio;
  #ia;
  #gravador = new GravadorJogo();
  #leitor = new LeitorArquivoJogo();

  #fase = Fase.SEM_PARTIDA;
  #nomeJogador = '';
  #marJogador = null;
  #marComputador = null;
  #naviosAPosicionar = [];
  #partida = null;

  constructor({ caminhoSave, sorteio = Math.random }) {
    this.#caminhoSave = path.resolve(caminhoSave);
    this.#sorteio = sorteio;
    this.#ia = new IAComputador(sorteio);
  }

  /**
   * Executa uma ação da API.
   * @returns {{status: number, corpo: object}}
   */
  executar(metodo, rota, dados = {}) {
    try {
      const acao = this.#rotas()[`${metodo} ${rota}`];
      if (!acao) {
        return { status: 404, corpo: { erro: 'Rota não encontrada.' } };
      }
      const eventos = acao(dados) ?? [];
      return { status: 200, corpo: { eventos, estado: this.estado() } };
    } catch (erro) {
      if (erro instanceof PedidoInvalidoError || erro instanceof ArquivoSaveInvalidoError) {
        return { status: 400, corpo: { erro: erro.message, estado: this.estado() } };
      }
      throw erro;
    }
  }

  #rotas() {
    return {
      'GET /api/estado': () => [],
      'POST /api/nova': (d) => this.#novaPartida(d.nome),
      'POST /api/posicionar': (d) => this.#posicionar(d.celula, d.orientacao),
      'POST /api/sortear': () => this.#sortear(),
      'POST /api/disparar': (d) => this.#disparar(d.alvo),
      'POST /api/salvar': () => this.#salvar(),
      'POST /api/carregar': () => this.#carregar(),
    };
  }

  // ------------------------------------------------------------ ações

  #novaPartida(nome) {
    const limpo = String(nome ?? '').replace(/\|/g, '').trim();
    this.#nomeJogador = (limpo || 'Capitão').slice(0, TAMANHO_MAX_NOME).trim();
    this.#marJogador = new Tabuleiro();
    this.#marComputador = new Tabuleiro();
    this.#marComputador.posicionarAleatoriamente(criarFrota(Time.COMPUTADOR), this.#sorteio);
    this.#naviosAPosicionar = criarFrota(Time.JOGADOR);
    this.#partida = null;
    this.#fase = Fase.POSICIONANDO;
  }

  #posicionar(celula, sigla) {
    this.#exigirFase(Fase.POSICIONANDO);
    const origem = Coordenada.interpretar(celula);
    const orientacao = orientacaoPorSigla(sigla);
    if (!origem || !this.#marJogador.dentro(origem) || !orientacao) {
      throw new PedidoInvalidoError('Célula ou orientação inválida.');
    }
    const navio = this.#naviosAPosicionar[0];
    if (!this.#marJogador.podePosicionar(navio, origem, orientacao)) {
      throw new PedidoInvalidoError('Não cabe aí: o navio sairia do mapa ou ficaria em cima de outro.');
    }
    this.#marJogador.posicionar(navio, origem, orientacao);
    this.#naviosAPosicionar.shift();
    if (this.#naviosAPosicionar.length === 0) {
      this.#iniciarCombate();
    }
  }

  /** Sorteia a frota inteira (descarta o que já tinha sido posicionado à mão). */
  #sortear() {
    this.#exigirFase(Fase.POSICIONANDO);
    this.#marJogador = new Tabuleiro();
    this.#marJogador.posicionarAleatoriamente(criarFrota(Time.JOGADOR), this.#sorteio);
    this.#naviosAPosicionar = [];
    this.#iniciarCombate();
  }

  #iniciarCombate() {
    this.#partida = new Partida({
      nomeJogador: this.#nomeJogador,
      turno: Time.JOGADOR,
      marJogador: this.#marJogador,
      marComputador: this.#marComputador,
    });
    this.#fase = Fase.JOGANDO;
  }

  /** O jogador dispara e, se a partida não acabou, o computador responde no mesmo pedido. */
  #disparar(texto) {
    this.#exigirFase(Fase.JOGANDO);
    if (this.#partida.getTurno() !== Time.JOGADOR) {
      throw new PedidoInvalidoError('Não é a sua vez.');
    }
    const alvo = Coordenada.interpretar(texto);
    const marInimigo = this.#partida.marDo(Time.COMPUTADOR);
    if (!alvo || !marInimigo.dentro(alvo)) {
      throw new PedidoInvalidoError('Coordenada inválida.');
    }
    if (marInimigo.getEstado(alvo) !== EstadoCelula.DESCONHECIDO) {
      throw new PedidoInvalidoError(`Você já atirou em ${alvo}.`);
    }

    const eventos = [WebController.#evento(this.#partida.disparar(alvo))];
    if (!this.#partida.estaTerminada()) {
      const alvoIA = this.#ia.escolherAlvo(this.#partida.marDo(Time.JOGADOR));
      eventos.push(WebController.#evento(this.#partida.disparar(alvoIA)));
    }
    if (this.#partida.estaTerminada()) {
      this.#fase = Fase.FIM;
    }
    return eventos;
  }

  #salvar() {
    this.#exigirFase(Fase.JOGANDO);
    try {
      this.#gravador.salvar(this.#caminhoSave, this.#partida);
    } catch (erro) {
      throw new PedidoInvalidoError(`Não foi possível salvar: ${erro.message}`);
    }
    return [{ tipo: 'SALVO', arquivo: this.#caminhoSave }];
  }

  #carregar() {
    this.#partida = this.#leitor.ler(this.#caminhoSave);
    this.#nomeJogador = this.#partida.getNomeJogador();
    this.#marJogador = this.#partida.marDo(Time.JOGADOR);
    this.#marComputador = this.#partida.marDo(Time.COMPUTADOR);
    this.#naviosAPosicionar = [];
    this.#fase = Fase.JOGANDO;
    // Saves feitos no meio do turno do computador: ele joga antes de devolver a vez.
    if (this.#partida.getTurno() === Time.COMPUTADOR) {
      return [WebController.#evento(this.#partida.disparar(this.#ia.escolherAlvo(this.#marJogador)))];
    }
    return [{ tipo: 'CARREGADO' }];
  }

  // ------------------------------------------------------------ estado para a View

  /** Fotografia do jogo no formato que a página usa para desenhar. */
  estado() {
    const fimDeJogo = this.#fase === Fase.FIM;
    return {
      fase: this.#fase,
      nomeJogador: this.#nomeJogador,
      nomeComputador: NOME_COMPUTADOR,
      vencedor: this.#partida?.getVencedor() ?? null,
      existeSave: fs.existsSync(this.#caminhoSave),
      proximoNavio: this.#naviosAPosicionar[0]
        ? { nome: this.#naviosAPosicionar[0].getNome(), simbolo: this.#naviosAPosicionar[0].getSimbolo() }
        : null,
      meuMar: this.#marJogador ? WebController.#grade(this.#marJogador, true) : null,
      marInimigo: this.#marComputador ? WebController.#grade(this.#marComputador, fimDeJogo) : null,
      minhaFrota: this.#marJogador ? WebController.#frota(this.#marJogador) : [],
      frotaInimiga: this.#marComputador && this.#fase !== Fase.POSICIONANDO
        ? WebController.#frota(this.#marComputador, !fimDeJogo)
        : [],
    };
  }

  /** Grade de caracteres: '~' mar, 'o' água, 'X' acerto, '#' afundado, letra = navio visível. */
  static #grade(mar, mostrarNavios) {
    const linhas = [];
    for (let l = 0; l < mar.getTamanho(); l++) {
      let linha = '';
      for (let c = 0; c < mar.getTamanho(); c++) {
        const coord = new Coordenada(l, c);
        const estado = mar.getEstado(coord);
        if (estado !== EstadoCelula.DESCONHECIDO) {
          linha += estado;
        } else {
          const navio = mostrarNavios ? mar.unidadeEm(coord) : null;
          linha += navio ? navio.getSimbolo() : '~';
        }
      }
      linhas.push(linha);
    }
    return linhas;
  }

  /** Lista da frota. Para o inimigo ainda vivo, esconde as avarias (só mostra se afundou). */
  static #frota(mar, esconderDetalhes = false) {
    return mar.getUnidades().map((u) => ({
      nome: u.getNome(),
      simbolo: u.getSimbolo(),
      afundado: u.estaAfundada(),
      avarias: esconderDetalhes && !u.estaAfundada() ? null : u.contarAvarias(),
      tamanho: u.getTamanho(),
    }));
  }

  static #evento({ atirador, alvo, resultado, atingida }) {
    return {
      tipo: 'DISPARO',
      atirador,
      alvo: String(alvo),
      resultado,
      navio: atingida && atirador === Time.COMPUTADOR ? atingida.getNome() : null,
      mensagemAfundamento: resultado === 'AFUNDOU' ? atingida.getMensagemAfundamento() : null,
    };
  }

  #exigirFase(fase) {
    if (this.#fase !== fase) {
      throw new PedidoInvalidoError('Essa ação não está disponível agora.');
    }
  }
}

module.exports = { WebController, Fase };
