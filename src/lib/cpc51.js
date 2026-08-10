/* CPC 51 — Apresentação e Divulgação nas Demonstrações Financeiras
 * (a versão brasileira do IFRS 18). Vigência: exercícios iniciados em
 * 1º de janeiro de 2027, com 2026 reapresentado como comparativo.
 *
 * O QUE MUDA, EM UMA FRASE: a DRE deixa de ser uma cascata livre e passa
 * a ter CINCO CATEGORIAS obrigatórias (operacional, investimento,
 * financiamento, tributos sobre o lucro e operações descontinuadas) e
 * DOIS SUBTOTAIS obrigatórios (resultado operacional e resultado antes
 * do financiamento e dos tributos sobre o lucro).
 *
 * O QUE NÃO MUDA: o lucro líquido. O CPC 51 RECLASSIFICA, não recalcula
 * — e é exatamente isso que a Fase 5 (passo 22) e a Fase 6 (passo 29) do
 * cronograma mandam provar. Aqui essa prova é estrutural, não uma
 * coincidência que se confere no olho: a contribuição de cada conta para
 * o lucro é o seu próprio `saldo` (crédito − débito), tanto na estrutura
 * atual quanto na do CPC 51. Mudar de categoria muda a linha em que a
 * conta aparece, nunca o total. `conciliar()` mede essa diferença e
 * `cpc51.test.js` congela a garantia.
 *
 * POR QUE UMA SEGUNDA DIMENSÃO, E NÃO GRUPOS NOVOS: seria tentador criar
 * grupos "RESULTADO_INVESTIMENTO", "RESULTADO_FINANCIAMENTO" em
 * `grupos.js`. Isso quebraria a DRE atual — que foi validada centavo a
 * centavo contra a demonstração oficial (`fixtures/validar.mjs`) — e, no
 * dia em que uma conta caísse num grupo que a hierarquia atual não soma,
 * dinheiro sumiria da tela sem aviso. A categoria do CPC 51 é, por isso,
 * um EIXO PARALELO ao grupo: a mesma conta tem um grupo (a linha da DRE
 * atual) e uma categoria (o bloco do CPC 51). As duas demonstrações leem
 * as mesmas contas e fecham no mesmo lucro.
 *
 * NÃO EXISTE MAIS "NÃO OPERACIONAL". O operacional do CPC 51 é a
 * categoria RESIDUAL: tudo que não é investimento, financiamento,
 * tributo sobre o lucro ou operação descontinuada é operacional — venda
 * de imobilizado inclusive. Por isso `OUTRAS_REC`/`OUTRAS_DESP` caem em
 * operacional por padrão, marcados para revisão.
 */

import { GRUPOS, NOME_GRUPO } from "./grupos.js";

export const CATEGORIAS = [
  {
    id: "OPERACIONAL",
    nome: "Operacional",
    subtotal: "Resultado Operacional",
    residual: true,
    descricao:
      "Categoria residual: receitas e despesas da atividade-fim e tudo que não " +
      "couber nas outras quatro. No CPC 51 não existe mais 'não operacional' — " +
      "ganho na venda de imobilizado, por exemplo, é operacional.",
  },
  {
    id: "INVESTIMENTO",
    nome: "Investimento",
    subtotal: "Resultado antes do financiamento e dos tributos sobre o lucro",
    descricao:
      "Retorno de ativos que geram resultado individualmente e de forma " +
      "largamente independente dos demais recursos da entidade: caixa e " +
      "equivalentes, aplicações financeiras, participações societárias " +
      "(equivalência patrimonial) e imóveis de investimento.",
  },
  {
    id: "FINANCIAMENTO",
    nome: "Financiamento",
    subtotal: "Resultado antes dos tributos sobre o lucro",
    descricao:
      "Receitas e despesas de passivos contraídos para captar recursos: juros " +
      "de empréstimos e financiamentos, debêntures, e o custo financeiro " +
      "embutido em arrendamentos.",
  },
  {
    id: "TRIBUTOS",
    nome: "Tributos sobre o lucro",
    subtotal: "Resultado das operações continuadas",
    descricao:
      "IRPJ e CSLL, correntes e diferidos. Tributo que não incide sobre o lucro " +
      "— ISS, PIS e COFINS sobre a receita — permanece em operacional.",
  },
  {
    id: "DESCONTINUADAS",
    nome: "Operações descontinuadas",
    subtotal: "Resultado líquido do período",
    descricao:
      "Resultado, líquido de tributos, de operações descontinuadas conforme o " +
      "CPC 31. Categoria própria, apresentada depois dos tributos.",
  },
];

