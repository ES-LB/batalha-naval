# Batalha Naval — Piratas do Console

Batalha naval em console feita em **JavaScript (Node.js 18 ou superior)**, organizada em **MVC** e com **Programação Orientada a Objetos**. Você comanda a frota pirata contra a Marinha Real (o computador). Cada lado tem 3 navios de 3x1 em um mar 8x8. Os turnos se alternam, com um disparo por turno, e vence quem afundar os 3 navios do adversário primeiro.

Não usa nenhuma biblioteca externa, então não precisa de `npm install`.

## Como rodar

No terminal (por exemplo, o do VS Code), dentro da pasta do projeto:

```
node src/index.js     # versão de console (a entrega oficial)
node src/web.js       # versão visual: depois abra http://localhost:3000 no navegador
node --test           # testes automatizados
```

Os mesmos comandos também existem como `npm start`, `npm run web` e `npm test`. Se o PowerShell bloquear o `npm` por política de scripts, use os comandos `node` acima.

O jogo salvo fica em `batalha_naval.sav`, na pasta onde o comando foi executado, e as duas versões usam o mesmo arquivo. Dá para salvar no navegador e continuar no console, ou o contrário. Para usar outro arquivo: `node src/index.js meu_save.sav` ou `node src/web.js 3000 meu_save.sav`.

> No Windows, prefira o Windows Terminal ou o terminal do VS Code. No `cmd` antigo, rode `chcp 65001` antes para os acentos aparecerem certos.

## Versão visual (extra)

A versão oficial, pedida no enunciado, é a de console. A versão visual é um extra que mostra a vantagem do MVC: **o Model é exatamente o mesmo**, e só a View e o Controller mudam.

- `src/web.js`: servidor HTTP do próprio Node, sem bibliotecas externas. Só aceita conexões desta máquina (127.0.0.1).
- `src/controller/WebController.js`: recebe os cliques (pedidos JSON), chama o Model e devolve o estado.
- `src/view/web/`: a página (HTML, CSS e JS). Mostra os mapas e transforma cliques em pedidos. Nenhuma regra do jogo fica no navegador.

Na página você posiciona os navios clicando no seu mar (a tecla R gira o navio, e a prévia fica verde quando cabe e vermelha quando não cabe) ou usa "Sortear tudo". Depois, é só clicar no mar inimigo para atirar.

## Como jogar

- No seu turno, digite o alvo como letra + número (ex.: `B5`).
- `S` salva sem gastar o turno. `Q` sai, perguntando antes se você quer salvar.
- No menu, **2 - Continuar partida salva** retoma o jogo de onde parou.
- Legenda: `~` mar, `o` água, `X` acerto, `#` afundado, `G/F/E` seus navios.

## Arquitetura MVC

```
            ┌──────────────── Controller ────────────────┐
 Usuário ──▶│ JogoController     menu, nova partida,     │
 (teclado)  │                    posicionamento, carregar│
            │ PartidaController  laço de turnos          │
            └──────┬──────────────────────────┬──────────┘
                   │ atualiza                 │ manda desenhar
                   ▼                          ▼
   ┌────────────── Model ─────────────┐   ┌──── View ─────────────┐
   │ Partida, Tabuleiro, Unidade...   │◀──│ ConsoleView (lê o     │
   │ IAComputador                     │   │ Model para desenhar)  │
   │ GravadorJogo / LeitorArquivoJogo │   │ EntradaConsole        │
   └──────────────┬───────────────────┘   └───────────────────────┘
                  ▼
        arquivo de save (.sav)
```

| Camada | Pasta | Responsabilidade |
|---|---|---|
| **Model** | `src/model/` | Dados e regras do jogo: navios, tabuleiros, disparos, turnos, vitória, IA do computador e leitura/gravação do save. Não usa `console` nem lê o teclado. |
| **View** | `src/view/` | Console: mostra os mapas, menus e mensagens (`ConsoleView`) e captura o texto digitado (`EntradaConsole`). Web: a página em `view/web/`. Nas duas, só lê o Model e nunca o altera. |
| **Controller** | `src/controller/` | Interpreta a ação do usuário (texto digitado no console, ou clique na versão web), valida, chama o Model e diz à View o que mostrar. Console: `JogoController` e `PartidaController`. Web: `WebController`. |
| **"Banco de dados"** | arquivo `.sav` | Arquivo texto com a partida salva, acessado somente pelo Model (`model/persistencia`). |

