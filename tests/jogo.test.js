'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Unidade = require('../src/model/unidades/Unidade');
const Galeao = require('../src/model/unidades/Galeao');
const Coordenada = require('../src/model/Coordenada');
const Tabuleiro = require('../src/model/Tabuleiro');
const Partida = require('../src/model/Partida');
const IAComputador = require('../src/model/IAComputador');
const { Time, Orientacao, ResultadoDisparo } = require('../src/model/constantes');
const { criarFrota } = require('../src/model/unidades/FabricaUnidades');
const GravadorJogo = require('../src/model/persistencia/GravadorJogo');
const LeitorArquivoJogo = require('../src/model/persistencia/LeitorArquivoJogo');
const ArquivoSaveInvalidoError = require('../src/model/persistencia/ArquivoSaveInvalidoError');

/** Gerador pseudoaleatório com semente, para os testes serem reproduzíveis. */
function sorteioComSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function novaPartida(sorteio) {
  const marJogador = new Tabuleiro();
  const marComputador = new Tabuleiro();
  marJogador.posicionarAleatoriamente(criarFrota(Time.JOGADOR), sorteio);
  marComputador.posicionarAleatoriamente(criarFrota(Time.COMPUTADOR), sorteio);
  return new Partida({ nomeJogador: 'Ana', turno: Time.JOGADOR, marJogador, marComputador });
}

test('Unidade é abstrata e exige os métodos abstratos', () => {
  assert.throws(() => new Unidade('x', Time.JOGADOR), /abstrata/);
  class Incompleta extends Unidade {}
  assert.throws(() => new Incompleta('x', Time.JOGADOR), /getTipo/);
  const g = new Galeao('Teste', Time.JOGADOR);
  assert.ok(g instanceof Unidade);
  assert.match(g.getDescricao(), /capitânia/); // método virtual sobrescrito
});

test('navio 3x1 afunda após 3 acertos', () => {
  const mar = new Tabuleiro();
  const [g] = criarFrota(Time.JOGADOR);
  mar.posicionar(g, new Coordenada(0, 0), Orientacao.HORIZONTAL);
  assert.strictEqual(mar.receberDisparo(new Coordenada(0, 0)).resultado, ResultadoDisparo.ACERTO);
  assert.strictEqual(mar.receberDisparo(new Coordenada(0, 0)).resultado, ResultadoDisparo.REPETIDO);
  assert.strictEqual(mar.receberDisparo(new Coordenada(1, 0)).resultado, ResultadoDisparo.AGUA);
  assert.strictEqual(mar.receberDisparo(new Coordenada(0, 1)).resultado, ResultadoDisparo.ACERTO);
  assert.strictEqual(mar.receberDisparo(new Coordenada(0, 2)).resultado, ResultadoDisparo.AFUNDOU);
  assert.strictEqual(mar.receberDisparo(new Coordenada(9, 9)).resultado, ResultadoDisparo.FORA_DO_MAPA);
});

test('posicionamento recusa navio fora do mapa ou sobreposto', () => {
  const mar = new Tabuleiro();
  const [g, f] = criarFrota(Time.JOGADOR);
  assert.strictEqual(mar.podePosicionar(g, new Coordenada(0, 6), Orientacao.HORIZONTAL), false);
  mar.posicionar(g, new Coordenada(0, 0), Orientacao.HORIZONTAL);
  assert.strictEqual(mar.podePosicionar(f, new Coordenada(0, 1), Orientacao.VERTICAL), false);
  assert.strictEqual(mar.podePosicionar(f, new Coordenada(1, 1), Orientacao.VERTICAL), true);
});