export const NOME_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.nome]));
export const IDS_CATEGORIA = CATEGORIAS.map((c) => c.id);
const VALIDA = new Set(IDS_CATEGORIA);

/* A POLÍTICA CONTÁBIL — o julgamento da Fase 1, passo 2.
 *
 * O CPC 51 classifica de forma diferente quem tem, como ATIVIDADE DE
 * NEGÓCIO PRINCIPAL, investir em ativos (holding, fundo, seguradora) ou
 * conceder financiamento a clientes (banco, financeira, crediário
 * próprio). Nesses casos, o que seria investimento ou financiamento
 * volta para o operacional — porque é a atividade-fim da empresa.
 *
 * Isso não é detalhe de configuração: é a definição que a norma manda
 * documentar em política contábil formal, e é a primeira pergunta que a
 * auditoria vai fazer. Por isso mora aqui, viaja no perfil e sai na
 * planilha exportada. */
export const POLITICA_PADRAO = {
  investirEhAtividadePrincipal: false,
  financiarClientesEhAtividadePrincipal: false,
};

/* Mapa padrão grupo da DRE → categoria do CPC 51.
 *
 * `revisar` marca os grupos cuja categoria depende de julgamento ou que
 * misturam naturezas — são exatamente os que a Fase 2 (passo 8) manda
 * desmembrar em subcontas. A tela lista esses grupos primeiro, com o
 * motivo, em vez de deixar o usuário descobrir sozinho. */
export const MAPA_PADRAO = {
  REC_MENSALIDADES: { categoria: "OPERACIONAL" },
  REC_TAXAS: { categoria: "OPERACIONAL" },
  DED_BOLSAS: { categoria: "OPERACIONAL" },
  DED_PROUNI: { categoria: "OPERACIONAL" },
  DED_DEVOLUCOES: { categoria: "OPERACIONAL" },
  DED_DESCONTOS: { categoria: "OPERACIONAL" },
  DED_IMPOSTOS: { categoria: "OPERACIONAL" },
  CUSTOS: { categoria: "OPERACIONAL" },
  DESP_FOPAG: { categoria: "OPERACIONAL" },
  DESP_ADM: { categoria: "OPERACIONAL" },
  DEPRECIACAO: { categoria: "OPERACIONAL" },
  PROVISOES_CONTINGENCIAS: { categoria: "OPERACIONAL" },
  PROVISOES_PCLD: { categoria: "OPERACIONAL" },

  REC_FIN: {
    categoria: "INVESTIMENTO",
    revisar:
      "Este grupo mistura duas naturezas que o CPC 51 separa: rendimento de " +
      "aplicação financeira e de caixa é INVESTIMENTO, mas juros e multa de mora " +
      "cobrados de aluno inadimplente nascem da própria operação e ficam em " +
      "OPERACIONAL. Separe conta a conta abaixo, ou desmembre em subcontas no " +
      "plano (Fase 2, passo 8).",
  },
  DESP_FIN: {
    categoria: "FINANCIAMENTO",
    revisar:
      "Juros de empréstimo e financiamento são FINANCIAMENTO. Tarifa bancária, " +
      "IOF sobre operação corrente e despesa de cobrança não remuneram captação " +
      "de recursos: são OPERACIONAL.",
  },
  OUTRAS_REC: {
    categoria: "OPERACIONAL",
    revisar:
      "No CPC 51 não existe 'não operacional': o operacional é a categoria " +
      "residual. Mas confira o que há aqui — equivalência patrimonial e venda de " +
      "participação vão para INVESTIMENTO, e resultado de operação descontinuada " +
      "tem categoria própria.",
  },
  OUTRAS_DESP: {
    categoria: "OPERACIONAL",
    revisar:
      "Mesma revisão de 'Receitas Não Operacionais': o rótulo desaparece no " +
      "CPC 51, mas perda em participação societária é INVESTIMENTO e operação " +
      "descontinuada tem categoria própria.",
  },

  IRPJ_CSLL: { categoria: "TRIBUTOS" },
  IGNORAR: { categoria: null },
};

/** Categoria padrão de um grupo, já sob a política contábil da empresa.
 *
 *  A política não muda o mapa: ela COLAPSA categorias no operacional
 *  quando aquela atividade é o negócio principal. Um banco não tem
 *  "resultado de financiamento" abaixo do operacional — financiar é a
 *  operação dele. */
