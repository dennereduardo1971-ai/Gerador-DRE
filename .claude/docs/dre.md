> Leia antes de mexer em `classify.js` (`montarDRE`) ou `linhasDRE.js` — a hierarquia de subtotais e os rótulos da demonstração.

# Regras da DRE (estrutura fixa em `montarDRE`)

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


## A quebra por modalidade (Presencial / EAD / Comum)

Cada linha de grupo pode abrir, logo abaixo dela, em **faixas**: as
modalidades do catálogo do usuário (de fábrica, Presencial, EAD e
Médio / Fundamental) mais a residual, que recebe o que não é de
modalidade nenhuma. A regra vive em `modalidade.js` (`faixasDoGrupo`) e
vale igual na DRE atual e na demonstração do CPC 51 — uma cópia da
condição em cada lugar divergiria no dia em que alguém mexesse numa só.

O catálogo é editável na tela (`.claude/docs/nomes.md`): "três faixas"
não é mais um número do código, e nada aqui deve voltar a supor que seja.

O que não se pode desfazer aqui:

- **A faixa é do tipo `mod`, e `mod` não soma.** Ela é detalhe de uma
  linha que já entrou na demonstração: não entra na cascata
  (`aplicarCascata`) nem no total do título de seção
  (`totalizarSecoes`, que a pula com `continue`). Somá-la contaria o
  mesmo dinheiro duas vezes. A versão anterior de `totalizarSecoes`
  parava na primeira linha que não fosse `l` — com faixas, isso cortava
  a seção ao meio sem nenhum sinal na tela.
- **A faixa soma a parcela orientada do grupo**, `saldo × sinal do
  grupo`, a mesma que forma o total — não a magnitude. Grupos como
  Provisões misturam despesa e reversão; `Math.abs` dentro da faixa
  reproduziria, um nível abaixo, o erro que o total já evita.
- **Só se divide o grupo que tem alguma conta com modalidade.** Despesa
  administrativa, PIS/COFINS/ISS e depreciação continuam uma linha só —
  uma faixa residual sozinha repetiria o valor da linha de cima.
- **O rótulo da linha é `prefixo + nome do grupo`.** O nome vem de
  `nomeDoGrupo` (renomeável); o prefixo `( + )` / `( – )` é estrutura da
  cascata e não se edita.
- **Nada é rateado.** "Comum" é um fato contábil (nasce da instituição
  inteira), não uma lacuna a preencher. Distribuir as comuns por
  participação na receita produziria número que a contabilidade não
  lançou, e a DRE viraria relatório gerencial.
- **Cada linha tem `chave`** (`<grupo>` ou `<grupo>|<modalidade>`; no
  CPC 51, com a categoria na frente). A Comparativa e a coluna
  comparativa do CPC 51 casam colunas por ela: "Presencial" se repete
  embaixo de vários tópicos, e casar por RÓTULO punha o valor do
  primeiro tópico em todos os outros — erro silencioso, porque o número
  existe e parece plausível.

`modalidade.test.js` congela isso, e o teste que mais importa é o que
compara a DRE com e sem a divisão ligada: **nenhum subtotal, nenhuma
seção e nenhum lucro líquido pode se mover.**
