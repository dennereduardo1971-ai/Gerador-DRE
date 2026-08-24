# Gerador de DRE — contexto do projeto

Leia isto antes de mexer em qualquer coisa. Este arquivo é o **núcleo**: o
que toda sessão precisa saber antes de tocar em qualquer parte do projeto.
A doutrina detalhada de cada assunto mora em `.claude/docs/`, e você lê
**só o arquivo do assunto que vai mexer** — é isso que mantém o custo de
contexto de uma sessão baixo.

Mantenha os dois atualizados: se você mudar algo que invalida uma frase
daqui ou de `.claude/docs/`, corrija a frase no mesmo commit.

## Índice — quero mudar…

| … isto | leia |
|---|---|
| para onde uma conta vai (padrões, mapa por código, perfis de plano) | `.claude/docs/classificacao.md` |
| a estrutura da DRE, subtotais, rótulos | `.claude/docs/dre.md` |
| a leitura do balancete, a hierarquia, o período | `.claude/docs/balancete.md` |
| a demonstração do CPC 51, MPDA, cronograma | `.claude/docs/cpc51.md` |
| a tabela De-Para | `.claude/docs/depara.md` |
| a apuração fiscal (LALUR, PIS/COFINS) | `.claude/docs/fiscal.md` |
| qualquer tela `.jsx` ou `App.css` | `.claude/docs/visual.md` |
| Excel, CSV, impressão/PDF | `.claude/docs/exportacao.md` |
| o que sai do navegador, injeção, ReDoS | `.claude/docs/seguranca.md` |
| sessão, perfil, "Limpar tudo" | `.claude/docs/persistencia.md` |

`EVOLUCAO.md` é o diário (onde o projeto está agora, o que foi medido, o
que ficou pendente). Este arquivo é doutrina. Sessões antigas ficam em
`EVOLUCAO-ARQUIVO.md`, que não se lê por padrão.

## O que é

App React (Vite) que importa um ou mais balancetes de verificação (CSV
ou Excel) e monta a Demonstração do Resultado do
Exercício — peça de portfólio de
Denner (contábil/fiscal, graduando em Ciências Contábeis). Roda 100% no
navegador, sem backend. Site publicado via GitHub Pages a partir da pasta
`/docs` (que é **saída de build**, não documentação).

**O ESCOPO É A DRE, A APURAÇÃO FISCAL QUE A JUSTIFICA E A TRANSIÇÃO
PARA O CPC 51.** Este app já
teve Painel de indicadores com gráficos e torres 3D, Balanço Patrimonial, análise horizontal em aba própria e uma galeria de
arquivos no GitHub. Tudo isso foi REMOVIDO de propósito, a pedido de quem
usa: cada tela fora desse eixo era uma tela a manter, a explicar e a
conferir sem servir ao objetivo.

A pergunta-filtro antes de acrescentar qualquer coisa: **"isto serve à
DRE, à apuração que prova duas linhas dela, ou à transição para o
CPC 51?"** Se a resposta for "é legal ter", a resposta é não. O histórico
das telas removidas está no Git (ver `EVOLUCAO-ARQUIVO.md`, entrada de
20/08/2026, 4ª sessão) caso alguma precise voltar.

O fiscal entrou no escopo em 24/08/2026 por justificar **duas linhas da
própria DRE**: Deduções da Receita (PIS/COFINS/ISS) e IRPJ/CSLL. Ele
**confere, não apura para recolhimento** — ver `.claude/docs/fiscal.md`.

Link do site: https://dennereduardo1971-ai.github.io/Gerador-DRE/
Repositório: https://github.com/dennereduardo1971-ai/Gerador-DRE

## Quem usa isto e como

Denner não usa terminal no dia a dia (PC da empresa, sem acesso). Se você
está rodando como Claude Code num ambiente COM terminal e credenciais de
git configuradas, pode commitar e dar `git push` direto. Se estiver
ajudando pelo chat do claude.ai sem terminal do lado do usuário, o fluxo
de entrega é: build local → copiar `dist/` para `docs/` → empacotar
`docs/` em zip → o usuário sobe manualmente pelo **Add file → Upload
files** do GitHub (arrastando a pasta) → o Pages atualiza sozinho. Nesse
caso, também vale empacotar o projeto inteiro (sem `node_modules`/`dist`)
como entregável de backup.

