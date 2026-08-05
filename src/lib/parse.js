/* Leitura e normalização do razão contábil importado. */

export const brl = (n) =>
  (n < 0 ? "(" : "") +
  Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  (n < 0 ? ")" : "");

export const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) + "%" : "—");

/** Converte "1.234,56", "1234,56" ou "1234.56" para número. */
export function numeroBR(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/[R$\s]/g, "");
  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");
  if (temVirgula && temPonto) s = s.replace(/\./g, "").replace(",", ".");
  else if (temVirgula) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Decodifica tentando UTF-8 e caindo para Windows-1252 (padrão de exportação
 *  da maioria dos sistemas contábeis brasileiros). */
export async function lerTexto(file) {
  const buf = await file.arrayBuffer();
  let txt = new TextDecoder("utf-8").decode(buf);
  if (txt.includes("\uFFFD")) txt = new TextDecoder("windows-1252").decode(buf);
  return txt;
}

const normalizarNome = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

/** Acha a coluna do CSV cujo nome bate com um dos termos, ignorando acentos
 *  e pontuação, em três passadas cada vez mais tolerantes:
 *  1. igualdade exata ("Historico" = "historico");
 *  2. a coluna contém o termo ("Valor Debito" contém "debito");
 *  3. o termo contém a coluna ("historico" contém "hist") — é o que faz
 *     abreviação de sistema contábil ser reconhecida. Exige pelo menos 3
 *     letras na coluna, senão uma coluna chamada "D" viraria a data só
 *     porque "d" cabe dentro de "dia/mes". */
export function acharColuna(cols, ...termos) {
  const norm = normalizarNome;
  for (const t of termos) {
    const alvo = norm(t);
    const hit = cols.find((c) => norm(c) === alvo);
    if (hit) return hit;
  }
  for (const t of termos) {
    const alvo = norm(t);
    const hit = cols.find((c) => norm(c).includes(alvo));
    if (hit) return hit;
  }
  for (const t of termos) {
    const alvo = norm(t);
    const hit = cols.find((c) => norm(c).length >= 3 && alvo.includes(norm(c)));
    if (hit) return hit;
  }
  return "";
}

/** Descobre o mapeamento de colunas de um razão a partir do cabeçalho.
 *
 *  Cada coluna só pode ser usada UMA vez. Sem isso, um cabeçalho enxuto
 *  como "Data;Debito;Credito;Valor" fazia `contaD` e `valorD` apontarem
 *  para a mesma coluna "Debito" — e o app somava o CÓDIGO da conta como
 *  se fosse dinheiro, calado, produzindo uma DRE inteira de números
 *  inventados. Errar a coluna é recuperável (o usuário corrige na etapa
 *  2); somar código de conta como valor sem avisar, não. */
export function mapearColunas(campos) {
  const usadas = new Set();
  const pegar = (...termos) => {
    const hit = acharColuna(campos.filter((c) => !usadas.has(c)), ...termos);
    if (hit) usadas.add(hit);
    return hit;
  };
  return {
    contaD: pegar("cta. debito", "conta debito", "debito"),
    contaC: pegar("cta. credito", "conta credito", "credito"),
    valorD: pegar("valor debito", "vlr debito", "debito"),
    valorC: pegar("valor credito", "vlr credito", "credito"),
    hist: pegar("historico", "descricao", "complemento"),
    data: pegar("dia/mes", "data", "mes"),
    ano: pegar("ano"),
    cc: pegar("c.custo debito", "centro de custo", "ccusto"),
  };
}

/** Um texto "parece valor"? Código de conta é inteiro longo sem separador
 *  decimal; valor tem centavos ou é um número curto. Heurística boba de
 *  propósito — só precisa ser boa o bastante para levantar a mão. */
function pareceValor(v) {
  const s = String(v ?? "").replace(/[R$\s]/g, "").trim();
  if (!s) return false;
  if (/^\d{5,}$/.test(s)) return false; // 3110101 é conta, não R$
  return !isNaN(numeroBR(s)) && /\d/.test(s);
}

/** Confere o mapeamento contra uma amostra das linhas e devolve avisos em
 *  português para mostrar na etapa Conferir. A ideia é que nenhum erro de
 *  mapeamento chegue calado até a DRE: se o app não tem certeza, ele diz. */
