---
name: testar-com-arquivo-real
description: Valida o app contra o razão, o plano de contas e a DRE reais do cliente (fixtures/), em vez de só contra o razão sintético dos testes. Use ao mexer em classify.js, parse.js, planoPerfil.js, balancete.js ou nos planos de contas, antes de dizer que uma mudança de classificação está certa, ou quando o usuário pedir para "conferir com o arquivo de verdade".
---

# Validar contra o arquivo real

O Vitest prova que a lógica **não mudou**. Só o arquivo real prova que
ela está **certa**. As duas camadas são obrigatórias e nenhuma substitui
a outra — esta skill é a segunda.

## Antes de tudo: os arquivos existem nesta máquina?

```bash
ls fixtures/
```

`fixtures/` está no `.gitignore` (razão, plano de contas e DRE oficial de
uma instituição real — números financeiros que nunca podem ser
commitados). Numa máquina sem eles, `ls` mostra só `validar.mjs`, ou nada.

**Se os arquivos não estiverem lá, pare e diga isso ao usuário.** Não
escreva "validado", não escreva "confere com a DRE real", não deduza do
Vitest que está certo. A frase honesta é:

> Rodei o Vitest (N testes passando), mas **não validei contra a DRE
> real** — os arquivos de `fixtures/` não estão nesta máquina. Se você
> puder rodar `node fixtures/validar.mjs` aí, é o que fecha a conferência.

Mentir sobre isso é o tipo de erro que este projeto inteiro existe para
evitar. Um app de contabilidade que diz "confere" sem ter conferido é
pior que um que não diz nada.

## Rodando

```bash
node fixtures/validar.mjs
```

O script percorre a DRE real mês a mês (jan a jun/2026) e compara com o
que o app calcula, grupo por grupo. O piso é **centavo a centavo**: este
projeto já bateu exato em todos os grupos, inclusive Lucro Líquido, e
qualquer diferença é regressão até prova em contrário.

## Como ler o resultado

Diferença apareceu? A ordem de investigação, da causa mais comum para a
mais rara:

1. **Uma conta mudou de grupo.** Compare o De-Para (aba Parâmetros) antes
   e depois. Foi uma alteração em `MAPA_CODIGO_IESB`, em
   `EXCECOES_CODIGO_IESB`, na ordem dos `PAT_*` ou no perfil de plano?
2. **Um grupo virou dois, ou dois viraram um.** Provisões é o caso
   clássico: na DRE oficial são DUAS linhas (Contingências e PCLD).
   Juntá-las bate no total geral e erra as linhas.
3. **Soma por magnitude em vez de saldo com sinal.** `montarDRE` acumula
   `saldo * sinalDoGrupo`, nunca `Math.abs(saldo)`. Em mês de reversão
   forte, uma linha de despesa fica legitimamente positiva; somar
   magnitude infla o grupo e o erro aparece só naquele mês.
4. **O parse mudou.** Ponto como milhar x ponto decimal, encoding,
   competência. Se a diferença for por um fator de 100 ou 1000, é aqui.

## Os três invariantes que a validação protege

Se algum destes quebrar, a mudança está errada mesmo que o total feche:

- **Custo dos Serviços ≠ Despesas com Pessoal.** Folha dos DOCENTES
  (`411`/`4110`) é Custo; folha do administrativo (`4111`) e do apoio
  acadêmico (`4112`) é Fopag dentro de Despesas Operacionais.
- **Nenhuma conta sobra em "Não entra na DRE"** quando há plano de contas
  importado. A aba De-Para mostra isso direto no placar "Fora da DRE".
- **A soma de todos os grupos bate com a soma das contas de resultado.**
  Nada se perde e nada duplica — `provaIntegridade` já mede isso na tela.

## Depois de validar

Registre em `EVOLUCAO.md` **o que foi validado e o que não foi**, com
essas palavras. Se rodou só o Vitest, escreva "Vitest passou". Se rodou
o `validar.mjs`, escreva o período conferido e o resultado.