## Arquitetura

```
src/
  lib/                       # lógica pura, sem React — testável isolada
    formato.js               # brl, pct, numeroBR, plano de contas de 2 colunas
    importarArquivo.js       # CSV x Excel pela extensão, sempre como linhas cruas
    importarExcel.js         # xlsx/xls/xlsm/xlsb/ods via SheetJS, import()
                              # dinâmico (code-splitting — ver "Armadilhas")
    balancete.js             # a FONTE: balancete de verificação hierárquico
                              # (monta a DRE e traz o plano de contas junto)
    grupos.js                # os grupos da DRE e o sinal de cada um
    classify.js              # sugerirClassificacao() + montarDRE()
    planoPerfil.js           # motor de perfis de plano de contas
    planos/iesb.js           # o plano do IESB, como DADO
    linhasDRE.js             # a DRE como dados (rótulos, sinais, cascata)
    cpc51.js                 # as cinco categorias, a política, a conciliação
    linhasCPC51.js           # a demonstração do CPC 51 como dados
    mpda.js                  # medidas de desempenho da administração
    cronograma51.js          # o cronograma de implementação, como dado
    planoAcao.js             # andamento do plano (localStorage)
    fiscal.js                # LALUR e PIS/COFINS — confere o imposto lançado
    depara.js                # conta → grupo da DRE + categoria do CPC 51,
                              # com a ORIGEM de cada decisão
    exportacao.js            # CSV e Excel da DRE, a partir de linhasDRE
    exportacaoDePara.js      # o De-Para completo em CSV e Excel
    exportacaoCPC51.js       # Excel de seis abas + De-Para + nota
    exportacaoFiscal.js      # LALUR Parte A + memória de PIS/COFINS
    excelEstilo.js           # o visual dos Excel exportados, uma vez só
    historico.js             # histórico local de DREs + sincronização
    githubApi.js             # lê/grava um JSON no repo — o "banco" do histórico
    sessao.js                # persistência da sessão em IndexedDB
    perfil.js                # perfil de classificação salvável em arquivo
    useTema.js               # tema claro/escuro
  components/
    Etapa*.jsx               # uma etapa do fluxo por arquivo
    LinhaDRE.jsx             # Linha/Secao/Cabecalho/Detalhe da DRE
    DePara.jsx               # os dois eixos editáveis na mesma linha
    EtapaFiscal.jsx          # apuração: parâmetros, PIS/COFINS, LALUR
    Eixo.jsx                 # Canal e Balanca — o eixo visual compartilhado
    Icones.jsx               # SVG inline em currentColor (sem biblioteca)
    Inicio.jsx               # "o que eu faço agora?"
  hooks/                     # O ESTADO, fatiado por assunto
    useSessao.js             # restaurar/gravar a sessão, a trava de carga
    useFontes.js             # os balancetes carregados, contas, nomes, plano
    useClassificacao.js      # classif/tocadas/sugestão/DRE/prova/perfis
    useCPC51.js              # política, categorias, MPDA, conciliação
    useFiscal.js             # parâmetros, ajustes do LALUR, apuração
  App.jsx                    # o CASCO: navegação (SECOES), topo de contexto,
                              # menu lateral e o <main>. As Etapas são "burras"
                              # (recebem props, chamam callbacks).
  App.css                    # design system em variáveis CSS; tema escuro é
                              # o seletor :root[data-tema="dark"]
```

Fluxo do app: **Importar → Conferir → Classificar → DRE**. As demais abas
são vistas paralelas sobre o mesmo estado agregado (`contas`, calculado
uma vez em `useFontes`).

