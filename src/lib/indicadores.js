/* Indicadores financeiros — a leitura que um gestor faz depois de olhar
 * a DRE, calculada a partir do que o app já tem.
 *
 * Duas fontes independentes: as margens saem da DRE (razão importado), os
 * índices patrimoniais saem do balancete. Cada bloco existe só se sua
 * fonte existir, e a tela diz qual está faltando em vez de mostrar zero —
 * um índice de liquidez em 0,00 por falta de dado é pior que índice
 * nenhum, porque parece um diagnóstico.
 *
 * Todo índice devolve `null` quando o denominador é zero. Não existe
 * "margem de 0%" sobre receita zero: existe margem indefinida.
 */

const razao = (a, b) => (Math.abs(b) < 0.005 ? null : a / b);

/** Classifica os grupos de nível 2 do balancete em circulante, não
 *  circulante e patrimônio líquido.
 *
 *  Pelo NOME, não pelo código: "1.2" e "1.3" são ambos Ativo Não
 *  Circulante no plano do IESB, e outro plano usaria outra numeração. O
 *  nome do grupo é o que a contabilidade padroniza. */
function classificarGrupo(descricao) {
  const d = String(descricao || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/PATRIMONIO|LIQUIDO SOCIAL|CAPITAL SOCIAL/.test(d)) return "pl";
  if (/NAO CIRCULANTE|LONGO PRAZO|PERMANENTE|REALIZAVEL A LONGO/.test(d)) return "naoCirculante";
  if (/CIRCULANTE/.test(d)) return "circulante";
  return "outro";
}

/** Estrutura patrimonial: os blocos que formam as duas colunas do
 *  Balanço, já somados e prontos para desenhar. */
export function estruturaPatrimonial(bal) {
  if (!bal) return null;
  const lado = (digito) => {
    const raiz = bal.porCodigo.get(digito);
    if (!raiz) return [];
    return raiz.filhos.map((f) => bal.porCodigo.get(f)).filter(Boolean);
  };

  const somar = (grupos, tipo) =>
    grupos.filter((g) => classificarGrupo(g.descricao) === tipo)
      .reduce((s, g) => s + Math.abs(g.atual), 0);

  const gruposAtivo = lado("1");
  const gruposPassivo = lado("2");

  const ativoCirculante = somar(gruposAtivo, "circulante");
  const ativoNaoCirculante = somar(gruposAtivo, "naoCirculante") + somar(gruposAtivo, "outro");
  const passivoCirculante = somar(gruposPassivo, "circulante");
  const passivoNaoCirculante = somar(gruposPassivo, "naoCirculante") + somar(gruposPassivo, "outro");
  const patrimonioLiquido = somar(gruposPassivo, "pl");

  const r = bal.resumo;
  return {
    ativoCirculante,
    ativoNaoCirculante,
    totalAtivo: r.totalAtivo,
    passivoCirculante,
    passivoNaoCirculante,
    patrimonioLiquido,
    resultadoExercicio: r.resultadoExercicio,
    totalPassivo: r.totalPassivo,
  };
}

/** Índices patrimoniais. Só existem com balancete carregado. */
export function indicesPatrimoniais(bal) {
  const e = estruturaPatrimonial(bal);
  if (!e) return null;
  const capitalTerceiros = e.passivoCirculante + e.passivoNaoCirculante;
  return {
    liquidezCorrente: razao(e.ativoCirculante, e.passivoCirculante),
    liquidezGeral: razao(e.ativoCirculante + e.ativoNaoCirculante, capitalTerceiros),
    endividamento: razao(capitalTerceiros, e.totalAtivo),
    imobilizacaoPL: razao(e.ativoNaoCirculante, e.patrimonioLiquido),
    capitalCirculanteLiquido: e.ativoCirculante - e.passivoCirculante,
    estrutura: e,
  };
}

/** Margens da DRE. Só existem com razão importado. */
export function margens(dre) {
  if (!dre) return null;
  const rl = dre.receitaLiq;
  return {
    margemBruta: razao(dre.resultadoOperBruto, rl),
    margemOperacional: razao(dre.resultadoOper, rl),
    margemLiquida: razao(dre.liquido, rl),
    pesoDeducoes: razao(dre.deducoes, dre.receitaBruta),
    pesoDespOper: razao(dre.despOper, rl),
    // EBITDA aproximado: resultado operacional antes do financeiro, com a
    // depreciação de volta. "Aproximado" e não "EBITDA" porque o app não
    // tem como saber se há amortização fora da linha de depreciação.
    ebitda: dre.resultadoOper - dre.resultadoFin + Math.abs(dre.bal?.DEPRECIACAO?.total ?? 0),
  };
}

/** Série mensal para o gráfico de evolução, na ordem cronológica que
 *  `dresPorCompetencia` já garante. */
export function serieMensal(dresPorCompetencia = []) {
  return dresPorCompetencia.map((d) => ({
    competencia: d.competencia,
    receitaLiq: d.dre.receitaLiq,
    despesas: Math.abs(d.dre.despOper) + Math.abs(d.dre.custos ?? 0),
    liquido: d.dre.liquido,
    margem: razao(d.dre.liquido, d.dre.receitaLiq),
  }));
}

/** As linhas de despesa da DRE, da maior para a menor, para o ranking.
 *  Devolve valores POSITIVOS: aqui a pergunta é tamanho, não sinal. */
export function ranquearDespesas(dre, grupos) {
  if (!dre) return [];
  const alvos = new Set([
    "CUSTOS", "DESP_FOPAG", "DESP_ADM", "DEPRECIACAO",
    "PROVISOES_CONTINGENCIAS", "PROVISOES_PCLD", "DESP_FIN", "OUTRAS_DESP", "IRPJ_CSLL",
  ]);
  return grupos
    .filter((g) => alvos.has(g.id))
    .map((g) => ({ id: g.id, nome: g.nome, valor: Math.abs(dre.bal[g.id]?.total ?? 0) }))
    .filter((g) => g.valor > 0.005)
    .sort((a, b) => b.valor - a.valor);
}