export function categoriaDoGrupo(grupo, politica = POLITICA_PADRAO) {
  const base = MAPA_PADRAO[grupo]?.categoria ?? null;
  if (!base) return null;
  if (base === "INVESTIMENTO" && politica.investirEhAtividadePrincipal) return "OPERACIONAL";
  if (base === "FINANCIAMENTO" && politica.financiarClientesEhAtividadePrincipal) return "OPERACIONAL";
  return base;
}

/** A categoria efetiva de uma conta: decisão manual vence o padrão do
 *  grupo, exatamente como a classificação manual vence a sugestão
 *  automática no resto do app. */
export function resolverCategoria({ conta, grupo, categoriaPorConta = {}, politica = POLITICA_PADRAO }) {
  const manual = categoriaPorConta[conta];
  if (manual && VALIDA.has(manual)) return manual;
  return categoriaDoGrupo(grupo, politica);
}

/** Fábrica da função `categoriaDe(conta)` usada pelo resto do app —
 *  evita que cada chamador repita a mesma composição de grupoDe +
 *  override + política (e erre em um dos três). */
export function fazerCategoriaDe({ grupoDe, categoriaPorConta = {}, politica = POLITICA_PADRAO }) {
  return (conta) =>
    resolverCategoria({ conta, grupo: grupoDe(conta), categoriaPorConta, politica });
}

const ordemGrupo = Object.fromEntries(GRUPOS.map((g, i) => [g.id, i]));

/** A demonstração do resultado na estrutura do CPC 51.
 *
 *  O valor de cada conta é o próprio saldo (crédito − débito): receita
 *  entra positiva, despesa negativa. Não há sinal por grupo aqui, e é de
 *  propósito — no CPC 51 as linhas são somadas dentro da categoria, e é
 *  essa soma direta que garante que o lucro líquido seja idêntico ao da
 *  estrutura atual. */
export function montarDRE51(contasResultado, grupoDe, categoriaDe) {
  const cat = {};
  CATEGORIAS.forEach((c) => (cat[c.id] = { id: c.id, nome: c.nome, total: 0, grupos: [] }));
  const porGrupo = {}; // categoria|grupo -> bloco

  let foraDaDemonstracao = 0;
  contasResultado.forEach((c) => {
    const categoria = categoriaDe(c.conta);
    if (!categoria || !cat[categoria]) {
      foraDaDemonstracao += c.saldo;
      return;
    }
    const grupo = grupoDe(c.conta);
    const chave = `${categoria}|${grupo}`;
    if (!porGrupo[chave]) {
      porGrupo[chave] = { id: grupo, nome: NOME_GRUPO[grupo] || grupo, total: 0, contas: [] };
      cat[categoria].grupos.push(porGrupo[chave]);
    }
    porGrupo[chave].total += c.saldo;
    porGrupo[chave].contas.push({ ...c, val: c.saldo });
    cat[categoria].total += c.saldo;
  });

  Object.values(cat).forEach((c) => {
    c.grupos.sort((a, b) => (ordemGrupo[a.id] ?? 99) - (ordemGrupo[b.id] ?? 99));
    c.grupos.forEach((g) => g.contas.sort((a, b) => Math.abs(b.val) - Math.abs(a.val)));
  });

  const operacional = cat.OPERACIONAL.total;
  const investimento = cat.INVESTIMENTO.total;
  const financiamento = cat.FINANCIAMENTO.total;
  const tributos = cat.TRIBUTOS.total;
  const descontinuadas = cat.DESCONTINUADAS.total;

  const antesFinTributos = operacional + investimento;
  const antesTributos = antesFinTributos + financiamento;
  const continuadas = antesTributos + tributos;
  const liquido = continuadas + descontinuadas;

  return {
    cat, operacional, investimento, financiamento, tributos, descontinuadas,
    antesFinTributos, antesTributos, continuadas, liquido, foraDaDemonstracao,
  };
}

/* Quais grupos entram no "Resultado Operacional" da estrutura ATUAL
 * (`montarDRE`): tudo menos não operacional, tributos e ignorado. Está
 * escrito aqui, e não deduzido do texto do rótulo, porque a ponte entre
 * as duas estruturas precisa ser exata — é ela que a auditoria lê. */
const FORA_DO_OPERACIONAL_ATUAL = new Set(["OUTRAS_REC", "OUTRAS_DESP", "IRPJ_CSLL", "IGNORAR"]);

/** A ponte entre as duas estruturas — o coração das "DFs paralelas".
 *
 *  Responde duas perguntas que a diretoria e a auditoria fazem nessa
 *  ordem: (1) o lucro líquido mudou? (não pode ter mudado); (2) então o
 *  que mudou? A resposta de (2) é conta a conta, agrupada pelo MOTIVO da
 *  mudança, não uma diferença global que ninguém consegue explicar. */
