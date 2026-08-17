/* Medidas de desempenho definidas pela administração.
 *
 * A tela existe para tornar visível uma exigência que passa despercebida:
 * a partir do CPC 51, divulgar EBITDA deixa de ser um número no release e
 * passa a exigir nota explicativa com conciliação. Por isso cada medida
 * aparece SEMPRE com sua conciliação aberta — não atrás de um clique. O
 * número sozinho é justamente o que a norma proíbe.
 */

import { brl } from "../lib/parse.js";
import { GRUPOS } from "../lib/classify.js";
import { BASES, MODELOS, calcularMPDA } from "../lib/mpda.js";

export function MedidasMPDA({ medidas, dre51, onAdicionar, onRemover, onAjuste, onRemoverAjuste, onBaixarNota }) {
  const usados = new Set(medidas.map((m) => m.id));
  const disponiveis = MODELOS.filter((m) => !usados.has(m.id));
  const gruposComValor = GRUPOS.filter((g) => g.id !== "IGNORAR");

  return (
    <div className="card">
      <h2>MPDA — medidas de desempenho definidas pela administração</h2>
      <p className="hint">
        Divulgou EBITDA ou "resultado recorrente"? A norma exige nota com a conciliação.
      </p>
      <details className="explica">
        <summary>O que a nota precisa ter</summary>
        <p>
          Conciliação da medida com o subtotal mais diretamente comparável, o efeito de tributos
          e o efeito sobre não controladores de cada item. Como o resultado operacional da norma
          já exclui juros e tributos sobre o lucro, o EBITDA vira uma conta de duas linhas.
        </p>
      </details>

      {disponiveis.length > 0 && (
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="rotulo">Adicionar</span>
          {disponiveis.map((m) => (
            <button key={m.id} className="btn ghost" onClick={() => onAdicionar(m)}>
              {m.nome}
            </button>
          ))}
        </div>
      )}

      {medidas.length === 0 ? (
        <div className="empty">
          <b>Nenhuma medida cadastrada</b>
          Se a empresa não divulga indicador gerencial nenhum, não há MPDA a informar — e isso
          também é uma resposta para a Fase 1, passo 3.
        </div>
      ) : (
        medidas.map((m) => {
          const c = calcularMPDA(m, dre51);
          return (
            <div className="mpda" key={m.id}>
              <div className="mpda-cab">
                <div>
                  <h3>{m.nome}</h3>
                  <span className="rotulo">
                    concilia com {BASES.find((b) => b.id === m.base)?.nome}
                  </span>
                </div>
                <div className="mpda-valor">{brl(c.valor)}</div>
              </div>

              {m.porQueUtil && <p className="mpda-porque">{m.porQueUtil}</p>}

              <div className="mpda-conc">
                {c.linhas.map((l, i) => (
                  <div className="line" data-k={l.t === "l" ? "" : l.t} key={i}>
                    <div className="lbl">
                      {l.lbl}
                      {l.ajuste && (
                        <button className="cpc-x" aria-label={`Remover ajuste: ${l.lbl}`}
                          onClick={() => onRemoverAjuste(m.id, l.ajuste.id)}>×</button>
                      )}
                    </div>
                    <div className="canal" />
                    <div className={"val " + (l.val < 0 ? "neg" : "")}>
                      {l.val < 0 ? "(" + brl(Math.abs(l.val)) + ")" : brl(l.val)}
                    </div>
                    <div className="av" />
                  </div>
                ))}
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                <select aria-label={`Adicionar ajuste à medida ${m.nome}`} value=""
                  onChange={(e) => { if (e.target.value) onAjuste(m.id, e.target.value, "incluir"); e.target.value = ""; }}>
                  <option value="">Incluir grupo…</option>
                  {gruposComValor.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
                <select aria-label={`Excluir grupo da medida ${m.nome}`} value=""
                  onChange={(e) => { if (e.target.value) onAjuste(m.id, e.target.value, "excluir"); e.target.value = ""; }}>
                  <option value="">Excluir grupo…</option>
                  {gruposComValor.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
                <button className="btn ghost" onClick={() => onRemover(m.id)}>Remover medida</button>
              </div>
            </div>
          );
        })
      )}

      {medidas.length > 0 && (
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={onBaixarNota}>Baixar minuta da nota explicativa</button>
          <span className="hint" style={{ margin: 0 }}>
            Conciliação preenchida; efeito tributário e de não controladores saem como lacuna,
            nunca como zero.
          </span>
        </div>
      )}
    </div>
  );
}
