# Relatório de Desenvolvimento - Batalha Naval

**Proposta 1 - Jogo de Batalha Naval em console**
**Grupo:** Emanuelle Borges, Johny Machado, Luiza Boas e Weberthe Carvalho
**Data:** 25/11/2026

## 1. Situação atual

O jogo está funcionando. Dá pra jogar uma partida inteira contra o computador, salvar, sair e continuar depois. O código está no GitHub: https://github.com/ES-LB/batalha-naval

O que já está pronto:

- jogo em console, com turnos do jogador e do computador e 1 disparo por rodada;
- 3 navios de 3x1 pra cada lado (Galeão, Fragata e Escuna);
- classe abstrata `Unidade`, com métodos abstratos e virtuais, que é a base dos 3 navios;
- salvar o jogo em arquivo e classe exclusiva de leitura (`LeitorArquivoJogo`);
- IA do computador;
- testes automatizados (`node --test`);
- versão visual no navegador (extra);
- documento de requisitos e diagrama de classes.

## 2. Decisões que tomamos

- **Linguagem:** JavaScript com Node.js, porque é a linguagem que estamos usando no curso. A primeira ideia foi fazer em Java, mas trocamos pra ficar igual às outras matérias.
- **Arquitetura:** MVC. O Model tem as regras do jogo e o arquivo de save, a View só mostra as coisas na tela e o Controller faz a ligação entre os dois. Foi isso que permitiu fazer a versão visual depois sem mexer nas regras.
- **Tema:** piratas. O jogador comanda uma frota pirata contra a Marinha Real.
- **Salvar o jogo:** num arquivo de texto (`.sav`) em vez de banco de dados, porque é um jogo de uma pessoa só e um arquivo resolve.

## 3. Dificuldades

- No computador que usamos, dar dois cliques no arquivo `.js` fazia o Windows bloquear, porque ele tenta abrir como script do sistema.
- O comando `npm` não funcionou de primeira: o Node.js não estava instalado. Depois de instalar, o PowerShell bloqueou o `npm` por política de segurança. Resolvemos rodando direto com `node src/index.js`.
- Na hora de subir no GitHub, o navegador não deixava enviar as pastas pelo botão de escolher arquivos. Deu certo arrastando as pastas pra página.

## 4. O que aprendemos

- Como fazer uma classe abstrata em JavaScript, que não tem a palavra `abstract`: o construtor impede `new Unidade()` e obriga as classes filhas a implementar os métodos.
- Como separar o código em MVC na prática.
- Como ler um arquivo de texto, separar os campos e montar os objetos de volta (o parse do save).

## 5. Próximos passos (até 01/12)

Estão no sprint backlog desta semana: testar com pessoas de fora do grupo, revisar o README num computador da faculdade, corrigir o que aparecer e preparar a apresentação.