export function conciliar(dre, dre51, contasResultado, grupoDe, categoriaDe) {
  const saidas = {}; // categoria destino -> valor que saiu do operacional
  const entradas = {}; // grupo de origem -> valor que entrou no operacional

  contasResultado.forEach((c) => {
    const grupo = grupoDe(c.conta);
    if (grupo === "IGNORAR") return;
    const categoria = categoriaDe(c.conta);
    const noOperAtual = !FORA_DO_OPERACIONAL_ATUAL.has(grupo);
    const noOper51 = categoria === "OPERACIONAL";
    if (noOperAtual && !noOper51) {
      const destino = categoria || "FORA";
      saidas[destino] = (saidas[destino] || 0) + c.saldo;
    } else if (!noOperAtual && noOper51) {
      entradas[grupo] = (entradas[grupo] || 0) + c.saldo;
    }
  });

  /* Sem prefixo "( – )" / "( + )" nos rótulos, ao contrário do resto do
     app: aqui o sinal do ajuste depende da natureza da conta que se
     moveu, não da direção do movimento. Tirar do operacional uma DESPESA
     financeira SOMA ao resultado. Um "( – )" fixo ao lado de um número
     positivo faria o leitor duvidar da conta certa. */
  const pontes = [{ lbl: "Resultado Operacional (estrutura atual)", val: dre.resultadoOper, t: "sub" }];
  Object.entries(saidas)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([destino, val]) =>
      pontes.push({
        lbl: `Reclassificado para ${NOME_CATEGORIA[destino] || "fora da demonstração"}`,
        val: -val,
        t: "l",
      })
    );
  Object.entries(entradas)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([grupo, val]) =>
      pontes.push({
        lbl: `${NOME_GRUPO[grupo] || grupo} — agora dentro do operacional`,
        val,
        t: "l",
      })
    );
  pontes.push({ lbl: "Resultado Operacional (CPC 51)", val: dre51.operacional, t: "sub" });

  /* A ponte tem que fechar sozinha. Se não fechar, o defeito está no
     mapeamento de categorias — e é melhor a tela dizer isso do que
     apresentar uma reconciliação que não reconcilia. */
  const somaPonte =
    dre.resultadoOper +
    pontes.slice(1, -1).reduce((s, p) => s + p.val, 0);
  const residuoPonte = dre51.operacional - somaPonte;

  const diferenca = dre51.liquido - dre.liquido;
  return {
    liquidoAtual: dre.liquido,
    liquido51: dre51.liquido,
    diferenca,
    fecha: Math.abs(diferenca) < 0.01,
    pontes,
    residuoPonte,
    ponteFecha: Math.abs(residuoPonte) < 0.01,
  };
}

/* Limiar do detector de contas mistas: a natureza minoritária precisa
 * pesar pelo menos 5% da majoritária. Abaixo disso é estorno pontual,
 * não conta de natureza dupla — e um detector que aponta tudo não
 * aponta nada. */
const LIMIAR_MISTA = 0.05;

/** Diagnóstico da Fase 2, passo 8: contas que agregam naturezas
 *  diferentes e precisam ser desmembradas em subcontas.
 *
 *  Dois sinais independentes, que aparecem juntos ou separados:
 *
 *  1. DUPLO SENTIDO — a conta tem débito E crédito relevantes. Numa
 *     conta de receita isso pode ser só estorno; acima do limiar,
 *     costuma ser receita e despesa dividindo o mesmo código.
 *  2. DIVERGÊNCIA — o classificador por TEXTO (histórico dos
 *     lançamentos) sugere um grupo de categoria diferente da categoria
 *     efetiva da conta. É o sinal mais forte quando existe, porque
 *     confronta duas leituras independentes do mesmo fato.
 *
 *  Não é veredito, é fila de trabalho: a saída é ordenada por valor,
 *  porque desmembrar a conta de R$ 3 milhões vale mais que a de R$ 30. */
