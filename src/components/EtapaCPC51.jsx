/* A demonstração do resultado na estrutura do CPC 51.
 *
 * A ordem da tela responde às perguntas na ordem em que elas são feitas
 * de verdade numa sala de reunião:
 *
 *   1. "O lucro mudou?"          → a prova, antes de qualquer número.
 *   2. "Como fica a demonstração?" → a DRE nas cinco categorias.
 *   3. "O que saiu de onde?"      → a ponte do operacional atual ao novo.
 *   4. "Quem decidiu isso?"       → política, grupos e contas.
 *   5. "E o EBITDA que divulgamos?" → MPDA.
 *
 * A prova vem primeiro de propósito. Numa reapresentação, a primeira
 * reação de quem assina é desconfiar do total; enquanto essa dúvida não
 * morre, ninguém olha a estrutura.
 */

import { Fragment } from "react";
import { brl, pct } from "../lib/parse.js";
import { Cabecalho, Linha, Secao } from "./LinhaDRE.jsx";
import { montarLinhas51 } from "../lib/linhasCPC51.js";
import { CATEGORIAS } from "../lib/cpc51.js";
import { FASES, diasPara } from "../lib/cronograma51.js";
import { CategoriasCPC51 } from "./CategoriasCPC51.jsx";
import { MedidasMPDA } from "./MedidasMPDA.jsx";

/** Contas de um grupo dentro de uma categoria. Não reaproveita o
 *  `Detalhe` da DRE tradicional porque lá o valor é multiplicado pelo
 *  sinal do grupo; aqui o valor JÁ é o saldo com sinal contábil, e
 *  multiplicar de novo inverteria despesa e receita. */
function DetalheCategoria({ grupo, nomes, base, mostrar }) {
  if (!mostrar) return null;
  return grupo.contas.slice(0, 25).map((c) => (
    <div className="line" data-k="det" key={grupo.id + c.conta}>
      <div className="lbl">
        <span className="code">{c.conta}</span>{" "}
        {nomes[c.conta] || (c.historico || "").trim().split(",")[0].slice(0, 42)}
      </div>
      <div className="canal" />
      <div className={"val " + (c.val < 0 ? "neg" : "")}>
        {c.val < 0 ? "(" + brl(Math.abs(c.val)) + ")" : brl(c.val)}
      </div>
      <div className="av">{pct(c.val / base)}</div>
    </div>
  ));
}

