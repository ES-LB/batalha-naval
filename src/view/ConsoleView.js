'use strict';

const Coordenada = require('../model/Coordenada');
const { EstadoCelula, ResultadoDisparo, Time } = require('../model/constantes');

const ESPACO_ENTRE_MAPAS = '      ';

/**
 * VIEW: tudo o que aparece na tela passa por aqui.
 * Só lê o estado do Model para desenhar; nunca altera nada.
 */
class ConsoleView {
  #saida;

  constructor(saida = process.stdout) {
    this.#saida = saida;
  }

  mostrar(texto = '') {
    this.#saida.write(`${texto}\n`);
  }

  titulo(texto) {
    const barra = '='.repeat(texto.length + 4);
    this.mostrar();
    this.mostrar(barra);
    this.mostrar(`  ${texto}`);
    this.mostrar(barra);
  }

  menuPrincipal() {
    this.mostrar();
    this.mostrar('1 - Nova partida');
    this.mostrar('2 - Continuar partida salva');
    this.mostrar('3 - Regras');
    this.mostrar('0 - Sair');
  }

  menuPosicionamento() {
    this.mostrar('Como deseja posicionar seus 3 navios (3x1)?');
    this.mostrar('1 - Eu escolho as posições');
    this.mostrar('2 - Sortear automaticamente');
  }

  regras(caminhoSave) {
    this.titulo('REGRAS');
    this.mostrar('- Cada lado tem 3 navios de 3x1 escondidos em um mar 8x8.');
    this.mostrar('- Os turnos se alternam: você atira, depois o computador. Um disparo por turno.');
    this.mostrar('- Digite o alvo como letra + número, por exemplo B5.');
    this.mostrar('- Quem afundar os 3 navios do adversário primeiro vence.');
    this.mostrar('- No seu turno, digite S para salvar ou Q para sair (com opção de salvar).');
    this.mostrar(`- O jogo salvo fica em: ${caminhoSave}`);
  }

  /** Um único mar com os navios visíveis (usado no posicionamento). */
  desenharMar(mar) {
    this.#renderizar(mar, true, 'SEU MAR').forEach((l) => this.mostrar(l));
  }

  /** Mar do jogador (navios visíveis) ao lado do mar inimigo (navios ocultos, a não ser no fim). */
  desenharMares(meu, inimigo, revelarInimigo = false) {
    const esquerda = this.#renderizar(meu, true, 'SEU MAR');
    const direita = this.#renderizar(inimigo, revelarInimigo, 'MAR INIMIGO');
    const largura = Math.max(...esquerda.map((l) => l.length));
    this.mostrar();
    esquerda.forEach((linha, i) => this.mostrar(linha.padEnd(largura) + ESPACO_ENTRE_MAPAS + (direita[i] ?? '')));
    this.mostrar();
    this.mostrar('Legenda: ~ mar  o água  X acerto  # afundado  G/F/E seus navios');
  }

  placar(meu, inimigo) {
    this.mostrar(`Navios restantes: seus ${meu.contarNaviosAtivos()} | inimigos ${inimigo.contarNaviosAtivos()}`);
  }

  mostrarFrota(titulo, mar) {
    this.mostrar(titulo);
    mar.getUnidades().forEach((u) => this.mostrar(`  - ${u.getDescricao()}`));
  }

  narrarDisparo({ atirador, alvo, resultado, atingida }, nomeComputador) {
    const doJogador = atirador === Time.JOGADOR;
    const quem = doJogador ? 'Você atirou' : `${nomeComputador} atirou`;
    let texto;
    switch (resultado) {
      case ResultadoDisparo.AGUA:
        texto = `${quem} em ${alvo}: só água.`;
        break;
      case ResultadoDisparo.ACERTO:
        texto = `${quem} em ${alvo}: ACERTOU ${doJogador ? 'um navio inimigo!' : `o seu ${atingida.getNome()}!`}`;
        break;
      case ResultadoDisparo.AFUNDOU:
        texto = `${quem} em ${alvo}: AFUNDOU! ${atingida.getMensagemAfundamento()}`;
        break;
      default:
        texto = `${quem} em ${alvo}.`;
    }
    this.mostrar(`>> ${texto}`);
  }

  fimDeJogo(vitoria, nomeComputador) {
    if (vitoria) {
      this.titulo(`VITÓRIA! A frota da ${nomeComputador} está no fundo do mar.`);
    } else {
      this.titulo(`DERROTA... Sua frota foi afundada pela ${nomeComputador}.`);
    }
  }

  #renderizar(mar, mostrarNavios, titulo) {
    const n = mar.getTamanho();
    const letras = Array.from({ length: n }, (_, c) => String.fromCharCode(65 + c)).join(' ');
    const linhas = [`    ${titulo}`, `    ${letras}`];
    for (let l = 0; l < n; l++) {
      const celulas = [];
      for (let c = 0; c < n; c++) {
        celulas.push(ConsoleView.#simbolo(mar, new Coordenada(l, c), mostrarNavios));
      }
      linhas.push(`${String(l + 1).padStart(3)} ${celulas.join(' ')}`);
    }
    return linhas;
  }

  static #simbolo(mar, c, mostrarNavios) {
    const estado = mar.getEstado(c);
    if (estado !== EstadoCelula.DESCONHECIDO) {
      return estado; // o, X ou #
    }
    const navio = mostrarNavios ? mar.unidadeEm(c) : null;
    return navio ? navio.getSimbolo() : '~';
  }
}

module.exports = ConsoleView;
