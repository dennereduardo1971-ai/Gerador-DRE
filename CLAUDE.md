# Gerador de DRE — contexto do projeto

Leia isto antes de mexer em qualquer coisa. Este arquivo é o que faz
uma sessão nova de Claude Code entender o projeto sem eu precisar
reexplicar tudo. Mantenha-o atualizado: se você mudar algo que
invalida uma frase daqui, corrija a frase no mesmo commit.

## O que é

App React (Vite) que importa um razão contábil (CSV ou Excel) e monta
a Demonstração do Resultado do Exercício, Balanço Patrimonial
simplificado, análise horizontal e histórico de DREs — peça de
portfólio de Denner (contábil/fiscal, graduando em Ciências Contábeis).
Roda 100% no navegador, sem backend. Site publicado via GitHub Pages
a partir da pasta `/docs`.

Link do site: https://dennereduardo1971-ai.github.io/Gerador-DRE/
Repositório: https://github.com/dennereduardo1971-ai/Gerador-DRE

## Quem usa isto e como

Denner não usa terminal no dia a dia (PC da empresa, sem acesso). Se
você está rodando como Claude Code num ambiente COM terminal e
credenciais de git configuradas, pode commitar e dar `git push`
direto. Se estiver ajudando pelo chat do claude.ai sem terminal do
lado do usuário, o fluxo de entrega é: build local → copiar `dist/`
para `docs/` → empacotar `docs/` em zip → o usuário sobe manualmente
pelo **Add file → Upload files** do GitHub (arrastando a pasta) → o
Pages atualiza sozinho. Nesse caso, também vale empacotar o projeto
inteiro (sem `node_modules`/`dist`) como entregável de backup.

## Arquitetura

```
src/
  lib/                       # lógica pura, sem React — testável isolada
    parse.js                 # leitura do CSV, normalização de número/encoding,
                              # agregação por conta e por competência (mês/ano)
    importarArquivo.js       # ponto único: decide CSV x Excel pela extensão
    importarCSV.js           # CSV em chunks, com progresso real (SEM worker —
                              # ver "Armadilhas conhecidas" abaixo)
    importarExcel.js         # xlsx/xls/xlsm/xlsb/ods via SheetJS, import()
                              # dinâmico (code-splitting — não deixe virar
                              # import estático, ver "Armadilhas")
    classify.js               # GRUPOS da DRE + sugerirClassificacao()
                              # (o coração do projeto — ver seção própria)
    balanco.js                 # Balanço Patrimonial simplificado (contas 1/2)
    exportCsv.js               # exportação da DRE final em CSV
    historico.js                # histórico local de DREs (localStorage) +
                                 # sincronização com githubApi.js
    githubApi.js                 # lê/grava um arquivo JSON no repo via API do
                                  # GitHub — o "banco de dados" do histórico
    useTema.js                    # tema claro/escuro
  components/
    Etapa*.jsx                  # uma etapa do fluxo por arquivo
    LinhaDRE.jsx                 # Linha/Secao/Detalhe reutilizados na DRE
    SincronizacaoGitHub.jsx       # painel de config da sincronização
  App.jsx                        # dono de todo o estado; as Etapas são
                                  # "burras" (recebem props, chamam callbacks)
  App.css                        # design system em variáveis CSS (--ink,
                                  # --paper, --viridian etc.) — tema escuro é
                                  # um seletor `:root[data-tema="dark"]` que
                                  # sobrescreve as mesmas variáveis
```

Fluxo do app: Importar → Conferir → Classificar → DRE, com Balanço,
Horizontal e Histórico como abas paralelas que dependem do mesmo
estado agregado (`contas`, calculado uma vez em `App.jsx` via
`agregarPorConta`).

## O coração do projeto: classificação de contas

`sugerirClassificacao()` em `classify.js` decide em qual grupo da DRE
(`GRUPOS`) cada conta de resultado cai. Isto NÃO é um classificador
genérico — foi calibrado e testado contra o plano de contas real de
uma instituição de ensino (IESB), então entenda o raciocínio antes de
mudar:

