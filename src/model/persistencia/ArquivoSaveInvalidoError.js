'use strict';

/** O arquivo de save não existe, não pôde ser lido ou tem conteúdo inválido. */
class ArquivoSaveInvalidoError extends Error {
  constructor(mensagem, causa) {
    super(mensagem, causa ? { cause: causa } : undefined);
    this.name = 'ArquivoSaveInvalidoError';
  }
}

module.exports = ArquivoSaveInvalidoError;
