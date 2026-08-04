# Gerador de DRE

Importa um razão contábil (CSV) e monta a Demonstração do Resultado do
Exercício — conferência de partidas dobradas, classificação de contas de
resultado (com sugestão automática) e a demonstração final com análise
vertical, detalhe por conta e exportação em CSV.

A estrutura da demonstração (receita bruta com mensalidades e taxas,
deduções detalhadas, custos, despesas operacionais, financeiro, não
operacional e IRPJ/CSLL) foi calibrada a partir de uma DRE real de uma
instituição de ensino — mas o app funciona com qualquer razão que traga
conta e valor de débito/crédito em colunas separadas.

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
    parse.js       # leitura do CSV, normalização de número/encoding, agregação por conta
    classify.js     # grupos da DRE e sugestão automática de classificação
    exportCsv.js    # exportação da DRE final em CSV
  components/
    EtapaImportar.jsx
    EtapaConferir.jsx
    EtapaClassificar.jsx
    EtapaDRE.jsx
    LinhaDRE.jsx    # linha/seção/detalhe reutilizados na etapa 4
  App.jsx           # orquestra o estado e as 4 etapas
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
