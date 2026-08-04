# Gerador de DRE

Importa um razão contábil (CSV) e monta a Demonstração do Resultado do
Exercício — conferência de partidas dobradas, classificação de contas de
resultado (com sugestão automática) e a demonstração final com análise
vertical, detalhe por conta e exportação em CSV. Também monta um Balanço
Patrimonial simplificado, uma análise horizontal (variação % entre meses)
e mantém um histórico local de DREs geradas para comparação.

A estrutura da demonstração (receita bruta com mensalidades e taxas,
deduções detalhadas, custos, despesas operacionais, financeiro, não
operacional e IRPJ/CSLL) foi calibrada a partir de uma DRE real de uma
instituição de ensino — mas o app funciona com qualquer razão que traga
conta e valor de débito/crédito em colunas separadas.

## Etapas

1. **Importar** — CSV do razão, lido em streaming (sem travar a página
   mesmo com dezenas de milhares de linhas), com barra de progresso real.
2. **Conferir** — totais, teste de partidas dobradas, filtro por
   **competência** (mês/ano — isola a DRE e o Balanço num mês só) e por
   dia específico ou centro de custo, mapeamento manual de colunas.
3. **Classificar** — sugestão automática de grupo por conta, ajustável.
4. **DRE** — demonstração final, com opção de salvar no histórico local.
5. **Balanço** — contas 1 (ativo) e 2 (passivo/PL), com aviso claro de que
   reflete a movimentação do arquivo, não necessariamente o saldo
   patrimonial acumulado (depende do razão trazer o saldo de abertura).
6. **Horizontal** — variação % de cada linha da DRE entre competências
   (mês/ano), quando o arquivo cobre mais de um mês.
7. **Histórico** — DREs salvas no navegador (localStorage), com
   comparação lado a lado entre duas, e sincronização opcional com um
   arquivo JSON dentro de um repositório do GitHub (ver seção abaixo).

## Sincronização com GitHub (salvamento em nuvem simples)

O histórico de DREs pode ser sincronizado com um arquivo JSON dentro de
um repositório do GitHub, usando a própria API de Conteúdo do GitHub —
sem precisar de servidor: o navegador fala direto com `api.github.com`.

Na aba **7 · Histórico**, em "Sincronização com GitHub", preencha:
- usuário/organização e nome do repositório
- branch (padrão `main`)
- caminho do arquivo (padrão `data/historico.json`)
- um token do GitHub

**Sobre o token:** crie um [fine-grained personal access
token](https://github.com/settings/personal-access-tokens), restrito
só a este repositório, com permissão de **Contents: Read and write**.
Nunca use um token clássico com acesso à conta inteira — o token fica
salvo no `localStorage` do navegador, então quanto mais restrito, melhor.

Ao clicar em "Sincronizar agora", o app busca o que já está no
repositório, mescla com o que está só no navegador atual (sem perder
nada de nenhum dos dois lados) e grava o resultado de volta — tanto
localmente quanto no GitHub. Isso dá um jeito rápido de ter o mesmo
histórico em mais de um navegador/computador, sem montar um backend de
verdade.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview   # serve o build local pra conferir
```

Gera `dist/`, estático — dá pra publicar em qualquer host (Vercel,
Netlify, GitHub Pages, etc.).

## Estrutura

```
src/
  lib/
    parse.js        # leitura do CSV, normalização de número/encoding, agregação por conta e competência
    importarCSV.js  # importação em streaming (worker) com progresso real
    classify.js     # grupos da DRE e sugestão automática de classificação
    balanco.js       # Balanço Patrimonial simplificado (contas 1 e 2)
    exportCsv.js     # exportação da DRE final em CSV
    useTema.js       # hook de tema claro/escuro (persistido em localStorage)
    historico.js     # histórico local de DREs geradas (localStorage) + sincronização
    githubApi.js     # leitura/gravação de um arquivo no repositório via API do GitHub
  components/
    EtapaImportar.jsx
    EtapaConferir.jsx
    EtapaClassificar.jsx
    EtapaDRE.jsx
    EtapaBalanco.jsx
    EtapaHorizontal.jsx
    EtapaHistorico.jsx
    SincronizacaoGitHub.jsx  # painel de configuração e sincronização
    LinhaDRE.jsx     # linha/seção/detalhe reutilizados na etapa 4
  App.jsx            # orquestra o estado e as etapas
  App.css
```

A lógica de parsing e classificação está isolada de React (`src/lib`),
então dá pra testar ou reaproveitar sem montar componente nenhum.

## O que ajustar para outro plano de contas

Em `src/lib/classify.js`:
- `GRUPOS` — os itens da DRE e o sinal de cada um.
- Os padrões `PAT_*` — expressões regulares que casam com o histórico dos
  lançamentos para sugerir o grupo de cada conta (ex.: `MENSALIDADE`,
  `BOLSA`, `FOPAG`). Ajuste ou adicione termos do seu próprio razão aqui.
- `sugerirClassificacao` — a lógica de decisão em si, caso os grupos
  mudem de forma mais estrutural.

## Licença

Uso livre para fins de portfólio/estudo.
