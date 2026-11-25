'use strict';

const fs = require('fs');
const path = require('path');
const Coordenada = require('../Coordenada');
const { Time } = require('../constantes');
const { FormatoSave: F, limparTexto } = require('./FormatoSave');

/** Grava a partida em arquivo texto (formato descrito em FormatoSave.js). */
class GravadorJogo {
  /**
   * Salva a partida. Escreve primeiro num arquivo temporário e depois renomeia,
   * para que um save antigo nunca fique pela metade se algo der errado no meio.
   */
  salvar(caminho, partida) {
    const conteudo = this.gerarLinhas(partida).join('\n') + '\n';
    const temporario = path.join(path.dirname(path.resolve(caminho)), `.${path.basename(caminho)}.${process.pid}.tmp`);
    try {
      fs.writeFileSync(temporario, conteudo, 'utf8');
      fs.renameSync(temporario, caminho);
    } finally {
      fs.rmSync(temporario, { force: true });
    }
  }

  gerarLinhas(partida) {
    const linhas = [
      `${F.COMENTARIO} Batalha Naval - jogo salvo`,
      `${F.CHAVE_VERSAO}${F.ATRIBUICAO}${F.VERSAO_ATUAL}`,
      `${F.CHAVE_TAMANHO}${F.ATRIBUICAO}${partida.marDo(Time.JOGADOR).getTamanho()}`,
      `${F.CHAVE_TURNO}${F.ATRIBUICAO}${partida.getTurno()}`,
      `${F.CHAVE_JOGADOR}${F.ATRIBUICAO}${limparTexto(partida.getNomeJogador())}`,
    ];
    for (const time of Object.values(Time)) {
      for (const unidade of partida.marDo(time).getUnidades()) {
        linhas.push(this.#registroUnidade(unidade));
      }
    }
    for (const time of Object.values(Time)) {
      linhas.push(this.#registroDisparos(time, partida.marDo(time)));
    }
    return linhas;
  }

  #registroUnidade(u) {
    return [
      F.REGISTRO_UNIDADE,
      campo(F.CAMPO_TIME, u.getTime()),
      campo(F.CAMPO_TIPO, u.getTipo()),
      campo(F.CAMPO_NOME, limparTexto(u.getNome())),
      campo(F.CAMPO_LINHA, u.getOrigem().linha),
      campo(F.CAMPO_COLUNA, u.getOrigem().coluna),
      campo(F.CAMPO_ORIENTACAO, u.getOrientacao().sigla),
      campo(F.CAMPO_AVARIAS, u.getAvarias().map((a) => (a ? '1' : '0')).join('')),
    ].join(F.SEPARADOR_CAMPOS);
  }

  #registroDisparos(time, mar) {
    const linhasGrade = [];
    for (let l = 0; l < mar.getTamanho(); l++) {
      let linha = '';
      for (let c = 0; c < mar.getTamanho(); c++) {
        linha += mar.getEstado(new Coordenada(l, c));
      }
      linhasGrade.push(linha);
    }
    return [
      F.REGISTRO_DISPAROS,
      campo(F.CAMPO_TIME, time),
      campo(F.CAMPO_GRADE, linhasGrade.join(F.SEPARADOR_LINHAS_GRADE)),
    ].join(F.SEPARADOR_CAMPOS);
  }
}

function campo(chave, valor) {
  return `${chave}${F.ATRIBUICAO}${valor}`;
}

module.exports = GravadorJogo;
