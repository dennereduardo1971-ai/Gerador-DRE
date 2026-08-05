import { Fragment } from "react";
import { brl, competenciaLegivel } from "../lib/parse.js";
import { Linha, Secao, Detalhe, Cabecalho } from "./LinhaDRE.jsx";

/** Monta a lista de linhas da demonstração como dados, não como JSX
 *  solto. Isso existe por causa do canal: cada linha precisa saber onde
 *  o saldo corrente estava antes dela e onde ficou depois, e isso só dá
 *  pra calcular percorrendo a demonstração em ordem.
 *
 *  Os rótulos, os sinais e as condições de exibição são exatamente os
 *  mesmos de antes — só mudou o formato. */
function montarLinhas(dre) {
  const b = dre.bal;
  const itens = [
    { t: "secao", lbl: "Receita Operacional Bruta" },
    { t: "l", lbl: "( + ) Receita Bruta com Mensalidades", val: b.REC_MENSALIDADES.total, id: "REC_MENSALIDADES" },
    { t: "l", lbl: "( + ) Receita com Taxas", val: b.REC_TAXAS.total, id: "REC_TAXAS" },
    { t: "sub", lbl: "( = ) Receita Bruta de Serviços", val: dre.receitaBruta },

    { t: "secao", lbl: "Deduções à Receita Operacional" },
    { t: "l", lbl: "( – ) Bolsas / Resoluções", val: -b.DED_BOLSAS.total, id: "DED_BOLSAS" },
    { t: "l", lbl: "( – ) Prouni", val: -b.DED_PROUNI.total, id: "DED_PROUNI" },
    { t: "l", lbl: "( – ) Mensalidades Devolvidas", val: -b.DED_DEVOLUCOES.total, id: "DED_DEVOLUCOES" },
    { t: "l", lbl: "( – ) Descontos / Cancelamentos", val: -b.DED_DESCONTOS.total, id: "DED_DESCONTOS" },
    { t: "l", lbl: "( – ) PIS / COFINS / ISS", val: -b.DED_IMPOSTOS.total, id: "DED_IMPOSTOS" },
    { t: "sub", lbl: "Receita Operacional Líquida", val: dre.receitaLiq },
  ];

  if (b.CUSTOS.contas.length > 0) {
    itens.push({ t: "l", lbl: "( – ) Custos dos Serviços", val: -b.CUSTOS.total, id: "CUSTOS" });
    itens.push({ t: "sub", lbl: "( = ) Resultado Operacional Bruto", val: dre.resultadoOperBruto });
  }

  itens.push({ t: "secao", lbl: "Despesas Operacionais" });
  itens.push({ t: "l", lbl: "Despesas com Pessoal (Fopag)", val: -b.DESP_FOPAG.total, id: "DESP_FOPAG" });
  itens.push({ t: "l", lbl: "Despesas Administrativas", val: -b.DESP_ADM.total, id: "DESP_ADM" });
  if (b.DEPRECIACAO.contas.length > 0)
    itens.push({ t: "l", lbl: "Depreciação / Amortização", val: -b.DEPRECIACAO.total, id: "DEPRECIACAO" });
  if (b.PROVISOES_CONTINGENCIAS.contas.length > 0)
    itens.push({ t: "l", lbl: "Provisões / Reversões Contingências", val: -b.PROVISOES_CONTINGENCIAS.total, id: "PROVISOES_CONTINGENCIAS" });
  if (b.PROVISOES_PCLD.contas.length > 0)
    itens.push({ t: "l", lbl: "Provisões / Reversões PCLD", val: -b.PROVISOES_PCLD.total, id: "PROVISOES_PCLD" });

  itens.push({ t: "secao", lbl: "Receita / Despesas Financeiras" });
  itens.push({ t: "l", lbl: "( + ) Receitas Financeiras", val: b.REC_FIN.total, id: "REC_FIN" });
  itens.push({ t: "l", lbl: "( – ) Despesas Financeiras", val: -b.DESP_FIN.total, id: "DESP_FIN" });
  itens.push({ t: "sub", lbl: "Resultado Operacional", val: dre.resultadoOper });

  if (b.OUTRAS_REC.contas.length > 0 || b.OUTRAS_DESP.contas.length > 0) {
    itens.push({ t: "secao", lbl: "Receitas / Despesas Não Operacionais" });
    itens.push({ t: "l", lbl: "( + ) Receitas Não Operacionais", val: b.OUTRAS_REC.total, id: "OUTRAS_REC" });
    itens.push({ t: "l", lbl: "( – ) Despesas Não Operacionais", val: -b.OUTRAS_DESP.total, id: "OUTRAS_DESP" });
  }

  itens.push({ t: "sub", lbl: "Lucro Antes do Imposto de Renda e Cont. Social", val: dre.antesIR });
  itens.push({ t: "l", lbl: "( – ) IRPJ e CSLL", val: -b.IRPJ_CSLL.total, id: "IRPJ_CSLL" });
  itens.push({ t: "final", lbl: "Lucro Líquido do Exercício", val: dre.liquido });

  // A cascata: cada linha comum move o saldo corrente; cada subtotal
  // reancora no valor autoritativo vindo de montarDRE, para o desenho
  // nunca derivar de uma soma própria.
  let acumulado = 0;
  const pontos = [0];
  for (const it of itens) {
    if (it.t === "l") {
      it.inicio = acumulado;
      acumulado += it.val;
      it.fim = acumulado;
      pontos.push(acumulado);
    } else if (it.t === "sub" || it.t === "final") {
      acumulado = it.val;
      it.nivel = it.val;
      pontos.push(it.val);
    }
  }

  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const escala = max > min ? { min, max } : null;

  return { itens, escala };
}

export function EtapaDRE({
  dre, empresa, cnpj, filtroMes, meses, filtroCC, filtroCompetencia, tDeb, tCre, dif,
  nomes, detalhado, onToggleDetalhado, onBaixarCSV, contasIgnoradas, onSalvarHistorico,
}) {
  const base = dre.receitaLiq || 1;
  const { itens, escala } = montarLinhas(dre);

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

        <Cabecalho />

        {itens.map((it, i) => {
          if (it.t === "secao") return <Secao key={`s${i}`} nome={it.lbl} />;
          return (
            <Fragment key={`${it.t}${i}`}>
              <Linha
                lbl={it.lbl}
                val={it.val}
                tipo={it.t === "l" ? "" : it.t}
                base={base}
                escala={escala}
                inicio={it.inicio}
                fim={it.fim}
                nivel={it.nivel}
              />
              {it.id && <Detalhe dre={dre} id={it.id} nomes={nomes} base={base} mostrar={detalhado} />}
            </Fragment>
          );
        })}

        <div className="foot">
          A barra de cada linha mostra quanto da receita ainda restava naquele ponto da
          demonstração — verde soma, vermelho subtrai, índigo é o saldo acumulado.<br />
          Análise vertical calculada sobre a receita operacional líquida.<br />
          {contasIgnoradas} contas de resultado foram deixadas fora da demonstração.<br />
          Débitos {brl(tDeb)} · créditos {brl(tCre)} ·{" "}
          {Math.abs(dif) < 0.01 ? "razão fechado" : `diferença de ${brl(Math.abs(dif))}`}.
        </div>
      </div>
    </>
  );
}