test('partidas IA x IA: turnos alternados, sem tiro repetido, e save/load no meio', () => {
  const gravador = new GravadorJogo();
  const leitor = new LeitorArquivoJogo();
  for (let semente = 1; semente <= 500; semente++) {
    const sorteio = sorteioComSemente(semente);
    let partida = novaPartida(sorteio);
    const ia = new IAComputador(sorteio);
    const salvarNoTurno = Math.floor(sorteio() * 40);
    let turnos = 0;
    while (!partida.estaTerminada()) {
      const quem = partida.getTurno();
      const r = partida.disparar(ia.escolherAlvo(partida.marDo(quem === Time.JOGADOR ? Time.COMPUTADOR : Time.JOGADOR)));
      assert.notStrictEqual(r.resultado, ResultadoDisparo.REPETIDO);
      if (!partida.estaTerminada()) {
        assert.notStrictEqual(partida.getTurno(), quem, 'o turno precisa alternar');
      }
      turnos++;
      assert.ok(turnos <= 128);
      if (turnos === salvarNoTurno && !partida.estaTerminada()) {
        const linhas = gravador.gerarLinhas(partida);
        partida = leitor.interpretar(linhas);
        assert.deepStrictEqual(gravador.gerarLinhas(partida), linhas);
      }
    }
  }
});

test('gravar em disco e ler de volta', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'bn-'));
  const arquivo = path.join(pasta, 'teste.sav');
  const partida = novaPartida(sorteioComSemente(42));
  partida.disparar(new Coordenada(3, 3));
  new GravadorJogo().salvar(arquivo, partida);
  const lida = new LeitorArquivoJogo().ler(arquivo);
  assert.strictEqual(lida.getTurno(), Time.COMPUTADOR);
  assert.strictEqual(lida.marDo(Time.JOGADOR).getUnidades().length + lida.marDo(Time.COMPUTADOR).getUnidades().length, 6);
  assert.deepStrictEqual(fs.readdirSync(pasta), ['teste.sav'], 'não pode sobrar arquivo temporário');
  fs.rmSync(pasta, { recursive: true });
});

test('arquivos inválidos são recusados com ArquivoSaveInvalidoError', () => {
  const base = new GravadorJogo().gerarLinhas(novaPartida(sorteioComSemente(7)));
  const mutacoes = [
    ['VERSAO=1', 'VERSAO=2'],
    ['TAMANHO=8', 'TAMANHO=99'],
    ['TURNO=JOGADOR', 'TURNO=NINGUEM'],
    ['tipo=GALEAO', 'tipo=SUBMARINO'],
    ['avarias=000', 'avarias=0000'],
    ['avarias=000', 'avarias=111'],
    ['coluna=', 'coluna=9'],
    ['grade=........', 'grade=X.......'],
    ['grade=........', 'grade=?.......'],
    ['time=COMPUTADOR|tipo=ESCUNA', 'time=JOGADOR|tipo=ESCUNA'],
    ['JOGADOR=Ana', 'JOGADOR='],
  ];
  for (const [de, para] of mutacoes) {
    const i = base.findIndex((l) => l.includes(de));
    assert.ok(i >= 0, `mutação não aplicada: ${de}`);
    const copia = [...base];
    copia[i] = copia[i].replace(de, para);
    assert.throws(() => new LeitorArquivoJogo().interpretar(copia), ArquivoSaveInvalidoError, para);
  }
  for (let i = 1; i < base.length; i++) {
    assert.throws(() => new LeitorArquivoJogo().interpretar(base.filter((_, j) => j !== i)), ArquivoSaveInvalidoError);
    assert.throws(() => new LeitorArquivoJogo().interpretar([...base, base[i]]), ArquivoSaveInvalidoError);
  }
  assert.throws(() => new LeitorArquivoJogo().ler('/nao/existe.sav'), ArquivoSaveInvalidoError);
});

test('lixo aleatório no save nunca gera erro não tratado', () => {
  const base = new GravadorJogo().gerarLinhas(novaPartida(sorteioComSemente(3)));
  const sorteio = sorteioComSemente(99);
  for (let t = 0; t < 5000; t++) {
    const copia = [...base];
    const i = Math.floor(sorteio() * copia.length);
    const chars = [...copia[i]];
    chars[Math.floor(sorteio() * chars.length)] = String.fromCharCode(32 + Math.floor(sorteio() * 95));
    copia[i] = chars.join('');
    try {
      new LeitorArquivoJogo().interpretar(copia);
    } catch (erro) {
      assert.ok(erro instanceof ArquivoSaveInvalidoError, `erro inesperado: ${erro} na linha "${copia[i]}"`);
    }
  }
});
