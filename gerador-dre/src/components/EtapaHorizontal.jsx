import { Fragment } from "react";
import { brl, pct, competenciaLegivel } from "../lib/parse.js";

const LINHAS = [
  ["receitaBruta", "Receita Bruta de Serviços"],
  ["deducoes", "Deduções à Receita"],
  ["receitaLiq", "Receita Operacional Líquida"],
  ["despOper", "Despesas Operacionais"],
  ["resultadoOper", "Resultado Operacional"],
  ["liquido", "Lucro Líquido do Exercício"],
];

export function EtapaHorizontal({ dresPorCompetencia }) {
  if (dresPorCompetencia.length < 2) {
    return (
      <div className="empty">
        <b>Este arquivo cobre {dresPorCompetencia.length === 1 ? "só uma competência" : "nenhuma competência reconhecida"}</b>
        A análise horizontal compara a variação percentual de cada linha da DRE entre meses —
        precisa de pelo menos dois meses de lançamentos no razão importado para fazer sentido.
        {dresPorCompetencia.length === 1 && (
          <> A competência encontrada foi <b>{competenciaLegivel(dresPorCompetencia[0].competencia)}</b>.</>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Análise horizontal</h2>
      <p className="hint">Variação percentual de cada linha em relação ao mês anterior.</p>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Linha</th>
              {dresPorCompetencia.map((d) => (
                <th key={d.competencia} className="num" colSpan={2}>{competenciaLegivel(d.competencia)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map(([chave, nome]) => (
              <tr key={chave}>
                <td>{nome}</td>
                {dresPorCompetencia.map((d, i) => {
                  const atual = d.dre[chave];
                  const anterior = i > 0 ? dresPorCompetencia[i - 1].dre[chave] : null;
                  const variacao = anterior ? (atual - anterior) / Math.abs(anterior) : null;
                  return (
                    <Fragment key={d.competencia}>
                      <td className="num">{brl(atual)}</td>
                      <td className={"num " + (variacao < 0 ? "neg" : "")}>
                        {variacao == null ? "—" : (variacao >= 0 ? "+" : "") + pct(variacao)}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