## Onde cada requisito é atendido

| Requisito | Onde está |
|---|---|
| Jogo em console | `view/ConsoleView.js` e `view/EntradaConsole.js` |
| Turnos: jogador e computador | `model/Partida.js` alterna o turno depois de cada disparo válido; `controller/PartidaController.js` conduz o laço |
| 1 disparo por rodada | `Partida.disparar()`: um disparo e o turno passa. Salvar não gasta o turno, e tiro repetido ou inválido é recusado antes de acontecer |
| 3 navios 3x1 por time | `Unidade.TAMANHO = 3` e `criarFrota()` em `FabricaUnidades.js` (Galeão, Fragata e Escuna) |
| Fim quando um time perde as 3 unidades | `Tabuleiro.todasAfundadas()`, verificado em `Partida.disparar()` |
| Classe abstrata base com métodos abstratos e virtuais | `model/unidades/Unidade.js`. Como o JS não tem `abstract`, o construtor impede `new Unidade()` e também recusa subclasses que não implementem os métodos abstratos `getTipo()`, `getSimbolo()` e `getMensagemAfundamento()`. Os virtuais (todo método de classe em JS é virtual) incluem `receberDisparo()`, `estaAfundada()`, `getPosicoes()` e `getDescricao()`. O `Galeao` sobrescreve `getDescricao()` |
| Gravar para retomar depois | `model/persistencia/GravadorJogo.js` (grava num temporário e depois renomeia, para não corromper o save anterior) |
| Classe exclusiva de leitura, com parse de strings e atribuição nas 6 unidades | `model/persistencia/LeitorArquivoJogo.js`: separa os campos `chave=valor` e atribui time, tipo, nome, posição, orientação e avarias às 6 unidades. Recusa arquivos inválidos com a linha do erro |

## POO no projeto

- **Abstração e herança:** `Unidade` (abstrata) é a base de `Galeao`, `Fragata` e `Escuna`.
- **Polimorfismo:** a View chama `getSimbolo()` e `getDescricao()` sem saber o tipo do navio, e cada classe responde do seu jeito.
- **Encapsulamento:** os atributos usam campos privados (`#nome`, `#avarias`...), e o estado só muda pelos métodos (`posicionar`, `receberDisparo`, `setAvarias`).
- **Responsabilidade única:** `Tabuleiro` cuida do mar, `Partida` dos turnos, `IAComputador` da escolha de alvo, `GravadorJogo` e `LeitorArquivoJogo` do arquivo.

## IA do computador

1. **Caçar:** sem pistas, atira nas diagonais em que linha + coluna é múltiplo de 3. Todo navio 3x1 passa por uma delas.
2. **Cercar:** depois de um acerto, atira nas células vizinhas.
3. **Alinhar:** com dois acertos seguidos, continua na linha até afundar o navio.

A IA só enxerga água, acerto e afundado, então não trapaceia. Ela também não guarda estado próprio, por isso nada dela vai para o save.

## Formato do save

```
VERSAO=1
TAMANHO=8
TURNO=JOGADOR
JOGADOR=Ana
UNIDADE|time=JOGADOR|tipo=GALEAO|nome=Vingança da Rainha|linha=1|coluna=3|orientacao=V|avarias=000
... (6 linhas UNIDADE, 3 por time)
DISPAROS|time=JOGADOR|grade=......../......../...
DISPAROS|time=COMPUTADOR|grade=o......./.X....../...
```

`avarias`: um dígito por segmento (1 = atingido). `grade`: linhas separadas por `/`, com `.` (não atirado), `o` (água), `X` (acerto) e `#` (afundado).
