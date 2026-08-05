import { brl, competenciaLegivel, pct } from "../lib/parse.js";
import { montarLinhas } from "../lib/linhasDRE.js";

/* DRE comparativa: a demonstração inteira, uma coluna por competência.
 *
 * A Análise Horizontal já existia, mas comparava só seis linhas — bom
 * para um panorama, insuficiente para trabalhar. Quem fecha mês quer ver
 * a DRE inteira lado a lado e achar a linha que destoou.
 *
 * As linhas vêm de `montarLinhas`, a mesma função da DRE de coluna única.
 * Isso é de propósito: se um rótulo, um sinal ou uma condição de exibição
 * mudar lá, muda aqui junto — as duas telas não podem divergir sobre o
 * que é a demonstração.
 *
 * A coluna de esqueleto é a da ÚLTIMA competência, não a da primeira:
 * seções condicionais (Custos, Provisões, Não Operacional) aparecem
 * conforme o mês tiver movimento, e o mês mais recente é o que melhor
 * representa a estrutura corrente. Cada célula é buscada pelo rótulo da
 * linha, então um mês sem aquele grupo mostra "—" em vez de deslocar a
 * tabela inteira.
 */

function valoresPorRotulo(dre) {
  const { itens } = montarLinhas(dre);
  const mapa = new Map();
  itens.forEach((it) => mapa.set(it.lbl, it.val));
  return mapa;
}

export function EtapaComparativo({ dresPorCompetencia }) {
  if (dresPorCompetencia.length < 2) {
    return (
      <div className="empty">
        <b>
          Este arquivo cobre{" "}
          {dresPorCompetencia.length === 1 ? "só uma competência" : "nenhuma competência reconhecida"}
        </b>
        A DRE comparativa põe uma coluna por mês — precisa de pelo menos dois meses de
        lançamentos no razão importado. Se o seu razão tem mais de um mês mas nenhum foi
        reconhecido, confira o mapeamento das colunas de data e ano na etapa 2.
      </div>
    );
  }

  const colunas = dresPorCompetencia.map((d) => ({
    competencia: d.competencia,
    valores: valoresPorRotulo(d.dre),
    base: d.dre.receitaLiq || 1,
  }));

  const { itens } = montarLinhas(dresPorCompetencia[dresPorCompetencia.length - 1].dre);
  const linhas = itens.filter((it) => it.t !== "cab");

  return (
    <div className="card">
      <h2>DRE comparativa</h2>
      <p className="hint">
        A demonstração inteira, uma coluna por competência. Role para o lado se o arquivo
        cobrir muitos meses. O percentual embaixo de cada valor é a análise vertical daquele
        mês, sobre a receita líquida do próprio mês — então dá para comparar estrutura, e não
        só tamanho.
      </p>
      <div className="scroll">
        <table className="tabela-larga dre-comparativa">
          <thead>
            <tr>
              <th>Linha</th>
              {colunas.map((c) => (
                <th key={c.competencia} className="num">{competenciaLegivel(c.competencia)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((it, i) => (
              <tr key={`${it.lbl}-${i}`} data-k={it.t}>
                <td>{it.lbl}</td>
                {colunas.map((c) => {
                  const val = c.valores.get(it.lbl);
                  if (val == null) return <td key={c.competencia} className="num">—</td>;
                  return (
                    <td key={c.competencia} className={"num " + (val < 0 ? "neg" : "")}>
                      {val < 0 ? "(" + brl(Math.abs(val)) + ")" : brl(val)}
                      <span className="av-inline">{pct(val / c.base)}</span>
                    </td>
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