export function EtapaCPC51({
  dre, dre51, conciliacao, mistas, cobertura, politica, categoriaPorConta,
  contasResultado, grupoDe, categoriaDe, nomes, empresa, cnpj, periodo,
  detalhado, onToggleDetalhado, medidas, onPolitica, onCategoriaConta, onLimparCategorias,
  onAdicionarMedida, onRemoverMedida, onAjusteMedida, onRemoverAjuste,
  onBaixarExcel, onBaixarDePara, onBaixarNota, onIrAoPlano,
}) {
  const base = dre.receitaLiq || 1;
  const { itens, escala } = montarLinhas51(dre51);
  const gruposPorId = {};
  Object.values(dre51.cat).forEach((c) => c.grupos.forEach((g) => (gruposPorId[`${c.id}|${g.id}`] = g)));

  const goLive = FASES.find((f) => f.id === "f8");
  const diasGoLive = diasPara(goLive.limite);

  return (
    <>
      <div className="card cpc-topo">
        <h2>CPC 51 — a DRE em cinco categorias</h2>
        <p className="hint">
          Cinco categorias e dois subtotais obrigatórios.
          {diasGoLive > 0
            ? ` Faltam ${diasGoLive} dias para o go-live (${goLive.prazo}).`
            : ` O prazo do go-live (${goLive.prazo}) já passou.`}
        </p>
        <div className="row">
          <button className="btn" onClick={onBaixarExcel}>Baixar Excel CPC 51</button>
          <button className="btn ghost" onClick={onBaixarDePara}>Baixar De-Para (CSV)</button>
          <button className="btn ghost" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="btn ghost" onClick={onToggleDetalhado}>
            {detalhado ? "Ocultar contas" : "Mostrar contas"}
          </button>
          <button className="btn ghost" onClick={onIrAoPlano}>Ver plano de ação</button>
        </div>
      </div>

      {/* 1. A prova. */}
      <div className="checks">
        <div className="check">
          <div className="k">Lucro líquido — estrutura atual</div>
          <div className={"v " + (dre.liquido < 0 ? "neg" : "")}>{brl(dre.liquido)}</div>
        </div>
        <div className="check">
          <div className="k">Resultado líquido — CPC 51</div>
          <div className={"v " + (dre51.liquido < 0 ? "neg" : "")}>{brl(dre51.liquido)}</div>
        </div>
        <div className="check" data-tone={conciliacao.fecha ? "ok" : "bad"}>
          <div className="k">Diferença</div>
          <div className="v">{brl(Math.abs(conciliacao.diferenca))}</div>
        </div>
      </div>

      <div className={conciliacao.fecha ? "ok" : "err"}>
        {conciliacao.fecha ? (
          <>
            <b>O resultado não mudou.</b> O CPC 51 reclassifica receitas e despesas entre
            categorias; ele não recalcula o lucro. É esta a confirmação que a Fase 5 (passo 22) e a
            Fase 6 (passo 29) exigem antes de reapresentar as demonstrações.
          </>
        ) : (
          <>
            <b>As duas estruturas não fecham no mesmo resultado.</b> Isso não é uma diferença
            aceitável: significa que alguma conta está em duas contagens ou em nenhuma. Revise as
            categorias antes de apresentar qualquer número.
          </>
        )}
      </div>

      {/* 2. A demonstração. */}
      <div className="dre">
        <div className="dre-head">
          <h3>{empresa || "Demonstração do Resultado — CPC 51"}</h3>
          <p>
            Demonstração do Resultado conforme CPC 51
            {cnpj ? ` · CNPJ ${cnpj}` : ""}
            {" · "}{periodo || "período do arquivo"}
            {" · valores em R$"}
          </p>
        </div>

        <Cabecalho />

        {itens.map((it, i) => {
          if (it.t === "secao") return <Secao key={`s${i}`} nome={it.lbl} val={it.val} base={base} />;
          const grupo = it.id ? gruposPorId[`${it.cat}|${it.id}`] : null;
          return (
            <Fragment key={`${it.t}${i}`}>
              <Linha lbl={it.lbl} val={it.val} tipo={it.t === "l" ? "" : it.t} base={base}
                escala={escala} inicio={it.inicio} fim={it.fim} nivel={it.nivel} />
              {grupo && <DetalheCategoria grupo={grupo} nomes={nomes} base={base} mostrar={detalhado} />}
            </Fragment>
          );
        })}

        {dre51.foraDaDemonstracao !== 0 && (
          <div className="prova" data-fecha="0">
            <b>Fora da demonstração.</b> {brl(Math.abs(dre51.foraDaDemonstracao))} em contas
            marcadas como "Não entra na DRE" na etapa Classificar. Elas também não entram na
            estrutura atual — mas confira se é mesmo o caso antes de reapresentar.
          </div>
        )}

        <div className="foot">
          Os dois subtotais em destaque — Resultado Operacional e Resultado antes do financiamento
          e dos tributos sobre o lucro — são exigidos pela norma e aparecem mesmo quando a
          categoria correspondente não tem movimento.<br />
          Análise vertical calculada sobre a receita operacional líquida da estrutura atual, para
          as duas demonstrações serem comparáveis linha a linha.
        </div>

        {/* Só existe no papel — ver `.print-rodape` em App.css. */}
        <p className="print-rodape">
          Gerado pelo Gerador de DRE em {new Date().toLocaleDateString("pt-BR")} às{" "}
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
        </p>
      </div>

      {/* 3. A ponte. */}
      <div className="card">
        <h2>Do operacional de hoje ao operacional do CPC 51</h2>
        <p className="hint">
          O lucro líquido não muda; o <b>resultado operacional</b> muda.
        </p>
        <details className="explica">
          <summary>Como ler a ponte</summary>
          <p>
            Cada linha é um grupo de contas, agrupado pelo motivo do movimento: o que saiu para
            investimento ou financiamento, e o que entrou porque o "não operacional" deixou de
            existir — o operacional passou a ser a categoria residual.
          </p>
        </details>
        <div className="dre" style={{ marginBottom: 0 }}>
          {conciliacao.pontes.map((p, i) => (
            <div className="line" data-k={p.t === "sub" ? "sub" : ""} key={i}>
              <div className="lbl">{p.lbl}</div>
              <div className="canal" />
              <div className={"val " + (p.val < 0 ? "neg" : "")}>
                {p.val < 0 ? "(" + brl(Math.abs(p.val)) + ")" : brl(p.val)}
              </div>
              <div className="av">{pct(p.val / base)}</div>
            </div>
          ))}
        </div>
        {!conciliacao.ponteFecha && (
          <div className="warn" style={{ marginTop: 12 }}>
            A ponte não fecha por {brl(Math.abs(conciliacao.residuoPonte))}. Há conta entrando em
            uma estrutura e não na outra — revise as decisões manuais de categoria.
          </div>
        )}
      </div>

      {/* 4. Quem decidiu. */}
      <CategoriasCPC51
        politica={politica} onPolitica={onPolitica}
        categoriaPorConta={categoriaPorConta} onCategoriaConta={onCategoriaConta}
        onLimparCategorias={onLimparCategorias}
        contasResultado={contasResultado} grupoDe={grupoDe} categoriaDe={categoriaDe}
        mistas={mistas} cobertura={cobertura} nomes={nomes}
      />

      {/* 5. O que a empresa divulga por fora da norma. */}
      <MedidasMPDA
        medidas={medidas} dre51={dre51}
        onAdicionar={onAdicionarMedida} onRemover={onRemoverMedida} onAjuste={onAjusteMedida}
        onRemoverAjuste={onRemoverAjuste} onBaixarNota={onBaixarNota}
      />

      <div className="card">
        <h2>As cinco categorias, para consulta</h2>
        <div className="cpc-glossario">
          {CATEGORIAS.map((c) => (
            <div className="cpc-verbete" key={c.id}>
              <b>{c.nome}</b>
              <span>{c.descricao}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