export function contasMistas(contasResultado, { grupoDe, categoriaDe, sugestaoTexto = {}, politica = POLITICA_PADRAO }) {
  const achados = [];
  contasResultado.forEach((c) => {
    const grupo = grupoDe(c.conta);
    if (grupo === "IGNORAR") return;
    const categoria = categoriaDe(c.conta);
    const motivos = [];

    const deb = Math.abs(c.deb || 0);
    const cre = Math.abs(c.cre || 0);
    const menor = Math.min(deb, cre);
    const maior = Math.max(deb, cre);
    if (menor > 0 && maior > 0 && menor / maior >= LIMIAR_MISTA) {
      motivos.push({
        tipo: "duplo-sentido",
        texto:
          `Movimenta os dois lados: ${(menor / maior * 100).toFixed(0)}% do movimento ` +
          `vai contra a natureza da conta. Pode haver receita e despesa no mesmo código.`,
      });
    }

    const grupoTexto = sugestaoTexto[c.conta];
    if (grupoTexto && grupoTexto !== "IGNORAR") {
      const catTexto = categoriaDoGrupo(grupoTexto, politica);
      if (catTexto && categoria && catTexto !== categoria) {
        motivos.push({
          tipo: "divergencia",
          texto:
            `O histórico dos lançamentos parece de "${NOME_GRUPO[grupoTexto]}" ` +
            `(categoria ${NOME_CATEGORIA[catTexto]}), mas a conta está em ` +
            `${NOME_CATEGORIA[categoria]}.`,
        });
      }
    }

    if (motivos.length) {
      achados.push({ conta: c.conta, saldo: c.saldo, grupo, categoria, motivos });
    }
  });
  return achados.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
}

/** A planilha De-Para da Fase 2 — conta a conta, de onde veio e para
 *  onde vai, com a origem da decisão registrada.
 *
 *  A coluna `origem` é o que transforma a planilha em documento de
 *  auditoria: sem ela, ninguém sabe se aquela categoria foi escolhida
 *  por alguém ou herdada do padrão do grupo. */
export function deParaCPC51(contasResultado, { grupoDe, categoriaPorConta = {}, politica = POLITICA_PADRAO, nomes = {} }) {
  return contasResultado
    .map((c) => {
      const grupo = grupoDe(c.conta);
      const manual = categoriaPorConta[c.conta] && VALIDA.has(categoriaPorConta[c.conta]);
      const categoria = resolverCategoria({ conta: c.conta, grupo, categoriaPorConta, politica });
      return {
        conta: c.conta,
        descricao: nomes[c.conta] || "",
        grupo,
        grupoNome: NOME_GRUPO[grupo] || grupo,
        categoria,
        categoriaNome: categoria ? NOME_CATEGORIA[categoria] : "Não entra na DRE",
        origem: manual ? "decisão manual" : "padrão do grupo",
        saldo: c.saldo,
      };
    })
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
}

/** O motivo pelo qual um grupo ainda depende de julgamento — ou null.
 *
 *  A política contábil PODE encerrar a dúvida: num banco que declarou
 *  financiar clientes como atividade principal, juros de empréstimo e
 *  tarifa bancária vão ambos para operacional, e a pergunta "qual dos
 *  dois é financiamento?" deixa de existir. Continuar pedindo revisão
 *  ali seria pedir trabalho que a decisão anterior já resolveu — e uma
 *  lista de pendências com item resolvido dentro é uma lista que ninguém
 *  usa. */
export function revisarGrupo(grupo, politica = POLITICA_PADRAO) {
  const def = MAPA_PADRAO[grupo];
  if (!def?.revisar) return null;
  if (def.categoria === "INVESTIMENTO" && politica.investirEhAtividadePrincipal) return null;
  if (def.categoria === "FINANCIAMENTO" && politica.financiarClientesEhAtividadePrincipal) return null;
  return def.revisar;
}

/** Quanto do trabalho de categorização já está de pé — o número que a
 *  Fase 2 precisa reportar ao cliente na Fase 3. */
export function coberturaCPC51(contasResultado, { grupoDe, categoriaPorConta = {}, politica = POLITICA_PADRAO }) {
  let categorizadas = 0, manuais = 0, aRevisar = 0, valorARevisar = 0;
  contasResultado.forEach((c) => {
    const grupo = grupoDe(c.conta);
    if (grupo === "IGNORAR") return;
    categorizadas++;
    if (categoriaPorConta[c.conta] && VALIDA.has(categoriaPorConta[c.conta])) manuais++;
    else if (revisarGrupo(grupo, politica)) { aRevisar++; valorARevisar += Math.abs(c.saldo); }
  });
  return { categorizadas, manuais, aRevisar, valorARevisar };
}

/** Grupos cuja categoria depende de julgamento — a pauta da reunião da
 *  Fase 3 e o conteúdo do documento de política contábil da Fase 1. */
export function gruposParaRevisar(politica = POLITICA_PADRAO) {
  return GRUPOS.filter((g) => revisarGrupo(g.id, politica)).map((g) => ({
    id: g.id,
    nome: g.nome,
    categoria: categoriaDoGrupo(g.id, politica),
    motivo: revisarGrupo(g.id, politica),
  }));
}
