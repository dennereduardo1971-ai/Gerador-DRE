/* Balancete de Verificação — o formato completo, com hierarquia.
 *
 * Diferente do balancete simples de `abertura.js` (código;saldo), este é o
 * relatório que o sistema contábil emite de verdade: código pontuado em
 * vários níveis, descrição, saldo anterior, débito e crédito do período,
 * movimento e saldo atual — com a natureza do saldo indicada por "D" ou
 * "C" no fim do número, não por sinal.
 *
 * Ele traz muito mais do que o app pedia para montar o Balanço: traz o
 * Balanço inteiro, já hierarquizado e conferido pela contabilidade. Então
 * quando este formato é reconhecido, ele passa a ser a FONTE do Balanço, e
 * o razão importado vira a contraprova — não o contrário.
 *
 * Três características da hierarquia que o parser precisa respeitar:
 *
 * 1. Os níveis não têm largura fixa. No plano do IESB são 1, 2, 3, 5 e 7
 *    dígitos (1 → 1.1 → 1.1.1 → 1.1.11.0 → 1.1.11.00.1). Fatiar de dois
 *    em dois, ou por número de pontos, monta a árvore errada.
 * 2. Um nível pode ser pulado. "1.3.40.0" (depreciação acumulada) pendura
 *    direto em "1.3", porque não existe "1.3.4". Por isso o pai é o
 *    PREFIXO MAIS LONGO QUE EXISTE, e não o de um nível acima.
 * 3. As sintéticas já vêm somadas no arquivo. Somar tudo dá o dobro —
 *    só as folhas entram em qualquer total calculado aqui.
 */

const norm = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

/** Valor com natureza no sufixo: "1.234,56 D" → +1234.56; " C" → −1234.56.
 *  Devedor positivo, credor negativo, que é a convenção usada no resto do
 *  app (o ativo soma positivo, o passivo soma negativo).
 *
 *  O ponto é ambíguo e as duas formas convivem no MESMO arquivo: as
 *  colunas formatadas vêm em pt-BR ("123.456.789,01 D") e as colunas
 *  numéricas cruas vêm com ponto decimal ("123456789.01"). A regra que
 *  desempata é a vírgula, igual à de `numeroBR`: se há vírgula, o ponto é
 *  separador de milhar; se não há, o ponto é decimal. Tratar o ponto como
 *  milhar nos dois casos multiplicava o movimento do período por cem. */
export function valorDC(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const t = String(v).trim();
  const m = t.match(/^\(?\s*(-?[\d.,]+)\s*\)?\s*([DC])?$/i);
  if (!m) return 0;
  let bruto = m[1];
  bruto = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const n = Number(bruto);
  if (!Number.isFinite(n)) return 0;
  const credor = (m[2] || "").toUpperCase() === "C";
  return credor ? -Math.abs(n) : n;
}

const COLUNAS = [
  ["conta", ["conta", "codigo", "classificacao"]],
  ["descricao", ["descricao", "historico", "nome", "conta descricao"]],
  ["anterior", ["saldo anterior", "anterior", "saldo inicial"]],
  ["debito", ["debito", "debitos"]],
  ["credito", ["credito", "creditos"]],
  ["movimento", ["mov periodo", "movimento", "movimento periodo", "saldo movimento"]],
  ["atual", ["saldo atual", "atual", "saldo final", "saldo"]],
];

/** Acha a linha de cabeçalho e mapeia cada campo para o índice da coluna.
 *  Devolve null se não parecer um balancete — é assim que o app decide
 *  entre este formato e o simples, sem pedir ao usuário que saiba qual é
 *  qual. */
