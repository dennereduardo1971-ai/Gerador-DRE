/* Balancete de abertura: os saldos de cada conta no início do período.
 *
 * O Balanço do app sempre trouxe um aviso honesto na tela — que refletia
 * só a MOVIMENTAÇÃO do arquivo importado, não o saldo patrimonial real.
 * Isso não era um defeito de cálculo: o razão de um mês simplesmente não
 * carrega essa informação, e o app preferiu avisar a fingir precisão.
 *
 * Este módulo resolve a limitação pela raiz, com o dado que faltava. Com
 * o balancete carregado, o Balanço passa a ser saldo de abertura +
 * movimentação do período = saldo final — que é o Balanço de verdade.
 *
 * O formato é o mais simples que qualquer sistema contábil exporta: duas
 * colunas, código e saldo. Devedor positivo, credor negativo (ou colunas
 * separadas de débito e crédito, também aceitas).
 */

import { numeroBR } from "./parse.js";

/** Lê linhas cruas (matriz de células) de um balancete de abertura.
 *
 *  Aceita duas formas: [código, saldo] ou [código, débito, crédito]. A
 *  segunda é distinguida por ter três colunas numéricas úteis — e nesse
 *  caso o saldo é débito − crédito, natureza devedora, que é como o
 *  restante do app trabalha.
 *
 *  Devolve { saldos, lidas, ignoradas } em vez de lançar: isto responde a
 *  um arquivo escolhido pelo usuário, que pode ser qualquer coisa. */
export function parsearAbertura(linhas) {
  const saldos = {};
  let lidas = 0, ignoradas = 0;

  for (const l of linhas) {
    if (!Array.isArray(l) || l.length < 2) { ignoradas++; continue; }
    const codigo = String(l[0] ?? "").trim();
    // Código de conta é numérico; cabeçalho e linhas de título não são.
    if (!codigo || !/^\d+$/.test(codigo)) { ignoradas++; continue; }

    let saldo;
    if (l.length >= 3 && String(l[2] ?? "").trim() !== "") {
      saldo = numeroBR(l[1]) - numeroBR(l[2]); // débito − crédito
    } else {
      saldo = numeroBR(l[1]);
    }
    if (!Number.isFinite(saldo)) { ignoradas++; continue; }

    // Mesmo código repetido soma, em vez de a última linha vencer: alguns
    // sistemas quebram a mesma conta em mais de uma linha por centro de
    // custo, e sobrescrever perderia dinheiro silenciosamente.
    saldos[codigo] = (saldos[codigo] || 0) + saldo;
    lidas++;
  }

  return { saldos, lidas, ignoradas };
}

/** Junta o saldo de abertura à movimentação do período.
 *
 *  Contas que só existem no balancete (sem movimento no período) entram
 *  com movimentação zero — senão sumiriam do Balanço, que é justamente o
 *  erro que o balancete veio corrigir. */
export function aplicarAbertura(contas, saldosAbertura = {}) {
  const porConta = new Map(contas.map((c) => [c.conta, c]));
  const resultado = contas.map((c) => {
    const abertura = saldosAbertura[c.conta] || 0;
    return { ...c, abertura, movimento: c.deb - c.cre, saldoFinal: abertura + (c.deb - c.cre) };
  });

  for (const [codigo, abertura] of Object.entries(saldosAbertura)) {
    if (porConta.has(codigo)) continue;
    resultado.push({
      conta: codigo, deb: 0, cre: 0, n: 0, saldo: 0, historico: "",
      abertura, movimento: 0, saldoFinal: abertura,
    });
  }
  return resultado;
}
