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

## `modalidade.js` — o catálogo

A lista de faixas é **dado**, não código: o usuário cria, renomeia,
reordena e remove, e diz os `termos` que identificam cada uma no nome da
conta. De fábrica vêm Presencial, EAD, Médio / Fundamental e a residual.

- **A faixa residual (`RESIDUAL = "COMUM"`) não se remove.** Ela é o
  destino de toda conta sem modalidade — aluguel, PIS/COFINS/ISS,
  depreciação. Renomeável como qualquer outra; sem ela, conta sem
  modalidade cairia num id inexistente e sumiria de toda faixa.
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
- **O catálogo viaja com o resolvedor**, em `modalidadeDe.catalogo`.
  `montarDRE` e `montarDRE51` montam os blocos a partir dele — passar
  resolvedor de um catálogo e lista de outro faria a faixa renomeada
  aparecer com o nome antigo, ou sumir. Já aconteceu uma vez; há teste.

## Onde se edita

Tudo no **De-Para**, e de propósito: a DRE é a tela que se imprime e se
assina, e campo de texto no meio dela convida a editar enquanto se
confere. O nome da conta é editado na linha da própria conta (com o nome
do plano visível embaixo quando os dois diferem); o resto fica no painel
`EditorNomes`, no topo da mesma tela.

## Como isso sai do app

O **perfil** (etapa Classificar) leva apelidos e catálogo junto das
decisões — versão 5. Continua sendo só decisão e texto: nenhum valor,
então o arquivo pode ser versionado, mandado por e-mail ou anexado numa
conversa. É o que transforma renomear 200 contas num ativo em vez de um
trabalho a refazer todo mês, e é o caminho para mandar as edições de volta
para quem mantém o app.
