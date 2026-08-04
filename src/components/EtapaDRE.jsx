import { brl, competenciaLegivel } from "../lib/parse.js";
import { Linha, Secao, Detalhe } from "./LinhaDRE.jsx";

export function EtapaDRE({
  dre, empresa, cnpj, filtroMes, meses, filtroCC, filtroCompetencia, tDeb, tCre, dif,
  nomes, detalhado, onToggleDetalhado, onBaixarCSV, contasIgnoradas, onSalvarHistorico,
}) {
  const base = dre.receitaLiq || 1;
  const D = (id) => <Detalhe dre={dre} id={id} nomes={nomes} base={base} mostrar={detalhado} />;
  const L = (props) => <Linha {...props} base={base} />;

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={onBaixarCSV}>Baixar CSV</button>
        <button className="btn ghost" onClick={() => window.print()}>Imprimir</button>
        <button className="btn ghost" onClick={onToggleDetalhado}>
          {detalhado ? "Ocultar contas" : "Mostrar contas"}
        </button>
        <button className="btn ghost" onClick={onSalvarHistorico}>Salvar no histórico</button>
      </div>
      <div className="dre">
        <div className="dre-head">
          <h3>{empresa || "Demonstração do Resultado do Exercício"}</h3>
          <p>
            {empresa ? "Demonstração do Resultado Intermediária" : ""}
            {cnpj ? ` · CNPJ ${cnpj}` : ""}
            {" · "}
            {filtroCompetencia && filtroCompetencia !== "todas"
              ? competenciaLegivel(filtroCompetencia)
              : (filtroMes === "todos" ? meses.join(", ") || "período do arquivo" : filtroMes)}
            {filtroCC !== "todos" ? ` · centro de custo ${filtroCC}` : ""} · valores em R$
          </p>
        </div>

        <Secao nome="Receita Operacional Bruta" />
        <L lbl="( + ) Receita Bruta com Mensalidades" val={dre.bal.REC_MENSALIDADES.total} />
        {D("REC_MENSALIDADES")}
        <L lbl="( + ) Receita com Taxas" val={dre.bal.REC_TAXAS.total} />
        {D("REC_TAXAS")}
        <L lbl="( = ) Receita Bruta de Serviços" val={dre.receitaBruta} tipo="sub" />

        <Secao nome="Deduções à Receita Operacional" />
        <L lbl="( – ) Bolsas / Resoluções" val={dre.bal.DED_BOLSAS.total} sinal="-" />
        {D("DED_BOLSAS")}
        <L lbl="( – ) Prouni" val={dre.bal.DED_PROUNI.total} sinal="-" />
        {D("DED_PROUNI")}
        <L lbl="( – ) Mensalidades Devolvidas" val={dre.bal.DED_DEVOLUCOES.total} sinal="-" />
        {D("DED_DEVOLUCOES")}
        <L lbl="( – ) Descontos / Cancelamentos" val={dre.bal.DED_DESCONTOS.total} sinal="-" />
        {D("DED_DESCONTOS")}
        <L lbl="( – ) PIS / COFINS / ISS" val={dre.bal.DED_IMPOSTOS.total} sinal="-" />
        {D("DED_IMPOSTOS")}
        <L lbl="Receita Operacional Líquida" val={dre.receitaLiq} tipo="sub" />

        {dre.bal.CUSTOS.total > 0 && (
          <>
            <L lbl="( – ) Custos dos Serviços" val={dre.bal.CUSTOS.total} sinal="-" />
            {D("CUSTOS")}
            <L lbl="( = ) Resultado Operacional Bruto" val={dre.resultadoOperBruto} tipo="sub" />
          </>
        )}

        <Secao nome="Despesas Operacionais" />
        <L lbl="Despesas com Pessoal (Fopag)" val={dre.bal.DESP_FOPAG.total} sinal="-" />
        {D("DESP_FOPAG")}
        <L lbl="Despesas Administrativas" val={dre.bal.DESP_ADM.total} sinal="-" />
        {D("DESP_ADM")}
        {dre.bal.DEPRECIACAO.total > 0 && (<><L lbl="Depreciação / Amortização" val={dre.bal.DEPRECIACAO.total} sinal="-" />{D("DEPRECIACAO")}</>)}
        {dre.bal.PROVISOES.total > 0 && (<><L lbl="Provisões / Reversões" val={dre.bal.PROVISOES.total} sinal="-" />{D("PROVISOES")}</>)}

        <Secao nome="Receita / Despesas Financeiras" />
        <L lbl="( + ) Receitas Financeiras" val={dre.bal.REC_FIN.total} />
        {D("REC_FIN")}
        <L lbl="( – ) Despesas Financeiras" val={dre.bal.DESP_FIN.total} sinal="-" />
        {D("DESP_FIN")}
        <L lbl="Resultado Operacional" val={dre.resultadoOper} tipo="sub" />

        {(dre.bal.OUTRAS_REC.total > 0 || dre.bal.OUTRAS_DESP.total > 0) && (
          <>
            <Secao nome="Receitas / Despesas Não Operacionais" />
            <L lbl="( + ) Receitas Não Operacionais" val={dre.bal.OUTRAS_REC.total} />
            {D("OUTRAS_REC")}
            <L lbl="( – ) Despesas Não Operacionais" val={dre.bal.OUTRAS_DESP.total} sinal="-" />
            {D("OUTRAS_DESP")}
          </>
        )}

        <L lbl="Lucro Antes do Imposto de Renda e Cont. Social" val={dre.antesIR} tipo="sub" />
        <L lbl="( – ) IRPJ e CSLL" val={dre.bal.IRPJ_CSLL.total} sinal="-" />
        {D("IRPJ_CSLL")}
        <L lbl="Lucro Líquido do Exercício" val={dre.liquido} tipo="final" />

        <div className="foot">
          Análise vertical calculada sobre a receita operacional líquida.<br />
          {contasIgnoradas} contas de resultado foram deixadas fora da demonstração.<br />
          Débitos {brl(tDeb)} · créditos {brl(tCre)} ·{" "}
          {Math.abs(dif) < 0.01 ? "razão fechado" : `diferença de ${brl(Math.abs(dif))}`}.
        </div>
      </div>
    </>
  );
}