export function detectarColunas(linhas) {
  for (let i = 0; i < Math.min(linhas.length, 30); i++) {
    const linha = (linhas[i] || []).map(norm);
    if (!linha.some((c) => c === "conta" || c === "codigo")) continue;

    const idx = {};
    for (const [campo, termos] of COLUNAS) {
      const alvos = termos.map(norm);
      const pos = linha.findIndex((c, k) => c && alvos.includes(c) && !Object.values(idx).includes(k));
      if (pos >= 0) idx[campo] = pos;
    }
    // Sem saldo atual e sem saldo anterior não há balancete nenhum aqui.
    if (idx.conta != null && (idx.atual != null || idx.anterior != null)) {
      return { cabecalho: i, idx };
    }
  }
  return null;
}

/** Pai de uma conta: o prefixo mais longo que existe de fato no arquivo. */
function acharPai(codigo, existentes) {
  for (let n = codigo.length - 1; n >= 1; n--) {
    const p = codigo.slice(0, n);
    if (existentes.has(p)) return p;
  }
  return null;
}

export function parsearBalancete(linhas) {
  const det = detectarColunas(linhas);
  if (!det) return null;
  const { cabecalho, idx } = det;

  const contas = [];
  const porCodigo = new Map();
  let ignoradas = 0;

  for (let i = cabecalho + 1; i < linhas.length; i++) {
    const l = linhas[i] || [];
    const bruto = String(l[idx.conta] ?? "").trim();
    // Código de conta é dígitos e pontos. Cabeçalhos repetidos, linhas de
    // título e o rodapé "T O T A I S" caem fora por aqui.
    if (!bruto || !/^[\d.]+$/.test(bruto)) { if (bruto) ignoradas++; continue; }
    const codigo = bruto.replace(/\./g, "");
    if (!codigo) { ignoradas++; continue; }

    const c = {
      codigo,
      exibicao: bruto,
      descricao: String(l[idx.descricao] ?? "").trim(),
      anterior: valorDC(l[idx.anterior]),
      debito: Math.abs(valorDC(l[idx.debito])),
      credito: Math.abs(valorDC(l[idx.credito])),
      movimento: valorDC(l[idx.movimento]),
      atual: valorDC(l[idx.atual]),
      filhos: [],
      pai: null,
      nivel: 0,
    };
    // Movimento pode não vir na exportação; débito − crédito é a definição.
    if (idx.movimento == null) c.movimento = c.debito - c.credito;
    if (idx.atual == null) c.atual = c.anterior + c.movimento;

    if (porCodigo.has(codigo)) { ignoradas++; continue; }
    porCodigo.set(codigo, c);
    contas.push(c);
  }

  if (!contas.length) return null;

  // Hierarquia por prefixo mais longo existente.
  const existentes = new Set(porCodigo.keys());
  for (const c of contas) {
    const p = acharPai(c.codigo, existentes);
    if (p) {
      c.pai = p;
      porCodigo.get(p).filhos.push(c.codigo);
    }
  }
  for (const c of contas) {
    let n = 0, atual = c;
    while (atual.pai) { n++; atual = porCodigo.get(atual.pai); }
    c.nivel = n;
  }

  const raizes = contas.filter((c) => !c.pai).map((c) => c.codigo);
  const folhas = contas.filter((c) => !c.filhos.length);

  return {
    contas, porCodigo, raizes, folhas,
    lidas: contas.length,
    ignoradas,
    resumo: resumir(contas, porCodigo),
    // Saldo de abertura por conta analítica — é o que liga este arquivo
    // ao caminho que o Balanço já tinha antes deste formato existir.
    saldosAbertura: Object.fromEntries(folhas.map((c) => [c.codigo, c.anterior])),
  };
}

