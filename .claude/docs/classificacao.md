> Leia antes de mexer em `classify.js`, `planoPerfil.js`, `planos/*.js` ou `grupos.js` — ou seja, sempre que uma conta estiver caindo no grupo errado, e ao atender um plano de contas novo.

# O coração do projeto: classificação de contas

`sugerirClassificacao()` em `classify.js` decide em qual grupo da DRE
(`GRUPOS`) cada conta de resultado cai. Isto NÃO é um classificador
genérico — foi calibrado e testado contra o plano de contas real de
uma instituição de ensino (IESB), então entenda o raciocínio antes de
mudar:

1. **Decisão é por conta individual**, não por maioria de um grupo de
   contas. Isso já foi tentado (maioria por prefixo de 3 dígitos) e
   quebrou contra dados reais: o mesmo prefixo pode conter sub-contas
   de grupos completamente diferentes (ex. um prefixo com Bolsas,
   Descontos, Devoluções e Impostos misturados).
2. Cada conta é testada contra um **texto enriquecido**: histórico dos
   lançamentos + nome da própria conta (se houver plano de contas
   importado) + nome de **cada conta ancestral** no plano de contas
   (cortando o código um dígito de cada vez). Isso resolve o caso comum
   de conta-folha com nome genérico cuja natureza real só aparece no
   nome da conta-síntese pai.
3. **A ordem dos padrões `PAT_*` importa.** Padrões mais específicos
   têm que vir antes dos mais genéricos, porque termos se sobrepõem em
   plano de contas real:
   - `PROVISAO IRPJ`/`PROVISAO CSLL` bate em "provisão" E em "IRPJ/CSLL"
     → IRPJ/CSLL tem que ser checado antes de Provisões.
   - `PIS S/FOLHA PAGAMENTO` (encargo trabalhista, grupo Fopag) bate em
     "PIS" igual a `(-)PIS` (imposto sobre receita, grupo Deduções) →
     Fopag é checado antes de Impostos.
4. Sem plano de contas importado, cai num **fallback por maioria do
   prefixo de 3 dígitos** (o comportamento antigo, mais grosseiro, mas
   que não depende de nome nenhum).
5. Classificações manuais do usuário (`classif` em `App.jsx`) sempre
   têm prioridade sobre a sugestão automática — importar um novo plano
   de contas nunca desfaz uma escolha manual.

**Antes de mudar um padrão `PAT_*` ou a ordem de prioridade**, rode
contra um arquivo real (ver skill `testar-com-arquivo-real`) e
confira: (a) nenhuma conta sobra em "Não entra na DRE" quando há plano
de contas, (b) a soma de todos os grupos bate com a soma absoluta de
todas as contas de resultado (nada se perde ou duplica), (c) o
Lucro Líquido final não muda por acaso — se mudar, entenda por quê
antes de aceitar.

## Camada de código exato (plano de contas do IESB)

Acima do classificador por texto existe uma segunda camada, mais forte:
`MAPA_CODIGO_IESB` em `classify.js` liga cada conta-síntese do plano de
contas do IESB (ex. `31101`, `32104`, `41101`) direto ao grupo da DRE,
sem depender de palavra nenhuma. Ela só entra em ação quando o plano de
contas importado bate a "assinatura" do IESB (`assinaturaPlanoIESB` —
checa o nome das contas-síntese 3/4/5/6); com outro plano de contas, ou
sem plano nenhum, cai no texto/histórico como sempre caiu.

Essa camada foi validada linha a linha contra a DRE real de jan a
jun/2026 (script `fixtures/validar.mjs`, arquivos reais do Denner em
`fixtures/`, ignorados no git) — bateu **centavo a centavo** em todo
grupo, inclusive Lucro Líquido final. Rode esse script depois de
qualquer mudança em `classify.js` ou `parse.js` para garantir que não
regrediu:

```bash
node fixtures/validar.mjs
```

Três coisas importantes que esse trabalho revelou, para não serem
desfeitas por acidente:

