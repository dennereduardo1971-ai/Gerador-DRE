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

