---
name: ajustar-classificacao-dre
description: Muda para onde uma conta vai na DRE — padrões PAT_*, mapa por código do plano, exceções, perfis de plano de contas e categorias do CPC 51. Use quando uma conta estiver caindo no grupo errado, ao atender um plano de contas novo, ao criar um perfil de plano, ou quando o usuário disser que "tal conta deveria estar em outro lugar".
---

# Mudar a classificação de contas

> **Leia primeiro** `.claude/docs/classificacao.md` (as quatro camadas, o mapa
> por código do IESB e as exceções) e `.claude/docs/dre.md` (a hierarquia de
> subtotais que a classificação alimenta).

Esta é a parte do projeto que mais dá errado quando se mexe por
intuição. Antes de tocar em qualquer coisa, entenda **por qual das
quatro camadas** a conta está sendo decidida hoje — mudar a camada
errada resolve o caso da frente e quebra dez atrás.

## As quatro camadas, da mais forte para a mais fraca

| # | Camada | Onde | Quando vence |
|---|---|---|---|
| 1 | Decisão manual do usuário | `classif`/`tocadas` em `App.jsx` | sempre |
| 2 | Perfil de plano de contas | `planoPerfil.js` + `planos/*.js` | quando a assinatura do plano bate |
| 3 | Padrões de texto `PAT_*` | `classify.js` | quando há nome de conta ou histórico |
| 4 | Maioria do prefixo de 3 dígitos | `classify.js` | sem plano de contas nenhum |

**Descubra a camada primeiro.** Abra a aba **Parâmetros → De-Para**: a
coluna "Origem do grupo" separa `manual` de `sugerido`, e a etapa
Classificar diz se algum perfil de plano foi reconhecido. Se um perfil
está ativo, mexer nos `PAT_*` não vai mudar nada — e vice-versa.

## Regra de ouro: prefira dado a código

Atender um cliente novo **não deveria exigir commit**. A ordem de
preferência, da melhor solução para a pior:

1. **Perfil de plano de contas** (arquivo JSON carregado na etapa 3).
   Resolve por código, do mais específico para o mais genérico. Cobre
   quase tudo.
2. **Regra dentro do perfil** — `tipo: "nome"` (Prouni morando dentro de
   Bolsas) ou `tipo: "sinal"` (seção que mistura receita e despesa).
3. **Exceção no plano embutido** (`planos/iesb.js`), se for o cliente
   principal e o caso for permanente.
4. **Mudar `classify.js`** — último recurso, e só quando o padrão vale
   para QUALQUER plano de contas, não para um cliente.

## Se for mesmo mexer nos `PAT_*`

**A ordem importa**, e não é estilo: termos se sobrepõem em plano de
contas real. Padrão específico vem ANTES do genérico.

- `PROVISAO IRPJ`/`PROVISAO CSLL` bate em "provisão" **e** em
  "IRPJ/CSLL" → IRPJ/CSLL é checado antes de Provisões.
- `PIS S/FOLHA PAGAMENTO` (encargo trabalhista, Fopag) bate em "PIS"
  igual a `(-)PIS` (imposto sobre receita, Deduções) → Fopag antes de
  Impostos.

E a decisão é **por conta individual**, nunca por maioria de um grupo de
contas. Maioria por prefixo de 3 dígitos já foi tentada e quebrou contra
dados reais: o mesmo prefixo pode conter Bolsas, Descontos, Devoluções e
Impostos misturados.

## Se o eixo for o CPC 51

Categoria **não é grupo**. São eixos paralelos: a conta tem um grupo (a
linha da DRE atual) e uma categoria (o bloco do CPC 51). Nunca crie
grupos novos em `grupos.js` para resolver um caso de CPC 51 — isso
quebra a DRE validada centavo a centavo e faz dinheiro sumir da tela no
dia em que uma conta cair num grupo que a hierarquia de subtotais não
soma.

Mudanças de categoria se fazem em `MAPA_PADRAO` (`cpc51.js`), na política
contábil, ou conta a conta na aba De-Para.

## Conferência obrigatória, toda vez

```bash
npx vitest run                # a lógica não mudou por acidente
node fixtures/validar.mjs     # ela continua CERTA (ver skill testar-com-arquivo-real)
```

E na tela, aba **De-Para**:

- **"Fora da DRE" = 0** quando há plano de contas importado. Toda conta
  de resultado tem que ter destino.
- **Parametrização resolvida** não caiu.
- **Lucro Líquido não mudou por acaso.** Se mudou, entenda por quê antes
  de aceitar — é o número que o cliente confere primeiro.
- Na aba CPC 51, **a conciliação continua fechando em 0,00**.

Se `fixtures/` não estiver nesta máquina, diga isso em vez de fingir que
validou.