**O balancete de verificação é a ÚNICA fonte** desde 24/08/2026. Ele já
passou pelo fechamento da contabilidade, monta a DRE sozinho e traz o
plano de contas junto. O razão contábil foi removido: o que ele fazia de
único (competência mês a mês) hoje se resolve carregando **vários
balancetes ao mesmo tempo** — cada arquivo declara o próprio período e
vira uma coluna da Comparativa e a coluna comparativa do CPC 51. Ver
`.claude/docs/balancete.md`.

**O estado mora em `src/hooks/`, não no `App.jsx`.** Cada hook é dono de
um assunto e sabe se salvar e se restaurar sozinho (`sessao.dados`,
`sessao.restaurar`, `sessao.limpar`); `useSessao` só junta as partes.
Assunto novo entra sem que ninguém precise lembrar de mexer em três
lugares — e mexer no CPC 51 deixa de exigir ler a importação de arquivo.

**A navegação é dado, não JSX.** `SECOES` em `App.jsx` descreve cinco
seções, cada uma agrupando abas que respondem à mesma pergunta. **Início**
fica solto acima delas, porque não pertence a nenhuma:

| Seção | Pergunta | Abas |
|---|---|---|
| — | o que eu faço agora? | Início |
| Fluxo | como eu chego na DRE? | Importar → Conferir → Classificar → DRE |
| Parâmetros | para onde vai cada conta? | De-Para |
| Fiscal | o imposto lançado está certo? | Apuração |
| Acompanhamento | como ela se moveu, e o que já foi fechado? | Comparativa, Histórico |
| CPC 51 · 2027 | como isso fica em 2027? | Demonstração, Plano de ação |

São **onze abas no total**, e esse número é para ser defendido. Já foram
quatorze; o corte de 20/08/2026 tirou Painel, Balanço e Arquivos e fundiu
Horizontal na Comparativa. Aba nova precisa passar pela pergunta-filtro do
escopo lá em cima.

Quatro coisas a não desfazer aqui:

- **Só "Fluxo" é numerado**, porque só ele é sequencial de verdade. O
  número pendura no canto do ícone em vez de substituí-lo, para o ícone
  continuar sendo o que se reconhece de relance no trilho recolhido; as
  outras seções não recebem número nenhum, para não fingirem ser passos
  5, 6 e 7.
- **A regra de "quando esta aba abre" se escreve uma vez**, em
  `abaDisponivel()`. Ela governa o menu E o estado vazio do `<main>`; eram
  duas cópias antes, e aba nova aberta no menu caía em tela branca quando
  alguém esquecia da segunda.
- **Parâmetros e Fiscal são seções próprias.** De-Para é cadastro, não
  leitura de resultado — e cadastro que se procura junto de análise é
  cadastro que ninguém acha. A Apuração responde outra pergunta ainda
  ("o que a contabilidade lançou está certo?"): dentro da DRE sumiria na
  rolagem, dentro de Parâmetros fingiria ser cadastro.
- **Início não analisa.** Ele responde "por onde começo e o que está me
  esperando": estado do arquivo, um único próximo passo, pendências e
  atalhos. Os números do topo situam, não concluem. Pôr cascata, ranking
  ou gráfico ali refaz o Painel que acabou de ser removido.

O estado de cada aba (`estadoDaAba`) aparece como **selo** ao lado do
nome: um número (`17` contas, `3` a resolver) ou `!`/`✓`. Selo em **âmbar**
— nunca vermelho, que aqui pertence ao dado — marca pendência. O selo é
`aria-hidden` e o significado por extenso vai no `aria-label` do botão
("De-Para — 3 contas a resolver"), porque "3" sozinho não diz nada a quem
usa leitor de tela.

## Armadilhas conhecidas (não repita)

Cada uma destas já custou caro pelo menos uma vez. Ficam **aqui**, no
núcleo, porque são o que a próxima sessão precisa saber antes de escolher
um caminho — a explicação completa está no `.claude/docs/` indicado.

**Build e bibliotecas**

- **Papaparse com `worker: true` quebra em produção.** Funciona em `npm
  run dev` e quebra no build publicado com `charCodeAt is not a function`
  — o worker tenta carregar um script por URL que não resolve no bundle.
  Não ative worker sem testar contra um build real publicado.