/** Confere a integridade interna e mede o desequilíbrio patrimonial.
 *
 *  O desequilíbrio NÃO é erro: um balancete das contas 1 e 2 fecha por
 *  Ativo − (Passivo + PL) = resultado do exercício, que vive nas contas 3
 *  a 7 e ainda não foi transportado ao Patrimônio Líquido.
 *
 *  ATENÇÃO AO PERÍODO. Esse resultado é o ACUMULADO do exercício, não o
 *  do mês: as contas de resultado vêm acumuladas desde janeiro no campo
 *  `atual`. Quem reproduz esse número é a DRE montada com
 *  `contasAcumuladas`, NUNCA a montada com `contasDeMovimento` (que é o
 *  resultado só do mês). Confundir os dois faz o app acusar divergência
 *  todo mês sem que exista erro nenhum — foi medido contra cinco
 *  balancetes reais: em todos, DRE acumulada = Ativo − Passivo até o
 *  centavo, e DRE do mês = acumulado do mês − acumulado do mês anterior.
 *
 *  Duas conferências, e a diferença entre elas importa:
 *
 *  - `inconsistentes` — anterior + movimento = atual, linha a linha. É
 *    aritmética do próprio arquivo, sempre confiável.
 *  - `raizesErradas` — a soma das FOLHAS de cada dígito raiz bate com o
 *    total da própria raiz. Também confiável, porque não depende da
 *    árvore: quais contas são folhas se decide por prefixo, e o conjunto
 *    de folhas é o mesmo em qualquer arranjo de pais.
 *
 *  `sinteticasAproximadas` é informativo e de propósito NÃO entra em
 *  `integro`. A hierarquia é reconstruída pelo prefixo mais longo que
 *  existe, e num plano real há conta-folha cujo pai verdadeiro não é seu
 *  prefixo (ex.: a folha 4110110 pertence à sintética 411010, que não é
 *  prefixo dela). Isso desloca a folha de galho sem mudar nenhum total —
 *  tratar como erro seria acusar defeito onde só há ambiguidade de
 *  numeração do plano de contas. */
export function resumir(contas, porCodigo) {
  const raiz = (d) => contas.find((c) => c.codigo === d) || null;
  const ativo = raiz("1");
  const passivo = raiz("2");

  const folhas = contas.filter((c) => !c.filhos.length);
  const somaFolhas = (d) => folhas.filter((c) => c.codigo[0] === d).reduce((s, c) => s + c.atual, 0);
  const totalAtivo = ativo ? ativo.atual : somaFolhas("1");
  const totalPassivo = passivo ? passivo.atual : somaFolhas("2");

  // Consistência: anterior + movimento = atual, em toda linha.
  const inconsistentes = contas.filter((c) => Math.abs(c.anterior + c.movimento - c.atual) > 0.01).length;

  // Consistência por raiz: independe da árvore, então não dá falso alarme.
  const digitos = [...new Set(contas.map((c) => c.codigo[0]))];
  const raizesErradas = digitos.filter((d) => {
    const r = porCodigo.get(d);
    return r && Math.abs(somaFolhas(d) - r.atual) > 0.01;
  }).length;

  // Informativo apenas — ver comentário acima.
  const sinteticasAproximadas = contas.filter((c) => {
    if (!c.filhos.length) return false;
    const soma = c.filhos.reduce((s, f) => s + porCodigo.get(f).atual, 0);
    return Math.abs(soma - c.atual) > 0.01;
  }).length;

  return {
    totalAtivo,
    totalPassivo: Math.abs(totalPassivo),
    resultadoExercicio: totalAtivo + totalPassivo,
    debitoPeriodo: folhas.reduce((s, c) => s + c.debito, 0),
    creditoPeriodo: folhas.reduce((s, c) => s + c.credito, 0),
    nContas: contas.length,
    nFolhas: folhas.length,
    inconsistentes,
    raizesErradas,
    sinteticasAproximadas,
    integro: inconsistentes === 0 && raizesErradas === 0,
  };
}

/** Cobertura do balancete: quais lados do plano de contas ele traz.
 *
 *  Um balancete pode vir filtrado. O arquivo típico de fechamento
 *  patrimonial traz só as contas 1 e 2 (Ativo e Passivo); o mesmo
 *  relatório sem filtro traz também 3 a 7, que são as contas de
 *  resultado — e aí ele sozinho monta DRE e Balanço.
 *
 *  O app precisa saber disso para dizer ao usuário o que dá e o que não
 *  dá com o arquivo que ele carregou, em vez de gerar uma DRE zerada. */