1. **Decisão é por conta individual**, não por maioria de um grupo de
   contas. Isso já foi tentado (maioria por prefixo de 3 dígitos) e
   quebrou contra dados reais: o mesmo prefixo pode conter sub-contas
   de grupos completamente diferentes (ex. um prefixo com Bolsas,
   Descontos, Devoluções e Impostos misturados).
2. Cada conta é testada contra um **texto enriquecido**: histórico dos
   lançamentos + nome da própria conta (se houver plano de contas
   importado) + nome de **cada conta ancestral** no plano de contas
   (cortando o código um dígito de cada vez). Isso resolve o caso comum
   de conta-folha com nome genérico cuja natureza real só aparece no
   nome da conta-síntese pai.
3. **A ordem dos padrões `PAT_*` importa.** Padrões mais específicos
   têm que vir antes dos mais genéricos, porque termos se sobrepõem em
   plano de contas real:
   - `PROVISAO IRPJ`/`PROVISAO CSLL` bate em "provisão" E em "IRPJ/CSLL"
     → IRPJ/CSLL tem que ser checado antes de Provisões.
   - `PIS S/FOLHA PAGAMENTO` (encargo trabalhista, grupo Fopag) bate em
     "PIS" igual a `(-)PIS` (imposto sobre receita, grupo Deduções) →
     Fopag é checado antes de Impostos.
4. Sem plano de contas importado, cai num **fallback por maioria do
   prefixo de 3 dígitos** (o comportamento antigo, mais grosseiro, mas
   que não depende de nome nenhum).
5. Classificações manuais do usuário (`classif` em `App.jsx`) sempre
   têm prioridade sobre a sugestão automática — importar um novo plano
   de contas nunca desfaz uma escolha manual.

**Antes de mudar um padrão `PAT_*` ou a ordem de prioridade**, rode
contra um arquivo real (ver skill `testar-com-arquivo-real`) e
confira: (a) nenhuma conta sobra em "Não entra na DRE" quando há plano
de contas, (b) a soma de todos os grupos bate com a soma absoluta de
todas as contas de resultado (nada se perde ou duplica), (c) o
Lucro Líquido final não muda por acaso — se mudar, entenda por quê
antes de aceitar.

## Regras da DRE (estrutura fixa em `montarDRE`)

```
Receita Bruta = Mensalidades + Taxas
Receita Líquida = Receita Bruta − Deduções (Bolsas + Prouni + Devoluções + Descontos + Impostos)
Resultado Operacional Bruto = Receita Líquida − Custos
Despesas Operacionais = Fopag + Administrativas + Depreciação + Provisões
Resultado Financeiro = Receitas Financeiras − Despesas Financeiras
Resultado Operacional = Resultado Operacional Bruto − Despesas Operacionais + Resultado Financeiro
Não Operacional = Outras Receitas − Outras Despesas
Antes do IR = Resultado Operacional + Não Operacional
Lucro Líquido = Antes do IR − IRPJ/CSLL
```

Essa hierarquia foi calibrada contra uma DRE real (formato
`DRE-BALANÇO_INTERMEDIÁRIOS`, seções em caixa alta com prefixo
`( + )`/`( – )`/`( = )`). Se for generalizar para outro tipo de
empresa (comércio, indústria), ANTES de mexer na estrutura, considere
se dá para fazer só adicionando um grupo novo em `GRUPOS` — é bem mais
seguro que reescrever a hierarquia de subtotais.

## Armadilhas conhecidas (não repita)

- **Papaparse com `worker: true` quebra em produção.** Funciona em
  `npm run dev` mas quebra no build publicado (GitHub Pages, qualquer
  subcaminho) com um erro `charCodeAt is not a function` vindo de um
  script com nome de UUID — é o worker tentando carregar um script por
  URL que não resolve no bundle empacotado. `importarCSV.js` usa
  `worker: false` com `parser.pause()/resume()` de propósito. Não
  reverta isso sem testar contra um build real publicado.
