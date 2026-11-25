'use strict';

/**
 * Ponto de entrada.
 * Uso: node src/index.js [arquivo_de_save]   (padrão: batalha_naval.sav na pasta atual)
 */

const ConsoleView = require('./view/ConsoleView');
const { EntradaConsole, EntradaEncerradaError } = require('./view/EntradaConsole');
const JogoController = require('./controller/JogoController');

const ARQUIVO_SAVE_PADRAO = 'batalha_naval.sav';

async function main() {
  const view = new ConsoleView();
  const entrada = new EntradaConsole();
  const jogo = new JogoController({
    view,
    entrada,
    caminhoSave: process.argv[2] || ARQUIVO_SAVE_PADRAO,
  });

  try {
    await jogo.executar();
  } catch (erro) {
    if (!(erro instanceof EntradaEncerradaError)) {
      throw erro;
    }
    view.mostrar();
    view.mostrar('Entrada encerrada. Até a próxima!');
  } finally {
    entrada.fechar();
  }
}

main().catch((erro) => {
  console.error('Erro inesperado:', erro);
  process.exitCode = 1;
});