export function coberturaBalancete(bal) {
  if (!bal) return { patrimonial: false, resultado: false, digitos: [] };
  const digitos = [...new Set(bal.contas.map((c) => c.codigo[0]))].sort();
  return {
    digitos,
    patrimonial: digitos.some((d) => d === "1" || d === "2"),
    resultado: digitos.some((d) => d >= "3" && d <= "7"),
  };
}

/** Converte as contas analíticas do balancete para o formato que o resto
 *  do app usa (`agregarPorConta`), permitindo montar a DRE a partir do
 *  balancete, sem razão.
 *
 *  As duas fontes descrevem o mesmo fato por caminhos diferentes: o razão
 *  soma lançamento a lançamento até chegar no movimento de cada conta; o
 *  balancete já traz esse movimento somado pela contabilidade. Por isso a
 *  conversão é direta — e por isso o balancete é a fonte mais confiável
 *  das duas, já que passou pelo fechamento.
 *
 *  Atenção ao sinal: `agregarPorConta` usa saldo = crédito − débito
 *  (natureza credora positiva, que é o que `montarDRE` espera para
 *  receitas), enquanto o balancete usa movimento = débito − crédito. Um é
 *  o negativo do outro; trocar isso inverteria a DRE inteira. */
export function contasDeMovimento(bal) {
  if (!bal) return [];
  return bal.folhas.map((c) => ({
    conta: c.codigo,
    deb: c.debito,
    cre: c.credito,
    saldo: c.credito - c.debito,
    historico: c.descricao,
    n: 0, // o balancete não conta lançamentos: ele já vem somado
  }));
}

/** A MESMA conversão, mas a partir do saldo ACUMULADO (`atual`) em vez do
 *  movimento do período.
 *
 *  Um balancete mensal carrega duas demonstrações, não uma:
 *
 *  - `contasDeMovimento` → débito e crédito DO PERÍODO, que dão a DRE
 *    daquele mês. É o que serve para comparar mês a mês.
 *  - `contasAcumuladas`  → saldo atual das contas de resultado, que vêm
 *    acumuladas desde o início do exercício. Dá a DRE do ano até aquela
 *    data — e é ESTA que reproduz, ao centavo, o Ativo − Passivo do mesmo
 *    arquivo.
 *
 *  Verificado contra cinco meses reais: para todo mês,
 *  acumulada(mês) − acumulada(mês anterior) = mensal(mês).
 *
 *  O sinal segue a mesma convenção de `contasDeMovimento`: `agregarPorConta`
 *  e `montarDRE` esperam natureza credora positiva, enquanto `atual` é
 *  devedor positivo. Daí o `-c.atual`. Débito e crédito acumulados não
 *  existem no arquivo (só o saldo), então são derivados do próprio saldo
 *  para que `agruparPorDigito` continue somando algo coerente. */
export function contasAcumuladas(bal) {
  if (!bal) return [];
  return bal.folhas.map((c) => ({
    conta: c.codigo,
    deb: Math.max(c.atual, 0),
    cre: Math.max(-c.atual, 0),
    saldo: -c.atual,
    historico: c.descricao,
    n: 0,
  }));
}

/** Código → descrição de TODAS as contas do balancete, sintéticas
 *  inclusive.
 *
 *  As sintéticas são o que importa aqui: a classificação por código
 *  (`planoPerfil.js`) reconhece o plano pela assinatura, que olha o nome
 *  das contas-síntese de topo. Ou seja, carregar o balancete já entrega
 *  o plano de contas de graça — o arquivo separado de plano de contas
 *  deixa de ser necessário. */
export function nomesDoBalancete(bal) {
  if (!bal) return {};
  return Object.fromEntries(bal.contas.map((c) => [c.codigo, c.descricao]));
}

/** Achata a árvore em ordem de leitura, respeitando quem está aberto.
 *  `abertos` é um Set de códigos; um nó fechado esconde a subárvore. */
