> Leia antes de mexer em `rotulos.js`, `modalidade.js`, `EditorNomes.jsx` ou `useRotulos.js` — ou seja, sempre que a conversa for "como isso se chama" em vez de "para onde isso vai".

# Os nomes editáveis, e o catálogo de modalidades

Duas capacidades que entraram juntas em 18/09/2026 e se apoiam uma na
outra: **renomear qualquer coisa escrita** e **montar a própria lista de
modalidades**.

## A regra que tudo obedece

**Renomear é APARÊNCIA. Valor não se edita.**

- O apelido muda o que se lê na tela, no Excel, no CSV e na impressão.
- O apelido **não** muda para onde a conta vai. `sugerirClassificacao` e
  `modalidadePorNome` continuam lendo o nome ORIGINAL do plano de contas.
  Se o apelido reclassificasse, encurtar "GRADUACAO EAD INSTITUCIONAL"
  para "EAD institucional" moveria a conta de faixa sem ninguém pedir — e
  quem renomeou por estética descobriria no fechamento.
- Campo de valor editável não existe e não deve passar a existir: o
  número vem do balancete, passa pela classificação e chega na tela. Um
  valor digitado faria o app produzir demonstração que não corresponde a
  lançamento nenhum.

## `rotulos.js` — o dicionário de apelidos

Quatro eixos, todos `chave → texto`:

| eixo | chave | o que renomeia |
|---|---|---|
| `contas` | código da conta | a descrição no lugar da que veio do plano |
| `grupos` | id do grupo (`REC_MENSALIDADES`) | a linha da DRE, a coluna do De-Para e o Excel, de uma vez |
| `linhas` | id estrutural (`SEC_DEDUCOES`, `SUB51_OPERACIONAL`) | seções e subtotais das duas demonstrações |
| `categorias51` | id da categoria | os nomes das cinco categorias do CPC 51 |

Detalhes que já foram decididos:

- **O prefixo não é nome.** `( + )` e `( – )` dizem o que a linha faz na
  cascata: são estrutura. A linha se monta como `prefixo + nomeDoGrupo(id)`
  (`linhasDRE.js`), então renomear nunca apaga o sinal da demonstração.
- **Apelido vazio REMOVE a entrada**, e a leitura cai no nome padrão. É
  assim que se desfaz — mesmo gesto da categoria manual do CPC 51.
- **As linhas estruturais têm id** (`LINHAS_ESTRUTURAIS` em `linhasDRE.js`,
  `LINHAS_ESTRUTURAIS_51` em `linhasCPC51.js`). O id é chave de sessão e
  de perfil: mudar um id apaga o apelido que alguém já tinha dado.
- **`limparRotulo` corta controle, espaço repetido e o que passa de 90
  caracteres** — o mesmo texto vai para célula de Excel e para CSV, onde
  quebra de linha rompe o arquivo.

## `modalidade.js` — o catálogo, o alcance e a faixa padrão

A lista de faixas é **dado**, não código: o usuário cria, renomeia,
reordena e remove, e diz os `termos` que identificam cada uma no nome da
conta. De fábrica vêm **Presencial, EAD e Médio / Fundamental** — três, e
só três, porque foi o que o primeiro uso real pediu.

Três perguntas, três respostas do usuário, todas na mesma tela:

| pergunta | resposta |
|---|---|
| quais faixas existem, e como se reconhecem? | o catálogo (`nome` + `termos`) |
| quais contas se dividem? | o **alcance** (`ALCANCE_PADRAO = ["3"]`) |
| onde cai a conta do alcance que o plano não identifica? | a **faixa padrão** (`FAIXA_PADRAO = "PRESENCIAL"`) |

- **O alcance é por prefixo de código, e o padrão é o grupo 3.** É onde a
  modalidade é um fato do plano de contas: mensalidade, taxa, bolsa e
  desconto nascem de um curso. Aluguel, PIS/COFINS/ISS e depreciação
  nascem da instituição inteira, e dividi-los exigiria rateio — número
  que a contabilidade não lançou. Alcance vazio divide tudo.
- **A faixa padrão existe para a faixa "Comum" não existir.** Sem ela,
  toda conta não declarada virava uma terceira faixa embaixo de cada
  tópico, e a demonstração ficava cheia de linha que ninguém queria ler.
  Escolher `RESIDUAL` na tela ("Nenhuma") devolve o comportamento antigo.
- **A escolha manual vence o alcance.** O alcance governa o automático;
  uma conta de despesa que alguém abriu e marcou como EAD é a exceção
  declarada, e desfazê-la apagaria um clique deliberado.
