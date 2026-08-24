---
name: nova-funcionalidade
description: Adiciona uma tela, um módulo ou uma capacidade nova ao app — inclusive os módulos do caminho para virar ERP. Use ao implementar qualquer coisa que ainda não existe (aba nova, cálculo novo, importação nova, exportação nova), ao pegar um item do backlog de EVOLUCAO.md, ou quando o usuário pedir "adiciona uma área de X".
---

# Implementar funcionalidade nova

Este projeto tem uma DRE validada centavo a centavo contra a
demonstração oficial de uma instituição real. Isso muda o que significa
"funcionalidade nova": o padrão de qualidade não é "funciona na tela", é
**"não mexeu no que já estava certo, e o que entrou também está certo"**.

## 1. Antes de escrever: onde isso encaixa

Leia `CLAUDE.md` inteiro (é o núcleo, e é curto), o arquivo de
`.claude/docs/` do assunto que a funcionalidade toca — o índice no topo
do `CLAUDE.md` diz qual — e a seção "Próximos
passos" de `EVOLUCAO.md`. Depois responda três perguntas por escrito, na
sua resposta ao usuário, antes de codar:

1. **De qual fonte isso depende?** Razão, balancete, os dois, ou nenhuma
   (como o Plano de ação)? A resposta define se a aba abre sem arquivo e
   entra em `SEMPRE_ABERTAS`/`BASTA_BALANCETE` em `App.jsx`.
2. **É um eixo novo ou um grupo novo?** Quase sempre a resposta certa é
   *eixo paralelo*. O CPC 51 é o precedente: categoria virou uma segunda
   dimensão sobre as mesmas contas, e não grupos novos em `grupos.js`.
   Criar grupo novo quebra a hierarquia de subtotais validada e faz
   dinheiro sumir da tela sem aviso.
3. **Isso é decisão ou é dado?** Decisão (classificação, política,
   categoria) viaja na sessão e no perfil. Dado importado, não.

## 2. A forma do código aqui

```
src/lib/<assunto>.js          lógica pura, sem React, testável isolada
src/lib/__tests__/<assunto>.test.js
src/components/<Tela>.jsx     "burra": recebe props, chama callbacks
src/App.jsx                   dono de TODO o estado
```

Regras que não se afrouxam:

- **A tela não calcula.** Se um componente está somando saldo, o cálculo
  está no lugar errado — vai para `lib/`, onde tem teste.
- **A estrutura da demonstração se escreve uma vez.** CSV, Excel e tela
  leem `montarLinhas`/`montarLinhas51`. Nunca redigite rótulos de linha
  num exportador; foi assim que o arquivo entregue ao cliente já
  divergiu da tela conferida.
- **Nunca mostre zero no lugar de dado ausente.** Devolva `null` e
  mostre "—" quando o denominador é zero: uma margem em 0,0% parece
  diagnóstico quando é ausência de receita. Vale igual para lacuna de
  nota explicativa, que sai como `[__________]`, nunca como zero.
- **A pergunta do escopo vem antes do código.** Este app é a DRE e a
  transição para o CPC 51. Tela que não serve a isso já foi removida uma
  vez (20/08/2026); se a resposta for "é legal ter", a resposta é não.
- **Import pesado é dinâmico.** `xlsx` custa ~424 kB e entra por
  `await import("xlsx")`, nunca estático.

## 3. Aba nova na trilha

`SECOES` em `App.jsx` é dado. Acrescentar uma aba é:

1. uma entrada em `SECOES` (seção existente ou nova);
2. uma cláusula em `abaDisponivel(id)` se ela não depender do razão;
3. o bloco de render em `<main>`;
4. opcionalmente, uma entrada em `estadoDaAba` — sub-rótulo com o número
   que importa daquela tela, e `alerta: true` quando houver pendência.

Não copie blocos de JSX de navegação: era assim antes, e as três regras
de "quando esta aba abre" ficaram impossíveis de comparar.

## 4. Rumo ao ERP: o que muda e o que não muda

O caminho de "gerador de DRE" para "ERP" é **acrescentar módulos de
cadastro e movimento em volta do núcleo contábil que já existe**, não
reescrever o núcleo. O que já está pronto e deve ser reusado:

- **De-Para** (`lib/depara.js`) — a tabela de parametrização. Qualquer
  módulo novo que precise mapear "código do cliente → conceito do
  sistema" segue esse formato: origem, destino, **origem da decisão**, e
  um placar de quanto falta.
- **Perfis** (`perfil.js`, `planoPerfil.js`) — o jeito do projeto de
  atender cliente novo **sem commit e sem build**. Módulo novo que exija
  recompilar para atender outro cliente está mal desenhado.
- **Sessão em IndexedDB** (`sessao.js`) — estado grande persiste aqui, não
  em localStorage. E a gravação só começa depois de `sessaoCarregada`.
- **As duas fontes** (razão × balancete) — dado novo que descreva o mesmo
  fato por outro caminho deve convergir para o formato de
  `agregarPorConta`, com teste provando que as duas rotas dão o mesmo
  resultado (`fontes.test.js` é o modelo).

E o que **não** muda ao virar ERP: roda 100% no navegador, sem backend;
dado financeiro nunca é commitado; "Limpar tudo" continua sendo botão
visível.

## 5. Antes de dizer que terminou

```bash
npx vitest run          # inclui os testes novos da sua funcionalidade
npx oxlint src/         # só os 2 avisos pré-existentes de historico.js
npm run build           # e olhe o tamanho do bundle
npm run build && npx vite preview --port 4173   # teste no BUILD, não no dev
```

Na tela, com um razão carregado:

- a DRE e o **Lucro Líquido não mudaram** (se mudaram, entenda por quê);
- a conciliação do CPC 51 continua em **0,00**;
- a tela nova responde em **390px** (tabela com descrição vira cartão via
  `.tabela-cartao` + `data-rotulo`), tem **foco de teclado visível** e
  funciona nos **dois temas**;
- nenhum `<select>` ou checkbox sem `aria-label` próprio.

Depois, feche a sessão com a skill `manter-evolucao`.