- **`xlsx` (SheetJS) tem que ser `import()` dinâmico**, não import
  estático — senão o bundle principal engorda ~350KB pra quem só usa
  CSV. Ver `importarExcel.js`.
- **Números de Excel com célula numérica nativa**: não formate como
  texto antes de somar (`raw: false` no SheetJS introduz ambiguidade
  de locale — "1,234.56" americano vira "1.23456" se tratado como
  BR). Deixe como número nativo do JS; `numeroBR()` em `parse.js` já
  lida bem com número OU string.
- **Zero à esquerda em conta armazenada como número numa célula
  Excel** se perde — isso é do próprio Excel, não é bug do app.
  Documentado no README, não tem solução no nosso lado.
- **A vulnerabilidade conhecida do pacote `xlsx` do npm** (prototype
  pollution + ReDoS, sem correção nessa distribuição) é aceita
  conscientemente — app roda só no navegador do próprio usuário,
  processando arquivo que ele mesmo escolhe abrir. Documentado no
  README. Não troque de lib sem avisar, `exceljs` (a alternativa mais
  óbvia) não lê `.xls` legado.
- **Nunca commite os arquivos reais de razão/plano de contas do
  Denner** (números financeiros de instituição real) — ficam em
  `fixtures/`, que está no `.gitignore`.

## Como testar

Não tem framework de teste formal ainda (ver "Ideias de expansão"
abaixo — Vitest seria o próximo passo natural, já que `src/lib` é
puro e fácil de testar). O jeito atual é escrever um script Node ESM
ad-hoc que importa direto de `src/lib` e roda contra um arquivo real
em `fixtures/`. Ver a skill `testar-com-arquivo-real` para o padrão.

## Build e publicação

```bash
npm install
npm run build        # gera dist/
rm -rf docs && cp -r dist docs
git add -A && git commit -m "..." && git push   # se tiver credenciais
```

O `vite.config.js` usa `base: './'` (caminho relativo) de propósito —
funciona tanto em GitHub Pages num subcaminho (`/Gerador-DRE/`) quanto
aberto localmente, sem precisar reconfigurar nada.

## Skills deste projeto

- `.claude/skills/testar-com-arquivo-real/` — como validar mudanças em
  `parse.js`/`classify.js` contra um razão e plano de contas reais,
  sem quebrar nada silenciosamente.
- `.claude/skills/ajustar-classificacao-dre/` — como adicionar ou
  recalibrar um padrão de classificação com segurança (ordem de
  prioridade, os testes que rodar antes de aceitar).
- `.claude/skills/build-e-publicar/` — o fluxo de build + deploy,
  adaptado conforme você tiver ou não acesso a terminal/git push.

## Ideias de expansão (backlog, não compromissos)

Coisas que fariam sentido crescer, na ordem que eu (Claude) priorizaria:

1. **Testes automatizados (Vitest)** para `src/lib` — hoje toda
   validação é manual via script ad-hoc; formalizar isso pegaria
   regressão de graça a cada mudança em `classify.js`.
2. **Seletor de aba do Excel** — hoje `importarExcel.js` escolhe a
   primeira aba com dados automaticamente; se um arquivo real vier com
   mais de uma aba relevante, precisa de UI pra escolher.
3. **Balanço Patrimonial mais fiel** — hoje é só a movimentação do
   arquivo importado (documentado, com aviso na tela). Para ficar
   fiel de verdade precisaria de saldo de abertura por conta, o que é
   um tipo de dado que o razão sozinho não traz.
4. **Deploy automático via GitHub Actions** — hoje o `docs/` é
   commitado manualmente a cada mudança; um workflow que builda e
   publica sozinho a cada push na `main` eliminaria esse passo.
5. **Exportar a DRE em PDF/Excel formatado**, não só CSV — mais
   apresentável para portfólio.