- **`xlsx` e `exceljs` só por `import()` dinâmico.** Import estático põe
  ~350 kB (`xlsx`) e ~271 kB gzip (`exceljs`) no bundle principal de quem
  nunca exporta nada. → `.claude/docs/exportacao.md`
- **`xlsx` (SheetJS Community) NÃO escreve estilo de célula.** `cell.s` é
  aceito no objeto e ignorado ao gravar; só `cell.z` (formato numérico)
  chega no arquivo. Já esteve neste código como código morto. Estilo é
  trabalho do `exceljs`. → `.claude/docs/exportacao.md`
- **A vulnerabilidade conhecida do `xlsx` do npm** (prototype pollution +
  ReDoS, sem correção nessa distribuição) é **aceita conscientemente**:
  app roda só no navegador do próprio usuário, sobre arquivo que ele mesmo
  escolheu abrir. Não troque de lib sem avisar — `exceljs` não lê `.xls`
  legado. → `.claude/docs/seguranca.md`

**Dado do cliente**

- **Nunca escreva VALOR real em comentário, teste ou documentação.** Saldo,
  total de Ativo, débito do período e resultado do exercício já vazaram
  mais de uma vez por essa porta — copiados do arquivo real para dentro de
  comentário "só para ilustrar". Num repositório público, isso é a
  demonstração financeira de uma instituição identificada. Para ilustrar
  formato, use número fictício e **diga que é exemplo**. Pode-se citar
  ESTRUTURA (código de conta, nome de conta-síntese, níveis), nunca
  quantia.
- **Nunca commite os arquivos reais** de balancete/plano de contas —
  ficam em `fixtures/`, que está no `.gitignore`.

**Números e planilha**

- **Número gerado pelo app não pode passar por `neutralizarFormula`.** Ela
  prefixa com aspa simples tudo que começa com `- = + @` — defesa certa
  para TEXTO vindo do plano de contas, errada para valor: `dec(-40000)`
  vira texto que o Excel não soma, e o destino do arquivo é conferência
  por totais. Separe `celulaTexto` de `celulaNumero`. →
  `.claude/docs/exportacao.md`
- **Célula numérica nativa do Excel não se formata como texto antes de
  somar.** `raw: false` no SheetJS introduz ambiguidade de locale
  ("1,234.56" americano vira "1.23456" se tratado como BR). Deixe número
  nativo; `numeroBR()` lida com número OU string.
- **Zero à esquerda em conta armazenada como número numa célula Excel** se
  perde — é do próprio Excel, não tem solução do nosso lado. Documentado
  no README.

**Contabilidade**

- **Sugestão fiscal NÃO entra na soma até ser aceita.** Somar as
  adições sugeridas por padrão produz um lucro real que parece calculado
  e é um chute sobre a dedutibilidade de cada provisão. Enquanto houver
  ajuste pendente, a apuração se declara incompleta.
  → `.claude/docs/fiscal.md`
- **`DED_IMPOSTOS` mistura PIS, COFINS e ISS numa linha só.** Confrontar
  o grupo inteiro com PIS + COFINS dá divergência sempre. E `SOBRE
  SERVIÇO` **não** identifica o ISS: é a frase que os três usam, e com
  ela no padrão a conta-síntese genérica virava ISS.
- **`montarDRE` soma o saldo COM SINAL, não a magnitude.** Grupos como
  Provisões misturam despesa (nova provisão) e receita (reversão) na mesma
  linha; `Math.abs` por conta perde o líquido e infla o grupo. →
  `.claude/docs/dre.md`
- **Período é o que o ARQUIVO declara, não o que o app deduz.** O
  balancete traz "Data Inicial"/"Data Final" na aba de parâmetros;
  `periodoDoBalancete` lê e `identidadeDoPeriodo` transforma em chave
  ordenável + rótulo. A versão anterior deduzia o período dos
  lançamentos e errou em cinco lugares ao mesmo tempo.
