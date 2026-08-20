/* A área De-Para — onde se responde, para cada conta do cliente, "para
 * onde isso vai?".
 *
 * POR QUE UMA TELA PRÓPRIA, se as duas decisões já existiam: porque elas
 * moravam em telas diferentes. O grupo da DRE se decide em Classificar,
 * a categoria do CPC 51 em Demonstração CPC 51 — e quem parametriza um
 * plano de contas trabalha CONTA A CONTA, não eixo a eixo. Trocar de aba
 * a cada linha é o que fazia essa tarefa parecer maior do que é.
 *
 * A ordem da tela segue a ordem da conversa real:
 *   1. Quanto falta?          → o placar, antes da tabela.
 *   2. O que falta?           → filtros, com "pendentes" à mão.
 *   3. Decidir.               → os dois destinos na mesma linha.
 *   4. Isso faz sentido?      → a leitura por destino, no fim.
 *
 * A tela não decide nada por conta própria: lê `montarDePara` e devolve
 * as escolhas para o mesmo estado que Classificar e CPC 51 já usam. É de
 * propósito — uma conta reclassificada aqui muda a DRE na hora, porque é
 * literalmente a mesma decisão, feita de outro lugar.
 */

import { useMemo, useState } from "react";
import { brl, pct } from "../lib/parse.js";
import { GRUPOS } from "../lib/grupos.js";
import { CATEGORIAS, NOME_CATEGORIA } from "../lib/cpc51.js";
import { SITUACOES, filtrarDePara, porGrupo, resumoDePara } from "../lib/depara.js";
import { situacaoDaLinha } from "../lib/exportacaoDePara.js";

/* Teto de linhas desenhadas de uma vez. Um razão real chega a centenas
   de contas de resultado, e cada linha tem dois <select> — passar de
   algumas centenas trava a digitação na busca. Quem precisa de todas
   exporta; quem precisa de uma acha pelo filtro. */
const TETO = 400;

/* Só "A revisar" ganha cor. Um semáforo com quatro estados coloridos
   não destaca nada — e vermelho e verde, neste projeto, pertencem ao
   dado (saldo, resultado), nunca a rótulo de processo. Âmbar é
   "falta trabalho aqui"; o resto é cinza porque não pede nada. */
const TOM_SITUACAO = { "A revisar": "edit" };

