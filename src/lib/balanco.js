import { aplicarAbertura } from "./abertura.js";

/** Monta o Balanço Patrimonial a partir das contas 1 (ativo) e 2 (passivo
 *  + patrimônio líquido).
 *
 *  Sem balancete de abertura, isso reflete apenas a MOVIMENTAÇÃO das
 *  contas dentro do arquivo importado: se o razão tem só um mês, os
 *  totais são a variação daquele mês, não o saldo acumulado da empresa.
 *  O razão sozinho não carrega essa informação, e o app avisa na tela em
 *  vez de fingir precisão que não tem.
 *
 *  COM balancete (`saldosAbertura`), passa a ser abertura + movimentação
 *  = saldo final, que é o Balanço de verdade. `comAbertura` diz em qual
 *  dos dois modos o resultado está, para a tela não mostrar o aviso
 *  errado. */
export function montarBalanco(contas, saldosAbertura = null) {
  const comAbertura = !!saldosAbertura && Object.keys(saldosAbertura).length > 0;
  const base = comAbertura ? aplicarAbertura(contas, saldosAbertura) : contas;

  const ativo = base.filter((c) => c.conta[0] === "1");
  const passivo = base.filter((c) => c.conta[0] === "2");

  // Natureza devedora para o ativo, credora para o passivo. Com abertura,
  // o saldo é o final (abertura + movimento); sem ela, só o movimento.
  const saldoAtivo = (c) => (comAbertura ? c.saldoFinal : c.deb - c.cre);
  const saldoPassivo = (c) => -(comAbertura ? c.saldoFinal : c.deb - c.cre);

  const somaAtivo = ativo.reduce((s, c) => s + saldoAtivo(c), 0);
  const somaPassivo = passivo.reduce((s, c) => s + saldoPassivo(c), 0);

  const ordenar = (lista, saldoFn) =>
    [...lista].map((c) => ({ ...c, saldoBalanco: saldoFn(c) }))
      .sort((a, b) => Math.abs(b.saldoBalanco) - Math.abs(a.saldoBalanco));

  return {
    ativo: ordenar(ativo, saldoAtivo),
    passivo: ordenar(passivo, saldoPassivo),
    somaAtivo, somaPassivo,
    diferenca: somaAtivo - somaPassivo,
    temDados: ativo.length > 0 || passivo.length > 0,
    comAbertura,
  };
}
