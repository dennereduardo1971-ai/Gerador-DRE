---
name: build-e-publicar
description: Leva uma mudança até o site publicado (GitHub Pages), incluindo o caminho sem terminal — build local, docs/, zip para upload manual. Use ao terminar uma mudança que precisa ir ao ar, quando o usuário pedir "publica isso", "gera o zip", "sobe para o site", ou quando perguntar por que o site não atualizou.
---

# Build e publicação

> `docs/` é **saída de build** (GitHub Pages), não documentação. A
> doutrina do projeto mora em `CLAUDE.md` e `.claude/docs/` — nunca ponha
> nada em `docs/` à mão: o CI sobrescreve a pasta inteira.

## O caminho normal: só dar push na `main`

Desde a integração contínua, publicar é **push na `main`**.
`.github/workflows/ci.yml` roda lint, testes e build, e commita `docs/`
sozinho. Não commite `docs/` à mão num fluxo com CI: você cria conflito
com o commit que o próprio workflow vai fazer.

```bash
npx vitest run && npx oxlint src/ && npm run build   # confira antes de empurrar
git push -u origin <branch>
```

`docs/**` está no `paths-ignore` do workflow de propósito — o job de
publicação commita nessa pasta, e sem a exclusão cada publicação
dispararia outra, em loop. Não remova.

## O caminho sem terminal (o do Denner)

O Denner usa PC de empresa, sem terminal. Quando a sessão é pelo chat do
claude.ai e ele não pode rodar nada, o fluxo é:

1. Build local (na sua máquina):
   ```bash
   npm install
   npx vitest run
   npm run build
   rm -rf docs && cp -r dist docs
   ```
2. Empacote **a pasta `docs/`** num zip.
3. Ele sobe pelo **Add file → Upload files** do GitHub, arrastando a
   pasta. O Pages atualiza sozinho.
4. Vale entregar também o **projeto inteiro** em zip (sem `node_modules`
   e sem `dist`) como backup — e nunca com `fixtures/` dentro.

Antes de empacotar qualquer coisa, confira que não vai dado real junto:

```bash
git status --porcelain --ignored | grep -iE "fixtures/|\.xlsx?$|\.csv$"
```

## Por que `base: './'`

`vite.config.js` usa caminho relativo de propósito: funciona no GitHub
Pages num subcaminho (`/Gerador-DRE/`) **e** aberto localmente, sem
reconfigurar nada. Não troque por `/Gerador-DRE/` — quebra o teste local.

## A armadilha que já custou caro

**Papaparse com `worker: true` funciona em `npm run dev` e quebra no
build publicado**, com `charCodeAt is not a function` vindo de um script
com nome de UUID. `importarCSV.js` usa `worker: false` com
`parser.pause()/resume()`. Se for mexer em importação de CSV, teste
contra o **build**, não contra o dev server:

```bash
npm run build && npx vite preview --port 4173
```

Uma importação que funciona no dev não prova nada sobre o site publicado.

## Depois de publicar

Confira o site de verdade: <https://dennereduardo1971-ai.github.io/Gerador-DRE/>.
Importe um arquivo pequeno e navegue pelas abas — o custo de um build
quebrado no ar é alto e o de conferir é um minuto.