export function DePara({
  linhas, empresa, cnpj,
  onClassificar, onCategoriaConta, onLimparCategorias, onBaixarCSV, onBaixarExcel,
}) {
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [situacao, setSituacao] = useState("todas");

  const resumo = useMemo(() => resumoDePara(linhas), [linhas]);
  const grupos = useMemo(() => porGrupo(linhas), [linhas]);
  const visiveis = useMemo(
    () => filtrarDePara(linhas, { busca, grupo, categoria, situacao }),
    [linhas, busca, grupo, categoria, situacao]
  );
  const mostradas = visiveis.slice(0, TETO);
  const filtrando = busca || grupo !== "todos" || categoria !== "todas" || situacao !== "todas";

  return (
    <>
      <div className="card">
        <h2>De-Para — plano de contas × DRE × CPC 51</h2>
        <p className="hint">
          Uma linha por conta: de onde vem e para onde vai nas duas estruturas.
          Mudar aqui refaz a DRE na hora.
        </p>
        <div className="row">
          <button className="btn" onClick={onBaixarExcel}>Baixar Excel</button>
          <button className="btn ghost" onClick={onBaixarCSV}>Baixar CSV</button>
          {resumo.manuaisCategoria > 0 && (
            <button className="btn ghost" onClick={onLimparCategorias}>
              Voltar às categorias padrão
            </button>
          )}
        </div>

        <details className="explica">
          <summary>Por que esta tela existe</summary>
          <p>
            É a tabela que a TI carrega no ERP e a primeira coisa que a auditoria pede — por
            isso a <b>origem de cada decisão</b> fica registrada ao lado do destino: mapeamento
            herdado do padrão e mapeamento conferido conta a conta não podem parecer a mesma
            coisa.
          </p>
          <p>
            O que você muda aqui é a mesma decisão das etapas Classificar e Demonstração
            CPC 51. Para reaproveitar no mês seguinte, salve o perfil na etapa Classificar.
          </p>
        </details>
      </div>

      {/* 1. Quanto falta. */}
      <div className="checks">
        <div className="check">
          <div className="k">Contas mapeadas</div>
          <div className="v">{resumo.total}</div>
          <div className="sub">{resumo.manuaisGrupo} com grupo decidido à mão,{" "}
            {resumo.manuaisCategoria} com categoria decidida à mão.</div>
        </div>
        <div className="check" data-tone={resumo.completude >= 1 ? "ok" : undefined}>
          <div className="k">Parametrização resolvida</div>
          <div className="v">{pct(resumo.completude)}</div>
          <div className="sub">{resumo.resolvidas} de {resumo.total} contas com destino definido
            e sem julgamento pendente.</div>
        </div>
        <div className="check" data-tone={resumo.aRevisar ? "bad" : "ok"}>
          <div className="k">Categoria a revisar</div>
          <div className="v">{resumo.aRevisar}</div>
          <div className="sub">{brl(resumo.valorARevisar)} em contas cujo grupo mistura naturezas
            que o CPC 51 separa.</div>
        </div>
        <div className="check" data-tone={resumo.semGrupo ? "bad" : "ok"}>
          <div className="k">Fora da DRE</div>
          <div className="v">{resumo.semGrupo}</div>
          <div className="sub">{brl(resumo.valorSemGrupo)} que não entram em demonstração
            nenhuma. Confira se é mesmo o caso.</div>
        </div>
      </div>

      {resumo.semGrupo > 0 && (
        <div className="warn">
          <b>{resumo.semGrupo} conta(s) de resultado estão em "Não entra na DRE"</b>, somando{" "}
          {brl(resumo.valorSemGrupo)}. Isso é legítimo quando são contas de encerramento ou de
          transferência — mas é também o jeito mais silencioso de perder dinheiro na demonstração.
          Filtre por "Fora da DRE" abaixo e confira uma a uma.
        </div>
      )}

      {/* 2 e 3. O que falta, e decidir. */}
      <div className="card">
        <h2>Mapeamento conta a conta</h2>
        <div className="filters">
          <div>
            <label htmlFor="dp-busca">Buscar conta</label>
            <input id="dp-busca" type="text" value={busca} placeholder="Código ou descrição"
              onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div>
            <label htmlFor="dp-situacao">Situação</label>
            <select id="dp-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
              {SITUACOES.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dp-grupo">Grupo na DRE</label>
            <select id="dp-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option value="todos">Todos os grupos</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome} ({g.n})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dp-categoria">Categoria CPC 51</label>
            <select id="dp-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas as categorias</option>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              <option value="SEM_CATEGORIA">Não entra na DRE</option>
            </select>
          </div>
        </div>

        <p className="hint" style={{ marginTop: -4 }}>
          Mostrando <b>{mostradas.length}</b> de {visiveis.length} contas
          {filtrando ? " no filtro atual" : ""}
          {visiveis.length > TETO
            ? ` — as ${visiveis.length - TETO} restantes saem na exportação; use os filtros para alcançá-las na tela.`
            : "."}
        </p>

        {mostradas.length === 0 ? (
          <div className="empty">
            <b>Nenhuma conta neste filtro</b>
            {situacao === "pendentes"
              ? "Nada pendente — todas as contas têm destino na DRE e categoria sem julgamento em aberto."
              : "Afrouxe a busca ou volte a situação para \"Todas as contas\"."}
          </div>
        ) : (
          <div className="scroll">
            <table className="tabela-cartao dp-tabela">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Descrição</th>
                  <th className="num">Saldo</th>
                  <th>Grupo na DRE</th>
                  <th>Categoria CPC 51</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {mostradas.map((l) => (
                  <tr key={l.conta} data-pendente={l.pendente ? "1" : "0"}>
                    <td className="code" data-rotulo="Conta">{l.conta}</td>
                    <td className="desc" data-rotulo="Descrição">
                      {l.descricao}
                      {l.revisar && <span className="dp-motivo">{l.revisar}</span>}
                    </td>
                    <td className={"num destaque " + (l.saldo < 0 ? "neg" : "")} data-rotulo="Saldo">
                      {brl(l.saldo)}
                    </td>
                    <td data-rotulo="Grupo na DRE">
                      <select value={l.grupo} aria-label={`Grupo da conta ${l.conta} na DRE`}
                        onChange={(e) => onClassificar(l.conta, e.target.value)}>
                        {GRUPOS.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                      </select>
                    </td>
                    <td data-rotulo="Categoria CPC 51">
                      <select value={l.categoriaManual ? l.categoria : ""}
                        aria-label={`Categoria CPC 51 da conta ${l.conta}`}
                        disabled={l.semGrupo}
                        onChange={(e) => onCategoriaConta(l.conta, e.target.value)}>
                        <option value="">
                          Padrão: {NOME_CATEGORIA[l.categoria] || "fora da DRE"}
                        </option>
                        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </td>
                    <td data-rotulo="Situação">
                      <span className="tag" data-s={TOM_SITUACAO[situacaoDaLinha(l)]}>
                        {situacaoDaLinha(l)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. A conferência pelo outro lado: por destino, não por origem. */}
      <div className="card">
        <h2>Leitura por destino</h2>
        <p className="hint">
          O mesmo mapeamento pelo lado da DRE. Clique num grupo para filtrar a tabela acima —
          no Excel exportado, esta tabela abre nas contas de cada grupo.
        </p>
        <div className="scroll" style={{ maxHeight: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Grupo na DRE</th>
                <th className="num">Contas</th>
                <th className="num">Saldo</th>
                <th className="num">A revisar</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.id}>
                  <td data-rotulo="Grupo">
                    <button className="dp-link" onClick={() => { setGrupo(g.id); setSituacao("todas"); }}>
                      {g.nome}
                    </button>
                  </td>
                  <td className="num" data-rotulo="Contas">{g.n}</td>
                  <td className={"num " + (g.total < 0 ? "neg" : "")} data-rotulo="Saldo">{brl(g.total)}</td>
                  <td className="num" data-rotulo="A revisar">{g.aRevisar || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>O que este arquivo serve para</h2>
        <p className="hint">
          Excel com filtro e resumo por grupo — cada grupo abre nas contas que o formam,
          no <code>+</code> da margem esquerda; CSV para carga no ERP.
          {empresa || cnpj ? "" : " Preencha empresa e CNPJ na etapa Conferir para saírem no cabeçalho."}
        </p>
        <details className="explica">
          <summary>Onde ele entra no cronograma</summary>
          <p>
            É o entregável da <b>Fase 2</b> (planilha De-Para do plano de contas) e a
            especificação de entrada da <b>Fase 4</b> (parametrização no ERP).
          </p>
        </details>
      </div>
    </>
  );
}
