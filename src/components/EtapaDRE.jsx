import { Fragment } from "react";
import { brl, competenciaLegivel } from "../lib/parse.js";
import { Linha, Secao, Detalhe, Cabecalho } from "./LinhaDRE.jsx";
import { montarLinhas } from "../lib/linhasDRE.js";

export function EtapaDRE({
  dre, empresa, cnpj, filtroMes, meses, filtroCC, filtroCompetencia, tDeb, tCre, dif,
  nomes, detalhado, onToggleDetalhado, onBaixarCSV, prova, onSalvarHistorico,
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
          if (it.t === "secao") return <Secao key={`s${i}`} nome={it.lbl} val={it.val} base={base} />;
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

        {/* Prova de integridade: em R$, não em contagem de contas. "12
            contas ficaram de fora" não diz nada sozinho — podem ser R$ 3,00
            ou R$ 3 milhões. É esta linha que permite assinar a DRE sabendo
            que nada se perdeu no caminho entre o razão e a demonstração. */}
        <div className="prova" data-fecha={prova.fecha ? "1" : "0"}>
          <b>Prova de integridade.</b>{" "}
          Das {prova.nContas} contas de resultado, {brl(prova.classificado)} entraram na
          demonstração
          {prova.nIgnoradas > 0 ? (
            <> e {brl(prova.ignorado)} ficaram de fora ({prova.nIgnoradas}{" "}
            {prova.nIgnoradas === 1 ? "conta" : "contas"} marcadas como ignorar)</>
          ) : (
            <> e nada ficou de fora</>
          )}
          . Somando os dois: {brl(prova.total)}, que é exatamente o movimento das contas de
          resultado do razão
          {prova.fecha ? "." : ` — com diferença de ${brl(Math.abs(prova.diferenca))}, que precisa ser investigada antes de assinar.`}
        </div>

        <div className="foot">
          A barra de cada linha mostra quanto da receita ainda restava naquele ponto da
          demonstração — verde soma, vermelho subtrai, índigo é o saldo acumulado.<br />
          Análise vertical calculada sobre a receita operacional líquida.<br />
          Débitos {brl(tDeb)} · créditos {brl(tCre)} ·{" "}
          {Math.abs(dif) < 0.01 ? "razão fechado" : `diferença de ${brl(Math.abs(dif))}`}.
        </div>
      </div>
    </>
  );
}