export function achatar(bal, abertos, { ocultarSemMovimento = false } = {}) {
  const saida = [];
  const visitar = (codigo) => {
    const c = bal.porCodigo.get(codigo);
    if (!c) return;
    const parado = Math.abs(c.debito) < 0.005 && Math.abs(c.credito) < 0.005;
    if (ocultarSemMovimento && parado && Math.abs(c.atual) < 0.005) return;
    saida.push(c);
    if (!abertos.has(codigo)) return;
    [...c.filhos]
      .sort((a, b) => a.localeCompare(b))
      .forEach(visitar);
  };
  [...bal.raizes].sort((a, b) => a.localeCompare(b)).forEach(visitar);
  return saida;
}

/** Grupos de nível 2 de um lado do balanço (Circulante, Não Circulante,
 *  Patrimônio Líquido), que é como um Balanço se lê. */
export function gruposDe(bal, digito) {
  const raiz = bal.porCodigo.get(digito);
  if (!raiz) return [];
  return raiz.filhos
    .map((f) => bal.porCodigo.get(f))
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((g) => ({
      ...g,
      itens: g.filhos.map((f) => bal.porCodigo.get(f)).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    }));
}

/* ------------------------------------------------------------------ *
 * O período que o balancete cobre.
 *
 * O relatório do sistema contábil grava numa aba à parte ("Parametros")
 * as respostas usadas na extração — entre elas a data inicial e a final.
 * Ler isso evita pedir ao usuário que digite um período que o arquivo já
 * declara, e é o que permite rotular sozinho o retrato salvo no
 * histórico.
 *
 * É best-effort de propósito: se a aba não vier, ou vier com outro texto,
 * devolve null e o app segue sem rótulo automático — nunca inventa uma
 * data, porque um período errado num arquivo entregue ao cliente é pior
 * do que período nenhum.
 * ------------------------------------------------------------------ */

const MES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const ehData = (v) => /^\s*\d{2}\/\d{2}\/\d{4}\s*$/.test(String(v ?? ""));

/** Procura "Data Inicial" e "Data Final" em qualquer aba, em qualquer
 *  coluna: a resposta é a primeira célula com cara de data na mesma
 *  linha do rótulo. */
export function periodoDoBalancete(abas) {
  if (!Array.isArray(abas)) return null;
  let inicio = null, fim = null;

  for (const aba of abas) {
    for (const linha of aba?.linhas || []) {
      if (!Array.isArray(linha)) continue;
      const rotulo = norm(linha.find((c) => String(c ?? "").trim()) ?? "");
      if (!rotulo.includes("data")) continue;
      const data = linha.slice(1).find(ehData);
      if (!data) continue;
      if (rotulo.includes("datainicial") && !inicio) inicio = String(data).trim();
      else if (rotulo.includes("datafinal") && !fim) fim = String(data).trim();
    }
  }

  if (!inicio && !fim) return null;
  return { inicio, fim, legivel: periodoLegivel(inicio, fim) };
}

/** "01/06/2026"–"30/06/2026" → "junho de 2026". Quando as datas não são o
 *  mês inteiro, ou cruzam meses, escreve o intervalo em vez de forçar um
 *  nome de mês que mentiria sobre o recorte. */
export function periodoLegivel(inicio, fim) {
  const partes = (d) => {
    const m = String(d ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? { dia: +m[1], mes: +m[2], ano: +m[3] } : null;
  };
  const a = partes(inicio), b = partes(fim);
  if (!a || !b) return inicio || fim || "";
  const mesmoMes = a.mes === b.mes && a.ano === b.ano;
  const ultimoDia = new Date(b.ano, b.mes, 0).getDate();
  if (mesmoMes && a.dia === 1 && b.dia === ultimoDia) {
    return `${MES_EXTENSO[a.mes - 1]} de ${a.ano}`;
  }
  return `${inicio} a ${fim}`;
}