- **Ordenar período como texto põe o mês na frente do ano.**
  `['12/2025','01/2026'].sort()` inverte, e cada período passa a ser
  comparado com o "anterior" errado, sem sinal na tela. Por isso a chave
  de ordenação é `AAAAMMDD` (`identidadeDoPeriodo`).
- **Natureza de conta zerada NÃO se decide por `saldo > 0`.** Movimento
  zero cai no ramo `else` — o de despesa — e manda toda conta de receita
  sem movimento para `DESP_ADM` em silêncio. Use `ehCredora()`
  (`grupos.js`), que desempata pela natureza do saldo do balancete e
  devolve `null` quando não há o que deduzir. **`null` não é "despesa".**
  → `.claude/docs/classificacao.md`
- **Conta zerada afrouxa estatística por maioria.** O fallback de
  `sugerirClassificacao` decide por `contagem/n >= 0.5`; contas sem
  movimento aumentam `n` sem aumentar `contagem`, e a classificação de
  contas COM movimento muda sozinha. Só contas com movimento votam.
- **O balancete das contas 1 e 2 NÃO fecha, e não deve fechar.** A
  diferença é o resultado do exercício, que vive nas contas 3 a 7. Nunca
  trate isso como erro de importação. → `.claude/docs/balancete.md`

**CSS e acessibilidade**

- **Classe nova em `App.css` pode colidir em silêncio.** São mais de 1.700
  linhas e nomes curtos já estão tomados. Redeclarar não dá erro: a
  declaração de baixo vence e o elemento novo aparece torto. Nenhum teste
  pega. **`grep` pelo nome antes de criar**, e prefira prefixo de contexto
  (`ctx-chip`, `dp-motivo`, `fisc-linha`).
- **Ordem de regras CSS com mesma especificidade decide por SOURCE ORDER**,
  não por "estar dentro de `@media`". Declare o `display: none` de tela
  ANTES do `@media print` que o sobrescreve, nunca depois.
- **`transform` esconde visualmente mas NÃO tira da ordem de tabulação nem
  da árvore de acessibilidade.** Off-canvas acessível precisa de
  `visibility: hidden` (ou `inert`) junto, com atraso na transição só do
  lado de fechar. → `.claude/docs/visual.md`
- **Célula de texto longo em `.tabela-cartao` precisa de `td.desc`.** Sem
  isso a coluna `auto` engorda e espreme a outra até sobrar uma tira de
  40px com uma palavra por linha. → `.claude/docs/visual.md`

## Como testar

Duas camadas, e as duas importam:

1. **Vitest** (`npm test`) — testes em `src/lib/__tests__/`, com balancete
   sintético. Rodam em qualquer máquina, sem dado real. Eles congelam de
   propósito as decisões que já custaram caro: a separação custo/fopag,
   Prouni fora de Bolsas, provisões em duas linhas, a soma líquida
   (reversão reduz despesa), a hierarquia de subtotais, a igualdade entre
   o lucro líquido das duas estruturas (CPC 51) e o acordo entre as duas
   tabelas De-Para. Se um deles ficar vermelho depois de uma mudança sua,
   **presuma regressão até provar o contrário.**
2. **`node fixtures/validar.mjs`** — a validação contra a DRE real, mês a
   mês, centavo a centavo. Insubstituível: o Vitest prova que a lógica não
   mudou, só o arquivo real prova que ela está certa. Rode sempre que
   mexer em `classify.js`, `balancete.js` ou `planoPerfil.js`. Precisa dos
   arquivos em `fixtures/`, que estão no `.gitignore` — **se você está numa
   máquina sem eles, diga isso ao usuário em vez de fingir que validou.**

Também: `npx oxlint src/` (zero avisos em `src/`) e `npm run build`.

## Build e publicação

Desde a integração contínua, **publicar é só dar push na `main`**: o
workflow builda e commita `docs/` sozinho. `.github/workflows/ci.yml` roda
lint, testes e build em todo push e PR. `docs/**` está no `paths-ignore` de
propósito — o job de publicação commita nessa pasta, e sem a exclusão cada
publicação dispararia outra, em loop.

