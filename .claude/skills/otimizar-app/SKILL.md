---
name: otimizar-app
description: Passa o pente fino em desempenho, tamanho de bundle e código morto — sempre medindo antes e depois. Use quando o app estiver lento com arquivo grande, quando o bundle crescer, ao pedir "otimiza isso", "deixa mais rápido", "limpa o código", ou antes de uma entrega em que o desempenho importe.
---

# Otimizar

Regra única desta skill: **mediu, mudou, mediu de novo.** Otimização sem
número antes e depois é preferência estética disfarçada — e aqui ela
custa caro, porque cada mudança passa perto de uma DRE validada centavo
a centavo.

## 1. Meça primeiro

```bash
npx vitest run                                   # ponto de partida verde
npm run build                                    # bundle: app + CSS + chunks de xlsx e exceljs
npx oxlint src/                                  # código morto e expressões inúteis
wc -l src/App.jsx src/lib/*.js src/components/*.jsx | sort -n | tail -10
```

Anote os números. Se você não sabe o valor de antes, não vai saber se
melhorou.

Para desempenho de verdade, meça no **build**, com arquivo grande, e no
navegador — não no dev server:

```bash
npm run build && npx vite preview --port 4173
```

## 2. Onde o custo costuma estar, nesta ordem

1. **`linhas` cru em memória.** O razão inteiro fica em estado até hoje;
   é o teto de tamanho de arquivo do app. Agregar durante a importação é
   o item mais valioso do backlog e o mais invasivo — leia
   `EVOLUCAO.md` antes de começar.
2. **Recálculo por tecla digitada.** Filtros e buscas que varrem todas as
   contas a cada caractere. O padrão do projeto é `useMemo` com a
   dependência certa, e nunca varrer o `historico` (até 20 mil caracteres
   por conta) num filtro de tela.
3. **Tabelas longas.** Centenas de linhas com `<select>` dentro travam a
   digitação. O De-Para usa teto de 400 linhas desenhadas + filtro; siga
   esse padrão em vez de renderizar tudo.
4. **Bundle.** `xlsx` (424 kB, leitura de arquivo importado) e `exceljs`
   (930 kB, escrita dos Excel exportados) já são `import()` dinâmico —
   cada um vira UM chunk carregado só na ação que precisa dele (importar
   / baixar Excel), nunca os dois juntos e nunca no carregamento inicial.
   Qualquer biblioteca nova entra pelo mesmo caminho ou não entra.

## 3. O que NÃO otimizar

- **Não corte código do núcleo contábil para ganhar bytes.**
  `classify.js`, `parse.js`, `cpc51.js`, `balancete.js` e os perfis de
  plano carregam decisões validadas contra arquivo real. Bundle se ganha
  em import dinâmico e em tela que não precisa existir — não em regra de
  classificação "que parece redundante".
- **Não "simplifique" o sinal do saldo.** `agregarPorConta` usa
  `crédito − débito`; o balancete usa `débito − crédito`. Um é o negativo
  do outro, e unificar inverte a DRE inteira sem quebrar mais nada
  visivelmente. Há teste guardando esse ponto — se ele ficar vermelho,
  você achou exatamente esta armadilha.
- **Não reverta `worker: false` no Papaparse.** Funciona no dev e quebra
  no site publicado.
- **Não junte as duas fontes** (razão e balancete) "porque são
  redundantes". Não são: só o razão tem competência mensal, centro de
  custo e lançamento individual.
- **Não troque `xlsx` por `exceljs` na LEITURA** (`importarExcel.js`) sem
  avisar o usuário: `exceljs` não lê `.xls` legado, `.xlsb` nem `.ods`.
  As duas bibliotecas já convivem de propósito — `xlsx` lê o que o
  cliente manda, `exceljs` escreve o que o app entrega (ver "Exportação"
  em `CLAUDE.md`). Não é dívida técnica a resolver; é a divisão certa.
- **Não troque `exceljs` por `xlsx` na ESCRITA** achando que economiza
  bundle. `xlsx` (SheetJS Community) ignora `cell.s` ao gravar — cor de
  fundo, fonte e negrito somem no arquivo final, mesmo que o objeto em
  memória pareça aceitar. Já aconteceu neste projeto: código com
  `s: {font:{bold:true}}` que nunca funcionou. Ver "Exportação" em
  `CLAUDE.md` antes de reconsiderar essa escolha.

## 4. Limpeza barata que está pendente

Nenhuma no momento — os dois avisos de lint que existiam (`lerSha`
morto e uma expressão sem uso em `historico.js`) foram corrigidos.
`npx oxlint src/` deve continuar em zero; se aparecer aviso novo, ele é
mais barato de corrigir na hora do que de deixar acumular.

## 5. Depois de otimizar

Rode a bateria inteira e compare com os números anotados no passo 1:

```bash
npx vitest run
npx oxlint src/
npm run build
node fixtures/validar.mjs   # se os arquivos reais estiverem nesta máquina
```

Uma otimização que muda um centavo na DRE **não é uma otimização**, é um
defeito. Se `fixtures/` não estiver disponível, diga isso — e trate a
mudança como não validada.

Registre o antes e o depois em `EVOLUCAO.md` (skill `manter-evolucao`):
números velhos naquele arquivo fazem a próxima sessão decidir errado.
