'use strict';

/*
 * VIEW web: desenha o estado recebido do servidor e transforma cliques em pedidos ao WebController.
 * Nenhuma regra do jogo fica aqui; tudo é decidido pelo Model, no servidor.
 */

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CLASSE_POR_SIMBOLO = { '~': '', o: 'agua', X: 'acerto', '#': 'afundado' };

const el = (id) => document.getElementById(id);

const tela = {
  status: el('status'),
  mesa: el('mesa'),
  gradeMinha: el('grade-minha'),
  gradeInimiga: el('grade-inimiga'),
  frotaMinha: el('frota-minha'),
  frotaInimiga: el('frota-inimiga'),
  nomeJogador: el('nome-jogador'),
  painelPosicionar: el('painel-posicionar'),
  navioAtual: el('navio-atual'),
  diario: el('diario'),
  telaInicio: el('tela-inicio'),
  formInicio: el('form-inicio'),
  campoNome: el('campo-nome'),
  erroInicio: el('erro-inicio'),
  telaFim: el('tela-fim'),
  tituloFim: el('titulo-fim'),
  textoFim: el('texto-fim'),
  btnSalvar: el('btn-salvar'),
  btnMenu: el('btn-menu'),
  btnContinuar: el('btn-continuar'),
  btnVoltar: el('btn-voltar'),
  btnGirar: el('btn-girar'),
  btnSortear: el('btn-sortear'),
  btnRevanche: el('btn-revanche'),
  btnVerMapa: el('btn-ver-mapa'),
};

const ui = {
  estado: null,
  orientacao: 'H',
  ocupado: false,
  menuAberto: false,
  fimDispensado: false,
  ultimoTiroMeu: null, // casa do mar inimigo onde o jogador acabou de atirar
  ultimoTiroIA: null, // casa do seu mar onde o computador acabou de atirar
};

// ------------------------------------------------------------ comunicação com o Controller

async function chamar(metodo, rota, dados) {
  if (ui.ocupado) {
    return null;
  }
  ui.ocupado = true;
  try {
    const resposta = await fetch(rota, {
      method: metodo,
      headers: dados ? { 'Content-Type': 'application/json' } : undefined,
      body: dados ? JSON.stringify(dados) : undefined,
    });
    const corpo = await resposta.json();
    if (corpo.estado) {
      ui.estado = corpo.estado;
    }
    if (!resposta.ok) {
      desenhar();
      mostrarErro(corpo.erro ?? 'Algo deu errado.');
      return null;
    }
    registrarEventos(corpo.eventos ?? []);
    desenhar();
    return corpo;
  } catch {
    mostrarErro('Sem conexão com o jogo. O terminal com "node src/web.js" ainda está aberto?');
    return null;
  } finally {
    ui.ocupado = false;
  }
}

function mostrarErro(mensagem) {
  if (!tela.telaInicio.hidden) {
    tela.erroInicio.textContent = mensagem;
    return;
  }
  tela.status.textContent = mensagem;
  tela.status.classList.add('erro-status');
}

// ------------------------------------------------------------ diário de bordo

function registrarEventos(eventos) {
  for (const ev of eventos) {
    if (ev.tipo === 'SALVO') {
      anotar(`Jogo salvo em ${ev.arquivo}.`, 'destaque');
    } else if (ev.tipo === 'CARREGADO') {
      anotar('Partida salva carregada. Sua vez!', 'destaque');
    } else if (ev.tipo === 'DISPARO') {
      const doJogador = ev.atirador === 'JOGADOR';
      if (doJogador) {
        ui.ultimoTiroMeu = ev.alvo;
      } else {
        ui.ultimoTiroIA = ev.alvo;
      }
      anotar(textoDoDisparo(ev, doJogador), [doJogador ? '' : 'computador', ev.resultado === 'AFUNDOU' ? 'destaque' : ''].join(' ').trim());
    }
  }
}

function textoDoDisparo(ev, doJogador) {
  const quem = doJogador ? 'Você atirou' : 'A Marinha Real atirou';
  if (ev.resultado === 'AGUA') {
    return `${quem} em ${ev.alvo}: só água.`;
  }
  if (ev.resultado === 'ACERTO') {
    return `${quem} em ${ev.alvo}: ACERTOU ${doJogador ? 'um navio inimigo!' : `o seu ${ev.navio}!`}`;
  }
  return `${quem} em ${ev.alvo}: AFUNDOU! ${ev.mensagemAfundamento}`;
}

function anotar(texto, classe) {
  const item = document.createElement('li');
  item.textContent = texto;
  if (classe) {
    item.className = classe;
  }
  tela.diario.prepend(item);
}

// ------------------------------------------------------------ desenho