1. **Custo dos Serviços ≠ Despesas com Pessoal.** A folha dos DOCENTES
   (`411`/`4110`) é Custo dos Serviços (quem entrega o serviço-fim); a
   folha do administrativo (`4111`) e do apoio acadêmico (`4112`) é
   Despesas com Pessoal (Fopag) dentro de Despesas Operacionais. São
   grupos diferentes por desenho contábil, não por coincidência.
2. **Há exceções pontuais no próprio plano de contas** que o mapa por
   código sozinho erraria — contas-folha cujo nome diz uma coisa e cujo
   grupo-pai no plano diz outra (ex. conta de PROUNI dentro do grupo
   "Bolsas Estudantis"; conta de IPTU de imóvel de investimento dentro
   de "Provisões", mas tratada como Não Operacional na DRE oficial).
   Ver `EXCECOES_CODIGO_IESB` e o comentário de `grupoPorCodigoIESB`.
3. **`montarDRE` soma o saldo com sinal, não a magnitude.** Grupos como
   Provisões misturam de verdade contas de despesa (nova provisão) com
   contas de receita (reversão/estorno) na MESMA linha da DRE oficial —
   em meses onde a reversão supera a provisão nova, a linha vira
   positiva de verdade (reduz despesa). Somar `Math.abs(saldo)` por
   conta, como o código fazia antes, perde esse líquido e infla o
   grupo. Por isso `bal[g].total` acumula `saldo * sinalDoGrupo`, não
   `Math.abs(saldo)` — e a tela (`EtapaDRE.jsx`) e o CSV
   (`exportacao.js`) mostram o valor líquido de verdade (podendo aparecer
   uma despesa "positiva" num mês de reversão forte), em vez de forçar
   parênteses de despesa sempre.
4. **Provisões é, na DRE oficial, DUAS linhas, não uma**: "Provisões/
   Reversões Contingências" (cíveis/trabalhistas, novas e revertidas —
   contas `6110100`, `6110101`, `6110102`, `6110104`, `6110105`,
   `6110115`, `6110116`) e "Provisões/Reversões PCLD" (perdas estimadas
   com créditos de liquidação duvidosa, fiscal e societária, novas e
   revertidas — contas `6110103`, `6110106`, `6110111`, `6110112`,
   `6110114`, `6110119`). Os grupos na DRE são `PROVISOES_CONTINGENCIAS`
   e `PROVISOES_PCLD`. Não junte de volta numa linha só sem confirmar
   contra a DRE oficial — foi assim que apareceu o erro da primeira
   versão dessa camada.


## Perfil de plano de contas

O plano do IESB **não mora mais em `classify.js`** — virou dado em
`planos/iesb.js`, lido pelo motor em `planoPerfil.js`. Atender outro
cliente é carregar um arquivo pela etapa 3, sem commit e sem build.

Duas coisas que não devem ser afrouxadas:

- **A assinatura é obrigatória.** Um perfil sem assinatura é recusado na
  leitura. Sem ela não há como saber se o perfil serve para o plano
  importado, e aplicar o perfil errado distribuiria os valores de forma
  silenciosamente errada — que é exatamente a classe de defeito que este
  projeto mais tenta evitar.
- **A resolução é do código mais específico para o mais genérico.** A
  conta-folha exata vence a conta-síntese que a contém. É isso que faz
  as exceções (3210208, 6110113) e o IRPJ/CSLL dentro de 611 caírem no
  lugar certo sem nenhuma lista de prioridade à parte.

Regras cobrem o que não cabe num mapa de prefixo: `tipo: "nome"` (Prouni
morando dentro de Bolsas) e `tipo: "sinal"` (seções que misturam receita
e despesa). `quando: "antes"` roda antes do mapa; `"depois"`, só se o
mapa não resolveu.

Ao mexer aqui, os testes de `planoPerfil.test.js` cobrem a mecânica, mas
**só `fixtures/validar.mjs` prova que o perfil do IESB continua certo.**