O passo manual continua valendo para conferir o build localmente antes:

```bash
npm install
npm test
npm run build                    # gera dist/
rm -rf docs && cp -r dist docs   # normalmente desnecessário: o CI faz
```

`vite.config.js` usa `base: './'` (caminho relativo) de propósito —
funciona tanto em GitHub Pages num subcaminho (`/Gerador-DRE/`) quanto
aberto localmente, sem reconfigurar nada.

## Skills e agentes deste projeto

Skills (`.claude/skills/`) — instruções que uma sessão carrega para fazer
uma tarefa do jeito deste projeto:

| Skill | Quando |
|---|---|
| `manter-evolucao` | fechar a sessão: medir, registrar em `EVOLUCAO.md`, corrigir a doutrina no mesmo commit |
| `nova-funcionalidade` | tela, módulo ou capacidade nova — inclusive os módulos do caminho para ERP |
| `ajustar-classificacao-dre` | mudar para onde uma conta vai (padrões, mapa por código, perfis, categorias) |
| `testar-com-arquivo-real` | validar contra os balancetes e a DRE reais de `fixtures/`, e ser honesto quando eles não estão na máquina |
| `otimizar-app` | desempenho, bundle e código morto — medindo antes e depois |
| `build-e-publicar` | levar a mudança ao site, com e sem terminal do lado do usuário |

Agentes (`.claude/agents/`) — sessões especializadas para revisar ou
planejar:

| Agente | Para quê |
|---|---|
| `auditor-contabil` | "esta mudança alterou algum número que não devia mudar?" — invariantes, testes congelados, validação real |
| `revisor-visual` | sistema visual "Razão" e o piso de acessibilidade: paleta, 390px, foco, temas, impressão |
| `arquiteto-erp` | desenhar o próximo módulo rumo a ERP, reusando o núcleo em vez de reescrevê-lo |

A doutrina mora **neste arquivo e em `.claude/docs/`**: as skills apontam
para eles em vez de duplicá-los. Quando uma decisão mudar, mude na
doutrina — se a frase correspondente numa skill deixar de bater, corrija a
skill no mesmo commit.

## Ideias de expansão (backlog, não compromissos)

Na ordem que eu (Claude) priorizaria. A lista viva, com o que foi medido
em cada sessão, está em `EVOLUCAO.md`:

1. **Editor de perfil de plano a partir do De-Para** — hoje dá para
   CARREGAR um perfil de plano, mas criar um do zero ainda exige escrever
   o JSON à mão. Com o De-Para mostrando origem → destino → origem da
   decisão, gerar o arquivo a partir dessas decisões é um botão e uma
   serialização, e fecha o ciclo "atender cliente novo sem commit e sem
   build".
2. **Comparativa na estrutura do CPC 51 na tela** — a norma exige 2027
   contra 2026 reapresentado (Fase 8, passo 36). O Excel exportado já traz
   a coluna comparativa; `EtapaComparativo` ainda só monta colunas na
   estrutura antiga.
3. **Ler de volta o De-Para preenchido fora do app** — hoje o arquivo só
   sai. O cuidado está em `EVOLUCAO.md`: aplicar tudo do arquivo apagaria
   decisão manual em silêncio.
4. **Seletor de aba do Excel** — `importarExcel.js` escolhe sozinho a aba
   com mais cara de conta; já devolve `abas`, falta UI para o caso em que
   ele escolhe errado.
5. **LALUR Parte B** — controle das diferenças temporárias ao longo do
   tempo. A Parte A (a apuração do período) já existe.
6. **Créditos de PIS/COFINS no não cumulativo** — hoje o regime muda a
   alíquota e diz na tela que os créditos não são calculados.
7. **Comparativa a partir do Histórico** — hoje ela lê só os balancetes
   carregados na sessão. Cruzar com o histórico salvo daria a série
   inteira sem manter todos os arquivos abertos.

O que NÃO está no backlog, e não é esquecimento: indicadores, gráficos,
Balanço Patrimonial, galeria de arquivos, importação de razão. Ver "O que
é", no topo.