function desenhar() {
  const e = ui.estado;
  if (!e) {
    return;
  }
  tela.status.classList.remove('erro-status');

  const temPartida = e.fase !== 'SEM_PARTIDA';
  tela.mesa.hidden = !temPartida;
  tela.telaInicio.hidden = temPartida && !ui.menuAberto;
  tela.btnContinuar.disabled = !e.existeSave;
  tela.btnContinuar.title = e.existeSave ? '' : 'Nenhum jogo salvo encontrado.';
  tela.btnVoltar.hidden = !temPartida;
  tela.btnSalvar.hidden = e.fase !== 'JOGANDO';
  tela.btnMenu.hidden = !temPartida;
  tela.painelPosicionar.hidden = e.fase !== 'POSICIONANDO';
  tela.telaFim.hidden = e.fase !== 'FIM' || ui.fimDispensado || ui.menuAberto;

  if (!temPartida) {
    tela.status.textContent = 'Bem-vindo a bordo!';
    return;
  }

  tela.nomeJogador.textContent = `· ${e.nomeJogador}`;
  desenharGradeMinha(e);
  desenharGradeInimiga(e);
  desenharFrota(tela.frotaMinha, e.minhaFrota);
  desenharFrota(tela.frotaInimiga, e.frotaInimiga);

  if (e.fase === 'POSICIONANDO') {
    const sentido = ui.orientacao === 'H' ? 'deitado (→)' : 'em pé (↓)';
    tela.navioAtual.textContent = `${e.proximoNavio.nome} [${e.proximoNavio.simbolo}]`;
    tela.status.textContent = `Clique no SEU mar para posicionar ${e.proximoNavio.nome}, ${sentido}. Tecla R gira o navio.`;
  } else if (e.fase === 'JOGANDO') {
    tela.status.textContent = `Sua vez, ${e.nomeJogador}! Clique em uma casa do mar inimigo para atirar.`;
  } else if (e.fase === 'FIM') {
    const venceu = e.vencedor === 'JOGADOR';
    tela.status.textContent = venceu ? 'Vitória! A frota inimiga está no fundo do mar.' : 'Derrota... sua frota foi afundada.';
    tela.tituloFim.textContent = venceu ? 'VITÓRIA!' : 'DERROTA...';
    tela.textoFim.textContent = venceu
      ? `A frota da ${e.nomeComputador} está no fundo do mar. O tesouro é seu, ${e.nomeJogador}!`
      : `A ${e.nomeComputador} afundou toda a sua frota. Revanche?`;
  }
}

function desenharGradeMinha(e) {
  const posicionando = e.fase === 'POSICIONANDO';
  montarGrade(tela.gradeMinha, e.meuMar, {
    destaque: ui.ultimoTiroIA,
    clicavel: () => posicionando,
    aoClicar: (casa) => chamar('POST', '/api/posicionar', { celula: casa, orientacao: ui.orientacao }),
    aoPassar: posicionando ? mostrarPrevia : null,
  });
  tela.gradeMinha.onmouseleave = limparPrevia;
}

function desenharGradeInimiga(e) {
  const jogando = e.fase === 'JOGANDO';
  montarGrade(tela.gradeInimiga, e.marInimigo, {
    destaque: ui.ultimoTiroMeu,
    clicavel: (simbolo) => jogando && simbolo === '~',
    aoClicar: (casa) => chamar('POST', '/api/disparar', { alvo: casa }),
  });
}

/** Monta a grade com rótulos (A, B, C... e 1, 2, 3...) e uma casa clicável para cada célula. */
function montarGrade(container, linhas, { destaque, clicavel, aoClicar, aoPassar }) {
  const n = linhas.length;
  container.style.gridTemplateColumns = `repeat(${n + 1}, var(--tamanho-celula))`;
  container.replaceChildren(rotulo(''));
  for (let c = 0; c < n; c++) {
    container.append(rotulo(LETRAS[c]));
  }
  linhas.forEach((linha, l) => {
    container.append(rotulo(String(l + 1)));
    [...linha].forEach((simbolo, c) => {
      const casa = `${LETRAS[c]}${l + 1}`;
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.dataset.casa = casa;
      botao.dataset.linha = l;
      botao.dataset.coluna = c;
      botao.dataset.simbolo = simbolo;
      botao.className = 'celula';
      botao.setAttribute('aria-label', casa);
      if (simbolo in CLASSE_POR_SIMBOLO) {
        if (CLASSE_POR_SIMBOLO[simbolo]) {
          botao.classList.add(CLASSE_POR_SIMBOLO[simbolo]);
        }
      } else {
        botao.classList.add('navio');
        botao.textContent = simbolo;
      }
      if (casa === destaque) {
        botao.classList.add('ultimo');
      }
      if (clicavel(simbolo)) {
        botao.classList.add('clicavel');
        botao.addEventListener('click', () => aoClicar(casa));
        if (aoPassar) {
          botao.addEventListener('mouseenter', () => aoPassar(l, c));
        }
      } else {
        botao.disabled = true;
      }
      container.append(botao);
    });
  });
}

