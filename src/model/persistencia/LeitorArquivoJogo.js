'use strict';

const fs = require('fs');
const Coordenada = require('../Coordenada');
const Tabuleiro = require('../Tabuleiro');
const Partida = require('../Partida');
const { Time, ehTimeValido, orientacaoPorSigla, ehEstadoValido } = require('../constantes');
const { NAVIOS_POR_TIME, criarUnidade } = require('../unidades/FabricaUnidades');
const { FormatoSave: F } = require('./FormatoSave');
const ArquivoSaveInvalidoError = require('./ArquivoSaveInvalidoError');

const CHAVES_CABECALHO = [F.CHAVE_VERSAO, F.CHAVE_TAMANHO, F.CHAVE_TURNO, F.CHAVE_JOGADOR];

/**
 * Classe EXCLUSIVA de leitura do arquivo de save.
 *
 * Faz o parse das strings do arquivo e atribui os valores lidos aos atributos das
 * 6 unidades do jogo (time, tipo, nome, posição, orientação e avarias). Também restaura
 * o turno e a grade de disparos de cada lado. Qualquer problema gera
 * ArquivoSaveInvalidoError com uma mensagem que aponta a linha do erro.
 */
class LeitorArquivoJogo {
  /** @returns {Partida} */
  ler(caminho) {
    let conteudo;
    try {
      conteudo = fs.readFileSync(caminho, 'utf8');
    } catch (erro) {
      const motivo = erro.code === 'ENOENT' ? 'arquivo não encontrado' : erro.message;
      throw new ArquivoSaveInvalidoError(`Não foi possível ler ${caminho}: ${motivo}`, erro);
    }
    return this.interpretar(conteudo.split(/\r?\n/));
  }

  /** Faz o parse de linhas já lidas (separado de ler() para facilitar os testes). */
  interpretar(linhas) {
    const cabecalho = new Map();
    const unidades = [];
    const grades = new Map();

    linhas.forEach((bruta, i) => {
      let linha = bruta.trim();
      if (i === 0) {
        linha = linha.replace(/^﻿/, ''); // BOM deixado por alguns editores no Windows
      }
      if (linha === '' || linha.startsWith(F.COMENTARIO)) {
        return;
      }
      try {
        if (linha.startsWith(F.REGISTRO_UNIDADE + F.SEPARADOR_CAMPOS)) {
          unidades.push(this.#lerUnidade(this.#separarCampos(linha)));
        } else if (linha.startsWith(F.REGISTRO_DISPAROS + F.SEPARADOR_CAMPOS)) {
          this.#lerDisparos(this.#separarCampos(linha), grades);
        } else {
          this.#lerCabecalho(linha, cabecalho);
        }
      } catch (erro) {
        throw new ArquivoSaveInvalidoError(`Linha ${i + 1}: ${erro.message}`, erro);
      }
    });

    try {
      return this.#montarPartida(cabecalho, unidades, grades);
    } catch (erro) {
      throw new ArquivoSaveInvalidoError(erro.message, erro);
    }
  }

  // ------------------------------------------------------------ parse de cada tipo de linha

  #lerCabecalho(linha, cabecalho) {
    const pos = linha.indexOf(F.ATRIBUICAO);
    if (pos <= 0) {
      throw new Error(`linha não reconhecida: "${linha}"`);
    }
    const chave = linha.slice(0, pos).trim().toUpperCase();
    const valor = linha.slice(pos + 1).trim();
    if (!CHAVES_CABECALHO.includes(chave)) {
      throw new Error(`chave desconhecida: ${chave}`);
    }
    if (cabecalho.has(chave)) {
      throw new Error(`chave repetida: ${chave}`);
    }
    cabecalho.set(chave, valor);
  }