- **A faixa residual (`RESIDUAL = "COMUM"`) não se remove, e não é faixa.**
  Virou o BALDE ESTRUTURAL de quem está fora do alcance: sem ela, a
  despesa cairia num id inexistente e sumiria de toda faixa. Ela não
  aparece no catálogo que se edita (`faixasVisiveis` a filtra) e só vira
  linha quando um mesmo tópico mistura conta de dentro e de fora do
  alcance — aí é ela que faz as faixas fecharem com a linha de cima.
- **Faixa sozinha não vira linha.** Uma única faixa é, por construção, o
  valor da linha logo acima: repeti-la dobra a demonstração e ainda
  afirma mais do que se sabe ("( – ) PIS/COFINS/ISS / Presencial" leria
  como imposto segregado quando o que houve foi o plano não dizer nada).
- **O id nunca muda no rename.** Ele é a chave que as contas decididas à
  mão guardam; regerá-lo apagaria todas de uma vez.
- **Remover não perde conta:** `fazerModalidadeDe` valida contra o
  catálogo e devolve a residual para id que não existe mais.
- **A comparação normaliza os dois lados** (`semAcento`): sem acento, sem
  caixa, e pontuação virando espaço — é o que faz "SEMI-PRESENCIAL" casar
  com o termo "semi presencial" e "MEDIO/FUNDAMENTAL" casar com "médio".
- **Termo casa por palavra inteira, e o mais longo vence.** Sem palavra
  inteira, "presencial" casaria dentro de "semipresencial"; sem o
  desempate por tamanho, a ordem da lista na tela viraria regra escondida
  de classificação.
- **O catálogo viaja com o resolvedor**, em `modalidadeDe.catalogo` — e o
  alcance e a faixa padrão junto (`.alcance`, `.faixaPadrao`).
  `montarDRE` e `montarDRE51` montam os blocos a partir dele — passar
  resolvedor de um catálogo e lista de outro faria a faixa renomeada
  aparecer com o nome antigo, ou sumir. Já aconteceu uma vez; há teste.
- **O padrão do app mora no hook, não na assinatura das funções.** Em
  `modalidade.js`, alcance ausente = não restringe e faixa padrão ausente
  = residual: chamada sem parâmetro nunca decide política por conta
  própria. Quem escolhe `ALCANCE_PADRAO` e `FAIXA_PADRAO` é `useRotulos`,
  e o perfil os carrega.

## Digitar não pode brigar com quem digita

Defeito de 18/09/2026, achado na primeira vez que alguém **escreveu** um
nome em vez de colar: a limpeza rodava a cada tecla e aparava o fim do
texto, então o espaço entre duas palavras nunca chegava a aparecer —
nome de mais de uma palavra era impossível. A vírgula dos `termos` sumia
pelo mesmo motivo, e o campo de nome da conta, cujo valor era o nome do
plano, se recompunha sozinho quando alguém o apagava para reescrever.

A regra que saiu disso, e que vale para todo campo de texto deste app:

- **Normalizar é trabalho de LEITURA e de GRAVAÇÃO, nunca de tecla.**
  `textoDigitado` (só tira caractere de controle e excesso de tamanho)
  roda no `onChange`; `limparRotulo` e `normalizarCatalogo` rodam quando
  o texto vai para a tela, para a planilha ou para o perfil.
- **O estado guarda o que foi digitado.** `useRotulos` mantém o catálogo
  CRU (`catalogoEdicao`, com a vírgula recém-teclada e o nome vazio) e
  entrega o normalizado (`catalogo`) para o resto do app.
- **Campo de nome vale o APELIDO; o nome de fábrica é `placeholder`.** Com
  o padrão como *valor*, apagar para reescrever é impossível: o apelido
  vazio se remove, o valor volta na mesma tecla e o que se digita depois
  gruda no fim do nome antigo.

## Onde se edita

Tudo no **De-Para**, e de propósito: a DRE é a tela que se imprime e se
assina, e campo de texto no meio dela convida a editar enquanto se
confere. O nome da conta é editado na linha da própria conta (com o nome
do plano visível embaixo quando os dois diferem); o resto fica no painel
`EditorNomes`, no topo da mesma tela.

## Como isso sai do app

O **perfil** (etapa Classificar) leva apelidos, catálogo, alcance e faixa
padrão junto das decisões — versão 6. Continua sendo só decisão e texto: nenhum valor,
então o arquivo pode ser versionado, mandado por e-mail ou anexado numa
conversa. É o que transforma renomear 200 contas num ativo em vez de um
trabalho a refazer todo mês, e é o caminho para mandar as edições de volta
para quem mantém o app.
