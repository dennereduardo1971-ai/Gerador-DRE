import { useMemo } from "react";
import { brl, pct } from "../lib/parse.js";
import { GRUPOS } from "../lib/grupos.js";
import { indicesPatrimoniais, margens, ranquearDespesas, serieMensal } from "../lib/indicadores.js";
import { TorresPatrimoniais } from "./TorresPatrimoniais.jsx";
import { Cascata, Evolucao, RankingDespesas } from "./Graficos.jsx";

/* Painel — a leitura rápida do período.
 *
 * As demais telas respondem "os números estão certos?". Esta responde
 * "e daí?". São públicos diferentes: quem confere abre a DRE e o
 * balancete; quem decide abre isto.
 *
 * Cada bloco depende de uma fonte e só aparece se ela existir. Margens
 * precisam do razão; índices patrimoniais precisam do balancete. Onde
 * falta, o painel diz o que carregar — nunca mostra zero no lugar do
 * dado ausente, porque um índice de liquidez em 0,00 parece diagnóstico
 * e é só falta de arquivo.
 */

/** Faixa de referência para os índices onde a contabilidade tem uma.
 *  Deliberadamente comedido: só os índices com convenção amplamente
 *  aceita ganham veredito. Rotular margem como "boa" ou "ruim" sem saber
 *  o setor seria inventar um parâmetro. */
function veredito(chave, v) {
  if (v == null) return null;
  if (chave === "liquidezCorrente") {
    if (v >= 1.5) return { t: "ok", txt: "folga confortável" };
    if (v >= 1) return { t: "neutro", txt: "cobre o curto prazo" };
    return { t: "bad", txt: "não cobre o curto prazo" };
  }
  if (chave === "endividamento") {
    if (v <= 0.5) return { t: "ok", txt: "maioria do ativo é capital próprio" };
    if (v <= 0.7) return { t: "neutro", txt: "dependência relevante de terceiros" };
    return { t: "bad", txt: "alta dependência de capital de terceiros" };
  }
  return null;
}

function Indicador({ k, v, sub, tom, formato = "moeda" }) {
  const texto =
    v == null ? "—" : formato === "pct" ? pct(v) : formato === "vezes" ? v.toFixed(2).replace(".", ",") : brl(v);
  return (
    <div className="ind" data-tone={tom || ""}>
      <div className="ind-k">{k}</div>
      <div className={"ind-v " + (typeof v === "number" && v < 0 ? "neg" : "")}>{texto}</div>
      {sub && <div className="ind-sub">{sub}</div>}
    </div>
  );
}

export function Painel({ dre, temDados, balancete, dresPorCompetencia = [], empresa, periodo }) {
  const m = useMemo(() => (temDados ? margens(dre) : null), [dre, temDados]);
  const ip = useMemo(() => indicesPatrimoniais(balancete), [balancete]);
  const serie = useMemo(() => serieMensal(dresPorCompetencia), [dresPorCompetencia]);
  const despesas = useMemo(() => (temDados ? ranquearDespesas(dre, GRUPOS) : []), [dre, temDados]);

  if (!temDados && !balancete) {
    return (
      <div className="empty">
        <b>O painel precisa de pelo menos uma fonte</b>
        Importe o razão para ver margens e a cascata do resultado, ou carregue o balancete de
        verificação para ver a estrutura patrimonial e os índices de liquidez. Com os dois, o
        painel fica completo e o app ainda confere um contra o outro.
      </div>
    );
  }

  const lc = ip && veredito("liquidezCorrente", ip.liquidezCorrente);
  const en = ip && veredito("endividamento", ip.endividamento);

  return (
    <>
      <div className="painel-cab">
        <div>
          <span className="rotulo">Painel</span>
          <h2>{empresa || "Resultado do período"}</h2>
        </div>
        {periodo && <span className="painel-periodo">{periodo}</span>}
      </div>

      {temDados && (
        <div className="inds">
          <Indicador k="Receita líquida" v={dre.receitaLiq} />
          <Indicador k="Lucro líquido" v={dre.liquido} tom={dre.liquido >= 0 ? "ok" : "bad"} />
          <Indicador k="Margem líquida" v={m.margemLiquida} formato="pct"
            sub="sobre a receita líquida" />
          <Indicador k="Margem bruta" v={m.margemBruta} formato="pct" />
          <Indicador k="EBITDA aproximado" v={m.ebitda}
            sub="resultado operacional sem o financeiro, com a depreciação de volta" />
          <Indicador k="Peso das deduções" v={m.pesoDeducoes} formato="pct"
            sub="sobre a receita bruta" />
        </div>
      )}

      {ip && (
        <div className="inds">
          <Indicador k="Liquidez corrente" v={ip.liquidezCorrente} formato="vezes"
            tom={lc?.t} sub={lc?.txt} />
          <Indicador k="Liquidez geral" v={ip.liquidezGeral} formato="vezes"
            sub="todo o ativo sobre todo o capital de terceiros" />
          <Indicador k="Endividamento" v={ip.endividamento} formato="pct"
            tom={en?.t} sub={en?.txt} />
          <Indicador k="Capital circulante líquido" v={ip.capitalCirculanteLiquido}
            tom={ip.capitalCirculanteLiquido >= 0 ? "ok" : "bad"}
            sub="ativo circulante menos passivo circulante" />
          <Indicador k="Imobilização do PL" v={ip.imobilizacaoPL} formato="pct"
            sub="quanto do capital próprio está no ativo não circulante" />
          <Indicador k="Patrimônio líquido" v={ip.estrutura.patrimonioLiquido} />
        </div>
      )}

      {ip && <TorresPatrimoniais estrutura={ip.estrutura} />}

      {temDados && (
        <div className="card">
          <h2>Cascata do resultado</h2>
          <Cascata dre={dre} />
        </div>
      )}

      {serie.length >= 2 && (
        <div className="card">
          <h2>Evolução mensal</h2>
          <Evolucao serie={serie} />
        </div>
      )}

      {despesas.length > 0 && (
        <div className="card">
          <h2>Composição das despesas</h2>
          <RankingDespesas itens={despesas} base={dre.receitaLiq} />
        </div>
      )}

      {(!temDados || !balancete) && (
        <div className="warn">
          {!balancete
            ? "Carregue o balancete de verificação na etapa 1 para o painel mostrar também a estrutura patrimonial e os índices de liquidez e endividamento."
            : "Importe o razão para o painel mostrar também as margens, a cascata do resultado e a composição das despesas."}
        </div>
      )}
    </>
  );
}
