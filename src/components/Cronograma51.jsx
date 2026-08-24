/* O plano de ação: as dez fases da implementação do CPC 51, com o
 * andamento marcado passo a passo.
 *
 * Duas decisões de tela que vêm do uso, não do gosto:
 *
 * - A fase ATUAL abre sozinha; as outras ficam fechadas. Quarenta e nove
 *   passos abertos de uma vez é um documento, não uma ferramenta — e
 *   documento a gente lê uma vez e nunca mais.
 * - O prazo aparece em DIAS, com o vencido em vermelho. "30/11/2026" não
 *   provoca reação nenhuma em agosto; "faltam 112 dias" provoca.
 *
 * O andamento fica em localStorage e sobrevive a "Limpar tudo" de
 * propósito: ali não há dado financeiro nenhum, e perder o andamento do
 * projeto ao limpar o arquivo seria dano sem contrapartida (ver
 * `planoAcao.js`).
 */

import { useState } from "react";
import {
  ESTADOS, FASES, chaveEntregavel, chavePasso, diasPara, faseAtual, progressoFase, progressoGeral,
} from "../lib/cronograma51.js";

function Prazo({ limite, prazo }) {
  const dias = diasPara(limite);
  const estado = dias < 0 ? "vencido" : dias <= 15 ? "perto" : "ok";
  const texto =
    dias < 0 ? `vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
      : dias === 0 ? "vence hoje"
        : `faltam ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return (
    <span className="cron-prazo" data-e={estado}>
      {prazo} · {texto}
    </span>
  );
}

function Item({ chave, texto, numero, apoio, status, onStatus }) {
  const estado = status[chave] || "pendente";
  return (
    <li className="cron-item" data-e={estado}>
      <select value={estado} aria-label={`Situação do item: ${texto.slice(0, 60)}`}
        onChange={(e) => onStatus(chave, e.target.value)}>
        {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </select>
      <div>
        <span className="cron-txt">
          {numero != null && <b className="cron-n">{numero}.</b>} {texto}
        </span>
        {apoio && <span className="cron-apoio">Neste app: {apoio}</span>}
      </div>
    </li>
  );
}

export function Cronograma51({ status, onStatus, onLimpar }) {
  const atual = faseAtual(status);
  const [abertas, setAbertas] = useState(() => new Set([atual?.id].filter(Boolean)));
  const geral = progressoGeral(status);

  const alternar = (id) =>
    setAbertas((s) => {
      const nova = new Set(s);
      if (nova.has(id)) nova.delete(id); else nova.add(id);
      return nova;
    });

  return (
    <>
      <div className="card">
        <h2>Plano de ação — implementação do CPC 51</h2>
        <p className="hint">
          Dez fases, de julho de 2026 ao go-live em 2027. O andamento fica salvo neste navegador.
        </p>
        <div className="checks">
          <div className="check">
            <div className="k">Fase atual</div>
            <div className="v" style={{ fontSize: 15 }}>
              {atual ? `${FASES.indexOf(atual)}. ${atual.titulo}` : "Todas concluídas"}
            </div>
          </div>
          <div className="check">
            <div className="k">Itens concluídos</div>
            <div className="v">{geral.feitos} / {geral.total}</div>
          </div>
          <div className="check">
            <div className="k">Em andamento</div>
            <div className="v">{geral.andamento}</div>
          </div>
        </div>
        <div className="progresso" aria-hidden="true">
          <div className="progresso-barra" style={{ width: `${(geral.feitos / geral.total) * 100}%` }} />
        </div>
      </div>

      {FASES.map((f, i) => {
        const p = progressoFase(f, status);
        const aberta = abertas.has(f.id);
        return (
          <div className="card cron-fase" key={f.id} data-atual={atual?.id === f.id ? "1" : "0"}>
            <button className="cron-cab" aria-expanded={aberta} onClick={() => alternar(f.id)}>
              <span className="cron-num">{i}</span>
              <span className="cron-titulo">
                <b>{f.titulo}</b>
                <span className="cron-meta">
                  <Prazo limite={f.limite} prazo={f.prazo} /> · {f.responsavel}
                </span>
              </span>
              <span className="cron-pct" data-completa={p.pct === 1 ? "1" : "0"}>
                {p.feitos}/{p.total}
              </span>
            </button>

            {aberta && (
              <div className="cron-corpo">
                <p className="hint">{f.objetivo}</p>

                <div className="rotulo">Passo a passo</div>
                <ul className="cron-lista">
                  {f.passos.map((passo, j) => (
                    <Item key={j} chave={chavePasso(f.id, j)} texto={passo.texto} numero={passo.n}
                      apoio={passo.apoio} status={status} onStatus={onStatus} />
                  ))}
                </ul>

                <div className="rotulo">Entregáveis</div>
                <ul className="cron-lista">
                  {f.entregaveis.map((e, j) => (
                    <Item key={j} chave={chaveEntregavel(f.id, j)} texto={e}
                      status={status} onStatus={onStatus} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      <div className="card">
        <details className="explica" style={{ marginTop: 0, marginBottom: 10, borderTop: "none", paddingTop: 0 }}>
          <summary>De onde vem este cronograma</summary>
          <p>
            Transcrito do documento "Cronograma para implementação das DFs conforme CPC 51". As
            datas e os responsáveis são os do documento; a indicação "neste app" é acréscimo
            desta ferramenta. O andamento não é apagado por "Limpar tudo" — ali não há dado
            financeiro, só o estado do projeto.
          </p>
        </details>
        <button className="btn ghost" onClick={onLimpar}>Zerar andamento do plano</button>
      </div>
    </>
  );
}