function rotulo(texto) {
  const span = document.createElement('span');
  span.className = 'rotulo';
  span.textContent = texto;
  return span;
}

/** Pinta as 3 casas que o navio ocuparia: verde se cabe, vermelho se não cabe. */
function mostrarPrevia(linha, coluna) {
  limparPrevia();
  ui.ultimaPrevia = [linha, coluna];
  const n = ui.estado.meuMar.length;
  const casas = [];
  for (let i = 0; i < 3; i++) {
    const l = ui.orientacao === 'V' ? linha + i : linha;
    const c = ui.orientacao === 'H' ? coluna + i : coluna;
    casas.push(l < n && c < n ? tela.gradeMinha.querySelector(`[data-linha="${l}"][data-coluna="${c}"]`) : null);
  }
  const cabe = casas.every((b) => b && b.dataset.simbolo === '~');
  casas.filter(Boolean).forEach((b) => b.classList.add(cabe ? 'previa-ok' : 'previa-ruim'));
}

function limparPrevia() {
  tela.gradeMinha.querySelectorAll('.previa-ok, .previa-ruim')
    .forEach((b) => b.classList.remove('previa-ok', 'previa-ruim'));
}

function girar() {
  ui.orientacao = ui.orientacao === 'H' ? 'V' : 'H';
  desenhar();
  if (ui.ultimaPrevia) {
    mostrarPrevia(...ui.ultimaPrevia);
  }
}

function desenharFrota(lista, frota) {
  lista.replaceChildren(...frota.map((navio) => {
    const item = document.createElement('li');
    if (navio.afundado) {
      item.className = 'afundou';
    }
    const simbolo = document.createElement('span');
    simbolo.className = 'simbolo';
    simbolo.textContent = navio.simbolo;
    const nome = document.createElement('span');
    nome.textContent = navio.nome;
    const detalhe = document.createElement('span');
    detalhe.className = 'detalhe';
    if (navio.afundado) {
      detalhe.textContent = 'afundado';
    } else if (navio.avarias !== null) {
      detalhe.textContent = `${navio.avarias}/${navio.tamanho} avariado`;
    } else {
      detalhe.textContent = 'navegando';
    }
    item.append(simbolo, nome, detalhe);
    return item;
  }));
}

// ------------------------------------------------------------ eventos dos botões

function prepararNovaPartidaNaTela() {
  ui.menuAberto = false;
  ui.fimDispensado = false;
  ui.ultimoTiroMeu = null;
  ui.ultimoTiroIA = null;
  ui.ultimaPrevia = null;
  tela.diario.replaceChildren();
  tela.erroInicio.textContent = '';
}

tela.formInicio.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  prepararNovaPartidaNaTela();
  const r = await chamar('POST', '/api/nova', { nome: tela.campoNome.value });
  if (r) {
    anotar('Nova partida! Posicione seus navios.', 'destaque');
  }
});

tela.btnContinuar.addEventListener('click', async () => {
  const anterior = { ...ui };
  prepararNovaPartidaNaTela();
  const r = await chamar('POST', '/api/carregar');
  if (!r) {
    ui.menuAberto = anterior.menuAberto;
    desenhar();
  }
});

tela.btnVoltar.addEventListener('click', () => {
  ui.menuAberto = false;
  desenhar();
});

tela.btnMenu.addEventListener('click', () => {
  ui.menuAberto = true;
  tela.erroInicio.textContent = '';
  desenhar();
});

tela.btnSalvar.addEventListener('click', () => chamar('POST', '/api/salvar'));
tela.btnSortear.addEventListener('click', () => chamar('POST', '/api/sortear'));
tela.btnGirar.addEventListener('click', girar);

tela.btnRevanche.addEventListener('click', () => {
  ui.menuAberto = true;
  ui.fimDispensado = true;
  desenhar();
  tela.campoNome.value = ui.estado.nomeJogador;
  tela.campoNome.focus();
});

tela.btnVerMapa.addEventListener('click', () => {
  ui.fimDispensado = true;
  desenhar();
});

document.addEventListener('keydown', (evento) => {
  if (evento.key.toLowerCase() === 'r' && ui.estado?.fase === 'POSICIONANDO' && evento.target.tagName !== 'INPUT') {
    girar();
  }
});

chamar('GET', '/api/estado');
