'use strict';

/**
 * Versão visual (navegador) do jogo. Usa o mesmo Model da versão de console;
 * só muda a View (página HTML) e o Controller (WebController).
 *
 * Uso: node src/web.js [porta] [arquivo_de_save]
 * Depois abra http://localhost:3000 no navegador.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebController } = require('./controller/WebController');

const PORTA = Number(process.argv[2]) || 3000;
const ARQUIVO_SAVE = process.argv[3] || 'batalha_naval.sav';
const PASTA_VIEW = path.join(__dirname, 'view', 'web');
const LIMITE_CORPO = 10 * 1024;

/** Só estes arquivos podem ser servidos (evita acesso a qualquer outro arquivo do disco). */
const ARQUIVOS_ESTATICOS = {
  '/': { arquivo: 'index.html', tipo: 'text/html; charset=utf-8' },
  '/estilo.css': { arquivo: 'estilo.css', tipo: 'text/css; charset=utf-8' },
  '/app.js': { arquivo: 'app.js', tipo: 'text/javascript; charset=utf-8' },
};

const controller = new WebController({ caminhoSave: ARQUIVO_SAVE });

function responderJson(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolver, rejeitar) => {
    let texto = '';
    req.setEncoding('utf8');
    req.on('data', (parte) => {
      texto += parte;
      if (texto.length > LIMITE_CORPO) {
        rejeitar(new Error('Pedido grande demais.'));
        req.destroy();
      }
    });
    req.on('end', () => resolver(texto));
    req.on('error', rejeitar);
  });
}

const servidor = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) {
      let dados = {};
      if (req.method === 'POST') {
        const texto = await lerCorpo(req);
        try {
          dados = texto ? JSON.parse(texto) : {};
        } catch {
          responderJson(res, 400, { erro: 'JSON inválido.' });
          return;
        }
      }
      const { status, corpo } = controller.executar(req.method, pathname, dados);
      responderJson(res, status, corpo);
      return;
    }

    const estatico = req.method === 'GET' ? ARQUIVOS_ESTATICOS[pathname] : null;
    if (!estatico) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado.');
      return;
    }
    const conteudo = fs.readFileSync(path.join(PASTA_VIEW, estatico.arquivo));
    res.writeHead(200, { 'Content-Type': estatico.tipo, 'Cache-Control': 'no-store' });
    res.end(conteudo);
  } catch (erro) {
    console.error('Erro inesperado:', erro);
    if (!res.headersSent) {
      responderJson(res, 500, { erro: 'Erro interno no servidor.' });
    } else {
      res.end();
    }
  }
});

servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE') {
    console.error(`A porta ${PORTA} já está em uso. Tente outra: node src/web.js 3001`);
  } else {
    console.error('Não foi possível iniciar o servidor:', erro.message);
  }
  process.exitCode = 1;
});

// Escuta só nesta máquina: ninguém de fora da rede acessa o jogo.
servidor.listen(PORTA, '127.0.0.1', () => {
  console.log('Batalha Naval (versão visual) rodando!');
  console.log(`Abra no navegador: http://localhost:${PORTA}`);
  console.log('Para encerrar, aperte Ctrl + C aqui no terminal.');
});