export function avisosDoMapeamento(map, linhas = []) {
  const avisos = [];

  if (!map.valorD && !map.valorC) {
    avisos.push(
      "Não identifiquei nenhuma coluna de valor. Sem ela todos os saldos ficam zerados — " +
      "escolha as colunas de valor de débito e de crédito abaixo."
    );
  }

  const colidem = [];
  if (map.contaD && map.contaD === map.valorD) colidem.push(map.contaD);
  if (map.contaC && map.contaC === map.valorC) colidem.push(map.contaC);
  if (colidem.length) {
    avisos.push(
      `A coluna "${colidem[0]}" está sendo usada como conta e como valor ao mesmo tempo. ` +
      "Uma das duas está errada — corrija antes de seguir, senão o código da conta entra na soma como se fosse dinheiro."
    );
  }

  const amostra = linhas.slice(0, 200);
  for (const [chave, nome] of [["valorD", "valor de débito"], ["valorC", "valor de crédito"]]) {
    const col = map[chave];
    if (!col || !amostra.length) continue;
    const preenchidas = amostra.filter((l) => String(l[col] ?? "").trim() !== "");
    if (!preenchidas.length) continue;
    const validas = preenchidas.filter((l) => pareceValor(l[col])).length;
    if (validas / preenchidas.length < 0.5) {
      avisos.push(
        `A coluna "${col}", mapeada como ${nome}, não parece conter valores em R$ — ` +
        "os números lá dentro têm cara de código de conta. Confira o mapeamento."
      );
    }
  }

  return avisos;
}

const MESES_ABREV = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/** Extrai a competência (mês/ano) de uma linha, a partir da data e do ano.
 *  Aceita "DD/mmm" + ano separado (formato comum de razão brasileiro) ou uma
 *  data completa "DD/MM/AAAA". Retorna algo como "07/2026", ou "" se não der
 *  para reconhecer o formato — nesse caso a linha não entra na análise
 *  horizontal, mas continua valendo para os totais normais. */
/** Ano sempre com 4 dígitos. Razão exportado com ano "26" gerava a
 *  competência "01/26", que convivia com "01/2026" vinda de outro arquivo
 *  como se fossem meses diferentes — o mesmo mês aparecia duas vezes no
 *  seletor e na análise horizontal. */
function normalizarAno(v) {
  const s = String(v ?? "").trim();
  if (/^\d{4}$/.test(s)) return s;
  if (/^\d{2}$/.test(s)) return `20${s}`;
  return "";
}

export function competenciaDaLinha(dataStr, anoStr) {
  if (!dataStr) return "";
  const s = String(dataStr).trim().toLowerCase();
  const partes = s.split("/");
  if (partes.length >= 2) {
    const mesTxt = partes[1];
    const mesNum = MESES_ABREV[mesTxt.slice(0, 3)] || (/^\d{1,2}$/.test(mesTxt) ? mesTxt.padStart(2, "0") : null);
    if (mesNum) {
      const ano = normalizarAno(partes[2] || anoStr);
      if (ano) return `${mesNum}/${ano}`;
    }
  }
  return "";
}

/** Ordena competências "MM/AAAA" cronologicamente.
 *
 *  Um `.sort()` comum ordena como texto e coloca o mês na frente do ano:
 *  ['12/2025','01/2026'] virava ['01/2026','12/2025']. Todo razão que
 *  cruza a virada do ano saía com a análise horizontal fora de ordem, e
 *  cada mês era comparado com o "anterior" errado — sem nenhum sinal na
 *  tela de que algo estava trocado. */
export function compararCompetencia(a, b) {
  const [mesA, anoA] = String(a).split("/");
  const [mesB, anoB] = String(b).split("/");
  return `${anoA}${mesA}`.localeCompare(`${anoB}${mesB}`);
}

const NOME_MES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function competenciaLegivel(comp) {
  const [mes, ano] = comp.split("/");
  return `${NOME_MES[Number(mes)] || mes}/${ano}`;
}

/** Lista as competências (mês/ano) presentes no arquivo, sem aplicar
 *  nenhum filtro — usada para popular o seletor, para que as opções não
 *  mudem conforme o filtro de competência já selecionado. */
export function listarCompetencias(linhas, map) {
  const set = new Set();
  for (const l of linhas) {
    const mes = map.data ? String(l[map.data] ?? "").trim() : "";
    const comp = competenciaDaLinha(mes, map.ano ? l[map.ano] : "");
    if (comp) set.add(comp);
  }
  return [...set].sort(compararCompetencia);
}