  /** Transforma "REGISTRO|a=1|b=2" em Map {a => "1", b => "2"}. */
  #separarCampos(linha) {
    const campos = new Map();
    for (const parte of linha.split(F.SEPARADOR_CAMPOS).slice(1)) {
      const pos = parte.indexOf(F.ATRIBUICAO);
      if (pos <= 0) {
        throw new Error(`campo mal formado: "${parte}"`);
      }
      const chave = parte.slice(0, pos).trim().toLowerCase();
      if (campos.has(chave)) {
        throw new Error(`campo repetido: ${chave}`);
      }
      campos.set(chave, parte.slice(pos + 1).trim());
    }
    return campos;
  }

  /** Cria a unidade e atribui a ela cada valor lido do arquivo. */
  #lerUnidade(campos) {
    const time = lerTime(obrigatorio(campos, F.CAMPO_TIME));
    const unidade = criarUnidade(obrigatorio(campos, F.CAMPO_TIPO), obrigatorio(campos, F.CAMPO_NOME), time);

    const linha = inteiro(campos, F.CAMPO_LINHA);
    const coluna = inteiro(campos, F.CAMPO_COLUNA);
    const orientacao = orientacaoPorSigla(obrigatorio(campos, F.CAMPO_ORIENTACAO));
    if (!orientacao) {
      throw new Error('orientação deve ser H ou V');
    }
    unidade.posicionar(new Coordenada(linha, coluna), orientacao);
    unidade.setAvarias(lerAvarias(obrigatorio(campos, F.CAMPO_AVARIAS), unidade.getTamanho()));
    return unidade;
  }

  #lerDisparos(campos, grades) {
    const time = lerTime(obrigatorio(campos, F.CAMPO_TIME));
    if (grades.has(time)) {
      throw new Error(`grade de disparos do time ${time} repetida`);
    }
    grades.set(time, obrigatorio(campos, F.CAMPO_GRADE));
  }

  // ------------------------------------------------------------ montagem final

  #montarPartida(cabecalho, unidades, grades) {
    const versao = inteiro(cabecalho, F.CHAVE_VERSAO);
    if (versao !== F.VERSAO_ATUAL) {
      throw new Error(`versão de save não suportada: ${versao}`);
    }
    const tamanho = inteiro(cabecalho, F.CHAVE_TAMANHO);
    const turno = lerTime(obrigatorio(cabecalho, F.CHAVE_TURNO));
    const nomeJogador = obrigatorio(cabecalho, F.CHAVE_JOGADOR);

    const mares = {};
    for (const time of Object.values(Time)) {
      const mar = new Tabuleiro(tamanho);
      const doTime = unidades.filter((u) => u.getTime() === time);
      doTime.forEach((u) => mar.adicionarPosicionada(u));
      if (doTime.length !== NAVIOS_POR_TIME) {
        throw new Error(`o time ${time} deve ter ${NAVIOS_POR_TIME} navios, mas o arquivo tem ${doTime.length}`);
      }
      if (!grades.has(time)) {
        throw new Error(`faltando a grade de disparos do time ${time}`);
      }
      aplicarGrade(mar, grades.get(time), time);
      mar.verificarConsistencia();
      if (mar.todasAfundadas()) {
        throw new Error('esta partida já terminou; não há o que retomar');
      }
      mares[time] = mar;
    }
    return new Partida({
      nomeJogador,
      turno,
      marJogador: mares[Time.JOGADOR],
      marComputador: mares[Time.COMPUTADOR],
    });
  }
}

// ------------------------------------------------------------ conversões

function aplicarGrade(mar, grade, time) {
  const linhas = grade.split(F.SEPARADOR_LINHAS_GRADE);
  if (linhas.length !== mar.getTamanho()) {
    throw new Error(`a grade do time ${time} deveria ter ${mar.getTamanho()} linhas, tem ${linhas.length}`);
  }
  linhas.forEach((texto, l) => {
    if (texto.length !== mar.getTamanho()) {
      throw new Error(`a linha ${l + 1} da grade do time ${time} deveria ter ${mar.getTamanho()} células`);
    }
    [...texto].forEach((caractere, c) => {
      if (!ehEstadoValido(caractere)) {
        throw new Error(`caractere inválido '${caractere}' na grade do time ${time}`);
      }
      mar.setEstado(new Coordenada(l, c), caractere);
    });
  });
}

function obrigatorio(campos, chave) {
  const valor = campos.get(chave);
  if (valor === undefined || valor === '') {
    throw new Error(`campo obrigatório ausente: ${chave}`);
  }
  return valor;
}

function inteiro(campos, chave) {
  const valor = obrigatorio(campos, chave);
  if (!/^-?\d+$/.test(valor)) {
    throw new Error(`o campo ${chave} deveria ser um número inteiro, mas é "${valor}"`);
  }
  return Number(valor);
}

function lerTime(valor) {
  const time = valor.toUpperCase();
  if (!ehTimeValido(time)) {
    throw new Error(`time inválido: ${valor}`);
  }
  return time;
}

function lerAvarias(texto, tamanho) {
  if (!new RegExp(`^[01]{${tamanho}}$`).test(texto)) {
    throw new Error(`avarias deve ter exatamente ${tamanho} dígitos 0 ou 1, mas é "${texto}"`);
  }
  return [...texto].map((c) => c === '1');
}

module.exports = LeitorArquivoJogo;
