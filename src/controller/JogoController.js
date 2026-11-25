'use strict';

const path = require('path');
const Coordenada = require('../model/Coordenada');
const Tabuleiro = require('../model/Tabuleiro');
const Partida = require('../model/Partida');
const IAComputador = require('../model/IAComputador');
const { Time, orientacaoPorSigla } = require('../model/constantes');
const { criarFrota } = require('../model/unidades/FabricaUnidades');
const GravadorJogo = require('../model/persistencia/GravadorJogo');
const LeitorArquivoJogo = require('../model/persistencia/LeitorArquivoJogo');
const ArquivoSaveInvalidoError = require('../model/persistencia/ArquivoSaveInvalidoError');
const { PartidaController } = require('./PartidaController');
const Perguntas = require('./Perguntas');

const TAMANHO_MAX_NOME = 20;

/**
 * CONTROLLER principal: menu, criação de partida nova (com posicionamento dos navios)
 * e carregamento de partida salva.
 */
class JogoController {
  constructor({ view, entrada, caminhoSave, sorteio = Math.random }) {
    this.view = view;
    this.entrada = entrada;
    this.perguntas = new Perguntas(view, entrada);
    this.caminhoSave = path.resolve(caminhoSave);
    this.sorteio = sorteio;
    this.gravador = new GravadorJogo();
    this.leitor = new LeitorArquivoJogo();
  }

  async executar() {
    this.view.titulo('BATALHA NAVAL - PIRATAS DO CONSOLE');
    for (;;) {
      this.view.menuPrincipal();
      const opcao = await this.perguntas.opcao('Escolha: ', 0, 3);
      if (opcao === 1) {
        await this.#jogar(await this.#novaPartida());
      } else if (opcao === 2) {
        const partida = this.#carregar();
        if (partida) {
          await this.#jogar(partida);
        }
      } else if (opcao === 3) {
        this.view.regras(this.caminhoSave);
      } else {
        this.view.mostrar('Até a próxima maré, capitão!');
        return;
      }
    }
  }

  async #jogar(partida) {
    const controller = new PartidaController({
      partida,
      view: this.view,
      entrada: this.entrada,
      perguntas: this.perguntas,
      ia: new IAComputador(this.sorteio),
      gravador: this.gravador,
      caminhoSave: this.caminhoSave,
    });
    await controller.executar();
  }

  // ------------------------------------------------------------ nova partida

  async #novaPartida() {
    this.view.titulo('NOVA PARTIDA');
    const nomeJogador = await this.#lerNome();

    const marJogador = new Tabuleiro();
    const marComputador = new Tabuleiro();
    marComputador.posicionarAleatoriamente(criarFrota(Time.COMPUTADOR), this.sorteio);

    this.view.menuPosicionamento();
    if (await this.perguntas.opcao('Escolha: ', 1, 2) === 1) {
      await this.#posicionarManualmente(marJogador);
    } else {
      marJogador.posicionarAleatoriamente(criarFrota(Time.JOGADOR), this.sorteio);
      this.view.desenharMar(marJogador);
    }
    this.view.mostrar('Frota pronta. Você atira primeiro!');
    return new Partida({ nomeJogador, turno: Time.JOGADOR, marJogador, marComputador });
  }

  async #lerNome() {
    const nome = (await this.entrada.ler('Nome do capitão: ')).replace(/\|/g, '').trim();
    return (nome || 'Capitão').slice(0, TAMANHO_MAX_NOME).trim();
  }

  async #posicionarManualmente(mar) {
    for (const navio of criarFrota(Time.JOGADOR)) {
      for (;;) {
        this.view.desenharMar(mar);
        this.view.mostrar(`Posicionando: ${navio.getNome()} [${navio.getSimbolo()}], 3 células.`);
        const origem = Coordenada.interpretar(await this.entrada.ler('Célula inicial (ex: A1): '));
        if (!origem || !mar.dentro(origem)) {
          this.view.mostrar('Coordenada inválida.');
          continue;
        }
        const orientacao = orientacaoPorSigla(await this.entrada.ler('Orientação (H = para a direita, V = para baixo): '));
        if (!orientacao) {
          this.view.mostrar('Digite H ou V.');
          continue;
        }
        if (!mar.podePosicionar(navio, origem, orientacao)) {
          this.view.mostrar('Não cabe aí: o navio sairia do mapa ou ficaria em cima de outro.');
          continue;
        }
        mar.posicionar(navio, origem, orientacao);
        break;
      }
    }
    this.view.desenharMar(mar);
  }

  // ------------------------------------------------------------ carregar

  #carregar() {
    try {
      const partida = this.leitor.ler(this.caminhoSave);
      this.view.mostrar(`Partida de ${partida.getNomeJogador()} carregada.`);
      this.view.mostrarFrota('Sua frota:', partida.marDo(Time.JOGADOR));
      return partida;
    } catch (erro) {
      if (erro instanceof ArquivoSaveInvalidoError) {
        this.view.mostrar(`Não foi possível carregar o jogo salvo. ${erro.message}`);
        return null;
      }
      throw erro;
    }
  }
}

module.exports = JogoController;