/** Agrega as linhas do razão por conta, respeitando filtros de dia, centro
 *  de custo e competência (mês/ano). Mantém uma amostra ampla do histórico
 *  de cada conta (até 20 mil caracteres) para que a classificação por
 *  padrão de texto tenha material suficiente mesmo em contas com milhares
 *  de lançamentos. */
export function agregarPorConta(linhas, map, filtroMes, filtroCC, filtroCompetencia = "todas") {
  const acc = {};
  let tDeb = 0, tCre = 0;
  let debSemConta = 0, creSemConta = 0;
  const setMeses = new Set(), setCC = new Set();
  const LIMITE_HISTORICO = 20000;
  const porCompetencia = {}; // competencia -> { contas: { conta: {deb,cre} } }

  for (const l of linhas) {
    const mes = map.data ? String(l[map.data] ?? "").trim() : "";
    const cc = map.cc ? String(l[map.cc] ?? "").trim() : "";
    const comp = competenciaDaLinha(mes, map.ano ? l[map.ano] : "");
    if (mes) setMeses.add(mes);
    if (cc) setCC.add(cc);
    if (filtroMes !== "todos" && mes !== filtroMes) continue;
    if (filtroCC !== "todos" && cc !== filtroCC) continue;
    if (filtroCompetencia !== "todas" && comp !== filtroCompetencia) continue;

    const vd = numeroBR(l[map.valorD]);
    const vc = numeroBR(l[map.valorC]);
    tDeb += vd; tCre += vc;
    const cd = String(l[map.contaD] ?? "").trim();
    const cc2 = String(l[map.contaC] ?? "").trim();
    const h = map.hist ? String(l[map.hist] ?? "") : "";

    // Valor lançado sem conta do lado correspondente: entra no total de
    // débito/crédito mas não em conta nenhuma. É uma das origens de
    // "diferença que não aparece em conta nenhuma" no teste de partidas
    // dobradas — então em vez de sumir, é contado e reportado.
    if (!cd && vd) debSemConta += vd;
    if (!cc2 && vc) creSemConta += vc;

    if (cd && vd) {
      acc[cd] = acc[cd] || { conta: cd, deb: 0, cre: 0, n: 0, historico: "" };
      acc[cd].deb += vd; acc[cd].n++;
      if (acc[cd].historico.length < LIMITE_HISTORICO) acc[cd].historico += " " + h;
      if (comp) {
        porCompetencia[comp] = porCompetencia[comp] || {};
        porCompetencia[comp][cd] = porCompetencia[comp][cd] || { deb: 0, cre: 0 };
        porCompetencia[comp][cd].deb += vd;
      }
    }
    if (cc2 && vc) {
      acc[cc2] = acc[cc2] || { conta: cc2, deb: 0, cre: 0, n: 0, historico: "" };
      acc[cc2].cre += vc; acc[cc2].n++;
      if (acc[cc2].historico.length < LIMITE_HISTORICO) acc[cc2].historico += " " + h;
      if (comp) {
        porCompetencia[comp] = porCompetencia[comp] || {};
        porCompetencia[comp][cc2] = porCompetencia[comp][cc2] || { deb: 0, cre: 0 };
        porCompetencia[comp][cc2].cre += vc;
      }
    }
  }

  const contas = Object.values(acc).map((c) => ({ ...c, saldo: c.cre - c.deb }));
  contas.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  const competencias = Object.keys(porCompetencia).sort(compararCompetencia);
  const contasPorCompetencia = {};
  competencias.forEach((comp) => {
    contasPorCompetencia[comp] = Object.entries(porCompetencia[comp]).map(([conta, v]) => ({
      conta, deb: v.deb, cre: v.cre, saldo: v.cre - v.deb,
      historico: acc[conta] ? acc[conta].historico : "",
    }));
  });

  return {
    contas, tDeb, tCre, nLinhas: linhas.length,
    meses: [...setMeses], ccs: [...setCC].sort(),
    competencias, contasPorCompetencia,
    debSemConta, creSemConta,
  };
}

/** Importa um CSV de duas colunas (código;descrição) como plano de contas. */
export function parsearPlanoDeContas(dataRows) {
  const nomes = {};
  dataRows.forEach((l) => {
    if (!l || l.length < 2) return;
    const cod = String(l[0]).replace(/\D/g, "");
    const desc = String(l[1]).trim();
    if (cod && desc) nomes[cod] = desc;
  });
  return nomes;
}
