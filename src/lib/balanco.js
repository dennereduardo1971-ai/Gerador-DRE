/** Monta um Balanço Patrimonial simplificado a partir das contas 1 (ativo)
 *  e 2 (passivo + patrimônio líquido) do razão.
 *
 *  Importante: isso reflete apenas a MOVIMENTAÇÃO das contas dentro do
 *  arquivo importado. Só representa o saldo patrimonial real se o razão
 *  contiver o saldo de abertura de cada conta (lançamento inicial do
 *  período) — se o arquivo tiver só os lançamentos de um mês, por exemplo,
 *  os totais aqui são a variação daquele mês, não o saldo acumulado da
 *  empresa. O app não tem como saber isso sozinho; por isso mostra o aviso
 *  na tela em vez de fingir precisão que não tem. */
export function montarBalanco(contas) {
  const ativo = contas.filter((c) => c.conta[0] === "1");
  const passivo = contas.filter((c) => c.conta[0] === "2");

  const somaAtivo = ativo.reduce((s, c) => s + (c.deb - c.cre), 0); // natureza devedora
  const somaPassivo = passivo.reduce((s, c) => s + (c.cre - c.deb), 0); // natureza credora

  const ordenar = (lista, saldoFn) =>
    [...lista].map((c) => ({ ...c, saldoBalanco: saldoFn(c) })).sort((a, b) => Math.abs(b.saldoBalanco) - Math.abs(a.saldoBalanco));

  return {
    ativo: ordenar(ativo, (c) => c.deb - c.cre),
    passivo: ordenar(passivo, (c) => c.cre - c.deb),
    somaAtivo, somaPassivo,
    diferenca: somaAtivo - somaPassivo,
    temDados: ativo.length > 0 || passivo.length > 0,
  };
}
