import { brl, competenciaLegivel, pct } from "../lib/parse.js";
import { cascataPassos } from "../lib/indicadores.js";

/* Gráficos do painel — 2D e precisos de propósito.
 *
 * Toda comparação de valor mora aqui, em escala linear e sem perspectiva.
 * A terceira dimensão fica restrita às torres patrimoniais, onde ela
 * mostra uma igualdade em vez de pedir uma comparação: em perspectiva, a
 * barra mais próxima parece maior que outra de mesmo valor, e num painel
 * financeiro isso deixa de ser estilo e vira erro de leitura.
 *
 * SVG à mão em vez de biblioteca de gráficos porque são três formas
 * simples e o projeto inteiro tem quatro dependências — trazer uma quinta
 * para desenhar retângulos sairia mais caro de manter do que de escrever.
 */

const curto = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",") + " bi";
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " mi";
  if (a >= 1e3) return Math.round(n / 1e3) + " mil";
  return Math.round(n).toString();
};

/* ---------- Cascata do resultado ---------- */

export function Cascata({ dre }) {
  const { passos: barras, liquido: corrente } = cascataPassos(dre);

  const L = 92, R = 16, T = 18, B = 46, alturaBarra = 34, gap = 12;
  const linhas = barras.length + 1;
  const H = T + linhas * (alturaBarra + gap) + B;
  const W = 720;
  const larguraUtil = W - L - R;
  const teto = Math.max(dre.receitaBruta, corrente, 1);
  const x = (v) => L + (v / teto) * larguraUtil;

  return (
    <figure className="gr">
      <figcaption>
        Da receita bruta ao lucro líquido — cada faixa é o que a linha retirou ou somou.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img"
        aria-label={`Cascata do resultado: receita bruta ${brl(dre.receitaBruta)}, lucro líquido ${brl(dre.liquido)}.`}>
        {barras.map((b, i) => {
          const y = T + i * (alturaBarra + gap);
          const x1 = x(Math.min(b.de, b.ate));
          const x2 = x(Math.max(b.de, b.ate));
          return (
            <g key={b.lbl}>
              <text x={L - 10} y={y + alturaBarra / 2 + 4} className="gr-lbl" textAnchor="end">{b.lbl}</text>
              <rect x={x1} y={y} width={Math.max(x2 - x1, 1.5)} height={alturaBarra} rx="2"
                className={"gr-barra " + b.tipo} />
              <text x={x2 + 7} y={y + alturaBarra / 2 + 4} className="gr-val">
                {b.val < 0 ? "−" : ""}{curto(Math.abs(b.val))}
              </text>
              {i < barras.length && (
                <line x1={x(b.ate)} y1={y + alturaBarra} x2={x(b.ate)} y2={y + alturaBarra + gap}
                  className="gr-liga" />
              )}
            </g>
          );
        })}
        {(() => {
          const y = T + barras.length * (alturaBarra + gap);
          return (
            <g>
              <text x={L - 10} y={y + alturaBarra / 2 + 4} className="gr-lbl forte" textAnchor="end">
                Lucro líquido
              </text>
              <rect x={L} y={y} width={Math.max(x(Math.abs(corrente)) - L, 1.5)} height={alturaBarra} rx="2"
                className={"gr-barra " + (corrente >= 0 ? "final" : "sai")} />
              <text x={x(Math.abs(corrente)) + 7} y={y + alturaBarra / 2 + 4} className="gr-val forte">
                {curto(corrente)}
              </text>
            </g>
          );
        })()}
      </svg>
    </figure>
  );
}

/* ---------- Evolução mensal ---------- */

export function Evolucao({ serie }) {
  if (serie.length < 2) return null;
  const W = 720, H = 260, L = 58, R = 18, T = 16, B = 44;
  const teto = Math.max(...serie.map((p) => Math.max(p.receitaLiq, p.despesas)), 1);
  const piso = Math.min(...serie.map((p) => p.liquido), 0);
  const escalaY = (v) => T + (H - T - B) * (1 - (v - piso) / (teto - piso || 1));
  const passo = (W - L - R) / serie.length;
  const larguraBarra = Math.min(passo * 0.32, 26);

  const pontos = serie.map((p, i) => `${L + passo * (i + 0.5)},${escalaY(p.liquido)}`).join(" ");

  return (
    <figure className="gr">
      <figcaption>
        Receita líquida e despesas por competência, com o lucro líquido em linha. A distância
        entre a barra clara e a escura é o que sobrou no mês.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img"
        aria-label={`Evolução mensal de ${serie.length} competências.`}>
        <line x1={L} y1={escalaY(0)} x2={W - R} y2={escalaY(0)} className="gr-eixo" />
        <text x={L - 8} y={escalaY(teto) + 4} className="gr-tick" textAnchor="end">{curto(teto)}</text>
        <text x={L - 8} y={escalaY(0) + 4} className="gr-tick" textAnchor="end">0</text>

        {serie.map((p, i) => {
          const cx = L + passo * (i + 0.5);
          const y0 = escalaY(0);
          return (
            <g key={p.competencia}>
              <rect x={cx - larguraBarra - 2} y={escalaY(p.receitaLiq)} width={larguraBarra}
                height={Math.max(y0 - escalaY(p.receitaLiq), 1)} rx="2" className="gr-barra receita" />
              <rect x={cx + 2} y={escalaY(p.despesas)} width={larguraBarra}
                height={Math.max(y0 - escalaY(p.despesas), 1)} rx="2" className="gr-barra despesa" />
              <text x={cx} y={H - B + 20} className="gr-tick" textAnchor="middle">
                {competenciaLegivel(p.competencia)}
              </text>
            </g>
          );
        })}

        <polyline points={pontos} className="gr-linha" fill="none" />
        {serie.map((p, i) => (
          <circle key={p.competencia} cx={L + passo * (i + 0.5)} cy={escalaY(p.liquido)} r="4"
            className={"gr-ponto " + (p.liquido < 0 ? "neg" : "")} />
        ))}
      </svg>
      <div className="gr-legenda">
        <span><i className="chip receita" />Receita líquida</span>
        <span><i className="chip despesa" />Despesas</span>
        <span><i className="chip linha" />Lucro líquido</span>
      </div>
    </figure>
  );
}

/* ---------- Ranking de despesas ---------- */

export function RankingDespesas({ itens, base }) {
  if (!itens.length) return null;
  const teto = itens[0].valor || 1;
  return (
    <figure className="gr">
      <figcaption>
        Para onde foi o dinheiro, da maior para a menor linha. O percentual é sobre a receita
        líquida do período.
      </figcaption>
      <div className="ranking">
        {itens.map((it) => (
          <div className="ranking-linha" key={it.id}>
            <span className="ranking-nome">{it.nome}</span>
            <div className="ranking-trilho">
              <div className="ranking-barra" style={{ width: `${(it.valor / teto) * 100}%` }} />
            </div>
            <span className="ranking-val">{brl(it.valor)}</span>
            <span className="ranking-pct">{base ? pct(it.valor / base) : "—"}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
