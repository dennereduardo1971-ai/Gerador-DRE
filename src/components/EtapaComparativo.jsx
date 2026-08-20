import { Fragment } from "react";
import { brl, competenciaLegivel, pct } from "../lib/parse.js";
import { montarLinhas } from "../lib/linhasDRE.js";

/* A DRE no tempo — em dois níveis de zoom, numa aba só.
 *
 * Eram duas abas ("Horizontal" e "Comparativa") e viraram uma, porque
 * respondem à MESMA pergunta: como a demonstração se moveu de um mês
 * para o outro. A variação percentual das seis linhas de topo é o
 * panorama — boa para achar o mês que destoou; a DRE inteira lado a lado
 * é onde se trabalha depois de achar. Duas abas para isso obrigavam a
 * ir e voltar com a resposta pela metade em cada uma.
 *
 * A ordem segue a da pergunta: primeiro "algo se mexeu?", depois "o quê,
 * exatamente?".
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

/* As seis linhas do panorama. São as que aparecem numa conversa sobre o
   mês ("a receita caiu?", "a despesa subiu?") — não a DRE inteira, que
   é o que a tabela de baixo mostra. */
const LINHAS_TOPO = [
  ["receitaBruta", "Receita Bruta de Serviços"],
  ["deducoes", "Deduções à Receita"],
  ["receitaLiq", "Receita Operacional Líquida"],
  ["despOper", "Despesas Operacionais"],
  ["resultadoOper", "Resultado Operacional"],
  ["liquido", "Lucro Líquido do Exercício"],
];

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
        Comparar a DRE no tempo põe uma coluna por mês — precisa de pelo menos dois meses de
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
    <>
      <div className="card">
        <h2>Variação mês a mês</h2>
        <p className="hint">
          As seis linhas de topo e quanto cada uma andou em relação ao mês anterior. É o
          panorama: serve para achar o mês que destoou antes de abrir a demonstração inteira.
        </p>
        <div className="scroll">
          <table className="tabela-larga">
            <thead>
              <tr>
                <th>Linha</th>
                {dresPorCompetencia.map((d) => (
                  <th key={d.competencia} className="num" colSpan={2}>{competenciaLegivel(d.competencia)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_TOPO.map(([chave, nome]) => (
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

    <div className="card">
      <h2>DRE comparativa</h2>
      <p className="hint">
        Uma coluna por competência. O percentual é a análise vertical do próprio mês — dá para
        comparar estrutura, não só tamanho.
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
    </>
  );
}
