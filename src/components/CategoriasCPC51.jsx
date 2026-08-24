/* Onde as contas ganham categoria do CPC 51.
 *
 * A ordem da tela é a ordem do trabalho real, e não a ordem do código:
 * primeiro a POLÍTICA (o julgamento que muda tudo o que vem abaixo),
 * depois os GRUPOS que dependem desse julgamento, e só então as CONTAS —
 * porque decidir conta a conta antes de fixar a política é refazer
 * trabalho.
 *
 * A lista de contas mostra por padrão só o que precisa de atenção. Uma
 * tabela com todas as contas de resultado seria honesta e inútil: com
 * 400 linhas iguais, ninguém encontra as seis que importam.
 */

import { useState } from "react";
import { brl } from "../lib/formato.js";
import { GRUPOS } from "../lib/classify.js";
import { CATEGORIAS, NOME_CATEGORIA, categoriaDoGrupo, revisarGrupo } from "../lib/cpc51.js";

export function CategoriasCPC51({
  politica, onPolitica, categoriaPorConta, onCategoriaConta, onLimparCategorias,
  contasResultado, grupoDe, categoriaDe, mistas, cobertura, nomes,
}) {
  const [busca, setBusca] = useState("");
  const [verTodas, setVerTodas] = useState(false);

  const grupoUsado = new Set(contasResultado.map((c) => grupoDe(c.conta)));
  const gruposNaTela = GRUPOS.filter((g) => g.id !== "IGNORAR" && grupoUsado.has(g.id));

  const contasMistasSet = new Set(mistas.map((m) => m.conta));
  const filtro = busca.trim().toLowerCase();
  const contasVisiveis = contasResultado
    .filter((c) => grupoDe(c.conta) !== "IGNORAR")
    .filter((c) => {
      if (filtro) return (c.conta + " " + (nomes[c.conta] || "") + " " + c.historico).toLowerCase().includes(filtro);
      if (verTodas) return true;
      return contasMistasSet.has(c.conta) || categoriaPorConta[c.conta];
    })
    .slice(0, 300);

  const manuais = Object.keys(categoriaPorConta).length;

  return (
    <>
      <div className="card">
        <h2>Política contábil de classificação</h2>
        <p className="hint">Muda a demonstração na hora e sai registrada na planilha.</p>
        <details className="explica">
          <summary>Por que isso é uma decisão contábil</summary>
          <p>
            O CPC 51 classifica de forma diferente quem tem, como <b>atividade de negócio
            principal</b>, investir em ativos ou conceder financiamento a clientes. É a decisão
            da Fase 1 (passo 2) e a primeira pergunta da auditoria.
          </p>
        </details>
        <div className="checks">
          <label className="check cpc-escolha">
            <input type="checkbox" checked={!!politica.investirEhAtividadePrincipal}
              onChange={(e) => onPolitica({ ...politica, investirEhAtividadePrincipal: e.target.checked })} />
            <span>
              <b>Investir em ativos é a atividade principal</b>
              <i>Holding, fundo, seguradora, empresa de participações. O resultado de
                investimento passa a ser apresentado dentro do operacional.</i>
            </span>
          </label>
          <label className="check cpc-escolha">
            <input type="checkbox" checked={!!politica.financiarClientesEhAtividadePrincipal}
              onChange={(e) => onPolitica({ ...politica, financiarClientesEhAtividadePrincipal: e.target.checked })} />
            <span>
              <b>Financiar clientes é a atividade principal</b>
              <i>Banco, financeira, crediário próprio. O resultado de financiamento passa a ser
                apresentado dentro do operacional.</i>
            </span>
          </label>
        </div>
      </div>

      <div className="card">
        <h2>De-Para dos grupos</h2>
        <p className="hint">
          Cada grupo cai numa das cinco categorias. Os marcados em amarelo pedem julgamento.
        </p>
        <div className="cpc-grupos">
          {gruposNaTela.map((g) => {
            const revisar = revisarGrupo(g.id, politica);
            return (
              <div className="cpc-grupo" key={g.id} data-revisar={revisar ? "1" : "0"}>
                <div className="cpc-grupo-cab">
                  <span className="cpc-grupo-nome">{g.nome}</span>
                  <span className="tag" data-s={revisar ? "edit" : "auto"}>
                    {NOME_CATEGORIA[categoriaDoGrupo(g.id, politica)] || "fora da DRE"}
                  </span>
                </div>
                {revisar && <p className="cpc-motivo">{revisar}</p>}
              </div>
            );
          })}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Para separar dentro de um grupo, decida conta a conta na tabela abaixo.
        </p>
      </div>

      <div className="card">
        <h2>Contas que pedem atenção</h2>
        <p className="hint">
          {mistas.length > 0 ? (
            <>
              <b>{mistas.length} {mistas.length === 1 ? "conta" : "contas"}</b> agregam naturezas
              diferentes. No ERP elas viram subcontas; aqui dá para decidir cada uma agora.
            </>
          ) : (
            <>Nenhuma conta mista. A tabela mostra o que você já decidiu à mão — use a busca
              ou "ver todas" para alcançar qualquer outra.</>
          )}
          {" "}Já decididas manualmente: <b>{manuais}</b>. Ainda no padrão de um grupo que pede
          revisão: <b>{cobertura.aRevisar}</b> ({brl(cobertura.valorARevisar)}).
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <input type="text" value={busca} placeholder="Buscar conta por código, nome ou histórico"
            aria-label="Buscar conta" style={{ flex: "1 1 260px" }}
            onChange={(e) => setBusca(e.target.value)} />
          <button className="btn ghost" onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? "Ver só as que pedem atenção" : "Ver todas as contas"}
          </button>
          {manuais > 0 && (
            <button className="btn ghost" onClick={onLimparCategorias}>
              Voltar às categorias padrão
            </button>
          )}
        </div>

        {contasVisiveis.length === 0 ? (
          <div className="empty">
            <b>Nada a revisar por aqui</b>
            As categorias padrão dos grupos dão conta destas contas. Se quiser conferir uma conta
            específica, use a busca acima.
          </div>
        ) : (
          <div className="scroll">
            <table className="tabela-cartao">
              <thead>
                <tr>
                  <th>Conta</th><th>Descrição</th><th className="num">Saldo</th>
                  <th style={{ minWidth: 210 }}>Categoria CPC 51</th><th>Por quê</th>
                </tr>
              </thead>
              <tbody>
                {contasVisiveis.map((c) => {
                  const achado = mistas.find((m) => m.conta === c.conta);
                  return (
                    <tr key={c.conta}>
                      <td className="code" data-rotulo="Conta">{c.conta}</td>
                      <td className="desc" data-rotulo="Descrição">
                        {nomes[c.conta] || (c.historico.trim().split(",")[0] || "").slice(0, 38)}
                      </td>
                      <td className={"num destaque " + (c.saldo < 0 ? "neg" : "")} data-rotulo="Saldo">
                        {brl(c.saldo)}
                      </td>
                      <td data-rotulo="">
                        <select value={categoriaPorConta[c.conta] || ""}
                          aria-label={`Categoria CPC 51 da conta ${c.conta}`}
                          onChange={(e) => onCategoriaConta(c.conta, e.target.value)}>
                          <option value="">
                            Padrão do grupo — {NOME_CATEGORIA[categoriaDe(c.conta)] || "fora da DRE"}
                          </option>
                          {CATEGORIAS.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td className="desc" data-rotulo="Por quê">
                        {achado
                          ? achado.motivos.map((m) => m.texto).join(" ")
                          : categoriaPorConta[c.conta]
                            ? "Decisão manual registrada."
                            : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
