'use strict';

/**
 * Formato do arquivo de save (texto puro), compartilhado pelo gravador e pelo leitor.
 *
 *   # comentário
 *   VERSAO=1
 *   TAMANHO=8
 *   TURNO=JOGADOR
 *   JOGADOR=Ana
 *   UNIDADE|time=JOGADOR|tipo=GALEAO|nome=Vingança da Rainha|linha=2|coluna=1|orientacao=H|avarias=010
 *   ... (6 linhas UNIDADE, 3 por time)
 *   DISPAROS|time=JOGADOR|grade=......../...o..../...
 *   DISPAROS|time=COMPUTADOR|grade=...
 *
 * avarias: um dígito por segmento do navio (1 = atingido).
 * grade: linhas do mar separadas por "/"; cada caractere é '.', 'o', 'X' ou '#'.
 */
const FormatoSave = Object.freeze({
  VERSAO_ATUAL: 1,

  COMENTARIO: '#',
  SEPARADOR_CAMPOS: '|',
  ATRIBUICAO: '=',
  SEPARADOR_LINHAS_GRADE: '/',

  CHAVE_VERSAO: 'VERSAO',
  CHAVE_TAMANHO: 'TAMANHO',
  CHAVE_TURNO: 'TURNO',
  CHAVE_JOGADOR: 'JOGADOR',

  REGISTRO_UNIDADE: 'UNIDADE',
  REGISTRO_DISPAROS: 'DISPAROS',

  CAMPO_TIME: 'time',
  CAMPO_TIPO: 'tipo',
  CAMPO_NOME: 'nome',
  CAMPO_LINHA: 'linha',
  CAMPO_COLUNA: 'coluna',
  CAMPO_ORIENTACAO: 'orientacao',
  CAMPO_AVARIAS: 'avarias',
  CAMPO_GRADE: 'grade',
});

/** Remove caracteres que quebrariam o formato (usado em textos livres, como nomes). */
function limparTexto(texto) {
  return String(texto).replace(/[|\r\n]/g, '').trim();
}

module.exports = { FormatoSave, limparTexto };
