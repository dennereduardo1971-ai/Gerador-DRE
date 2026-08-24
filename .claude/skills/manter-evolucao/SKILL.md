---
name: manter-evolucao
description: Fecha uma sessão de trabalho neste repositório atualizando EVOLUCAO.md e, se necessário, CLAUDE.md. Use ao terminar qualquer mudança de código, antes de commitar, ou quando o usuário pedir para "atualizar a documentação", "registrar o que foi feito" ou "deixar tudo otimizado".
---

# Fechar a sessão: atualizar a memória do projeto

O projeto tem dois arquivos de memória, com papéis diferentes. Confundir
os dois é o erro que esta skill existe para evitar.

| Arquivo | Responde | Muda |
|---|---|---|
| `CLAUDE.md` | o núcleo: escopo, arquitetura, armadilhas, como testar | pouco, e cada frase precisa continuar verdadeira |
| `.claude/docs/*.md` | a doutrina de cada assunto, lida sob demanda | só quando o assunto dela muda |
| `EVOLUCAO.md` | onde ele está agora, o que foi medido, o que falta | toda sessão, por acréscimo |

## Passo a passo

1. **Meça antes de escrever.** Rode e anote o resultado real:

   ```bash
   npx vitest run        # contagem de testes
   npx oxlint src/       # avisos
   npm run build         # tamanho do bundle
   wc -l src/App.jsx src/lib/*.js src/components/*.jsx | sort -n | tail -8
   ```

   Se `fixtures/` tiver os arquivos reais, rode também
   `node fixtures/validar.mjs`. Se não tiver, **diga que não rodou** —
   nunca escreva "validado" sobre o que não foi validado.

2. **Atualize a tabela "Estado atual"** em `EVOLUCAO.md` com os números
   que mudaram, e a data logo acima dela.

3. **Acrescente uma entrada em "Registro"**, no topo, com a data de hoje.
   Estrutura curta: o que entrou, a decisão estrutural mais importante e
   por quê, o que foi medido/verificado, o que ficou de fora de propósito.

4. **Revise "Próximos passos"**: tire o que foi feito, reordene se a
   sessão mudou a prioridade, acrescente o que descobriu.

5. **Armadilha nova vai para `CLAUDE.md`**, na seção "Armadilhas
   conhecidas" — é o arquivo que a próxima sessão lê primeiro. Em
   `EVOLUCAO.md` fica só o registro de que ela apareceu.

6. **Corrija `CLAUDE.md` e o `.claude/docs/` do assunto no mesmo commit**
   se alguma frase deles deixou de ser verdade: contagem de testes,
   árvore de arquivos, fluxo de telas, backlog já entregue.

7. **Arquive quando o diário passar de ~350 linhas.** As sessões mais
   antigas vão para `EVOLUCAO-ARQUIVO.md` (que ninguém lê por padrão) e
   `EVOLUCAO.md` fica com Estado atual, as três sessões mais recentes e
   os Próximos passos. Um diário que não cabe numa leitura deixa de ser
   lido — e aí a próxima sessão decide sem ele.

## Duas regras que não se afrouxam

- **Nenhum dado de cliente** em nenhum dos dois arquivos. Sem valores,
  sem trechos de razão, sem conta com saldo. Os dois são versionados e o
  repositório é público.
- **Registro é histórico, não release note.** Escreva o que a próxima
  sessão precisa saber para não refazer trabalho nem repetir erro — não
  um anúncio do que foi entregue.
