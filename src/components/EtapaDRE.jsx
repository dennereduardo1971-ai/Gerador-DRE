import { Fragment } from "react";
import { brl } from "../lib/formato.js";
import { Linha, Secao, Detalhe, Cabecalho } from "./LinhaDRE.jsx";
import { montarLinhas } from "../lib/linhasDRE.js";

export function EtapaDRE({
  dre, empresa, cnpj, periodo, resumo,
  nomes, detalhado, onToggleDetalhado, onBaixarCSV, onBaixarExcel, prova, onSalvarHistorico,
}) {
  const base = dre.receitaLiq || 1;
  const { itens, escala } = montarLinhas(dre);

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={onBaixarExcel}>Baixar Excel</button>
        <button className="btn ghost" onClick={onBaixarCSV}>Baixar CSV</button>
        {/* Impressão do navegador: em "Destino", escolher "Salvar como PDF".
            É o caminho que não exige biblioteca nenhuma e usa o CSS de
            impressão que a demonstração já tem. */}
        <button className="btn ghost" onClick={() => window.print()}>Imprimir / PDF</button>
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
            {" · "}{periodo || "período do arquivo"} · valores em R$
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
            que nada se perdeu no caminho entre o balancete e a
            demonstração. */}
        <div className="prova" data-fecha={prova.fecha ? "1" : "0"}>
          <b>Prova de integridade.</b>{" "}
          Das {prova.nComMovimento ?? prova.nContas} contas de resultado com movimento no
          período, {brl(prova.classificado)} entraram na demonstração
          {prova.nIgnoradas > 0 ? (
            <> e {brl(prova.ignorado)} ficaram de fora ({prova.nIgnoradas}{" "}
            {prova.nIgnoradas === 1 ? "conta" : "contas"} marcadas como ignorar)</>
          ) : (
            <> e nada ficou de fora</>
          )}
          . Somando os dois: {brl(prova.total)}, que é exatamente o movimento das contas de
          resultado do balancete
          {prova.fecha ? "." : ` — com diferença de ${brl(Math.abs(prova.diferenca))}, que precisa ser investigada antes de assinar.`}
        </div>

        <div className="foot">
          A barra de cada linha mostra quanto da receita ainda restava naquele ponto da
          demonstração — verde soma, vermelho subtrai, índigo é o saldo acumulado.<br />
          Análise vertical calculada sobre a receita operacional líquida.<br />
          {resumo
            ? <>Balancete de {resumo.nContas} contas ·{" "}
              {resumo.integro ? "hierarquia fecha" : "hierarquia NÃO fecha — conferir antes de assinar"}
              {resumo.resultadoConfere === true && " · patrimonial e resultado batem"}
              {resumo.resultadoConfere === false && " · patrimonial e resultado DIVERGEM"}.</>
            : "Sem balancete carregado."}
        </div>

        {/* Só existe no papel: `display: none` na tela, visível dentro de
            `@media print` (App.css). A data é a do momento em que a
            página foi impressa/exportada — o gesto que gera o PDF. */}
        <p className="print-rodape">
          Gerado pelo Gerador de DRE em {new Date().toLocaleDateString("pt-BR")} às{" "}
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
        </p>
      </div>
    </>
  );
}
