/** Primitivas visuais do eixo compartilhado.
 *
 *  Só apresentação: nada aqui calcula contabilidade, tudo recebe
 *  número pronto de quem chama. O eixo é o mesmo nas quatro telas
 *  que o usam (DRE, Conferir, CPC 51) — é isso que
 *  faz o app parecer um produto só, e não quatro relatórios.
 */

/** Converte um valor para a posição percentual dentro da escala. */
function posicao(v, escala) {
  const amplitude = escala.max - escala.min;
  if (!amplitude) return 0;
  return ((v - escala.min) / amplitude) * 100;
}

/** Um segmento da cascata da DRE.
 *
 *  - `inicio`/`fim`: a linha move o saldo corrente de um ponto ao
 *    outro (dedução e custo andam pra esquerda, receita pra direita).
 *  - `nivel`: subtotal — barra cheia do zero até o valor, mostrando
 *    quanto sobrou da receita naquele ponto da demonstração.
 */
export function Canal({ escala, inicio, fim, nivel }) {
  if (!escala) return <div className="canal" />;

  const zero = posicao(0, escala);
  let a, b, direcao;

  if (nivel != null) {
    a = zero;
    b = posicao(nivel, escala);
    direcao = "nivel";
  } else {
    a = posicao(inicio, escala);
    b = posicao(fim, escala);
    direcao = fim >= inicio ? "pos" : "neg";
  }

  const esquerda = Math.min(a, b);
  const largura = Math.abs(b - a);

  // fundo pálido = quanto da receita ainda havia ANTES desta linha.
  // Sem ele, a mordida vermelha de uma dedução flutua no vazio e não
  // dá pra ver de onde ela está tirando.
  const nivelAnterior = nivel != null ? null : posicao(inicio, escala);

  return (
    <div className="canal" aria-hidden="true">
      {nivelAnterior != null && (
        <div
          className="canal-fundo"
          style={{
            left: `${Math.min(zero, nivelAnterior)}%`,
            width: `${Math.abs(nivelAnterior - zero)}%`,
          }}
        />
      )}
      <div className="canal-zero" style={{ left: `${zero}%` }} />
      <div
        className="canal-barra"
        data-d={direcao}
        style={{ left: `${esquerda}%`, width: `${largura}%` }}
      />
    </div>
  );
}

/** Partidas dobradas como fato visual: dois braços do mesmo eixo.
 *  Quando bate, os braços têm exatamente o mesmo comprimento — dá pra
 *  ver que fecha antes de ler o número. O trecho que sobra de um lado
 *  (a diferença) é o único pedaço colorido em vermelho: é literalmente
 *  o que não fecha. */
export function Balanca({ esquerda, direita, rotuloEsq, rotuloDir }) {
  const teto = Math.max(Math.abs(esquerda), Math.abs(direita)) || 1;
  const le = (Math.abs(esquerda) / teto) * 50;
  const ld = (Math.abs(direita) / teto) * 50;
  const menor = Math.min(le, ld);

  return (
    <div className="balanca">
      <div className="balanca-trilho" aria-hidden="true">
        <div className="balanca-barra" data-lado="d" style={{ width: `${le}%` }} />
        {le > menor && (
          <div className="balanca-excedente"
            style={{ right: `calc(${50 + menor}% + 3px)`, width: `${le - menor}%` }} />
        )}
        <div className="balanca-barra" data-lado="c" style={{ width: `${ld}%` }} />
        {ld > menor && (
          <div className="balanca-excedente"
            style={{ left: `calc(${50 + menor}% + 3px)`, width: `${ld - menor}%` }} />
        )}
        <div className="balanca-eixo" />
      </div>
      <div className="balanca-legenda">
        <span>{rotuloEsq}</span>
        <span>{rotuloDir}</span>
      </div>
    </div>
  );
}
