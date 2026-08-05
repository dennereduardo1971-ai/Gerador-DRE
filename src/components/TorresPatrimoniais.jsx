import { useEffect, useRef, useState } from "react";
import { brl, pct } from "../lib/parse.js";

/* Torres patrimoniais — o único lugar deste projeto onde a terceira
 * dimensão carrega informação em vez de atrapalhar.
 *
 * Por que aqui funciona: o Balanço É duas pilhas de mesma altura. Ativo de
 * um lado, Passivo + PL + resultado do outro, e a igualdade entre as duas
 * é o fato central da contabilidade. Empilhar blocos com volume e
 * perspectiva torna essa igualdade física — dá para ver que as torres
 * terminam no mesmo nível antes de ler qualquer número.
 *
 * Por que NÃO usamos 3D nos outros gráficos: perspectiva distorce
 * comparação. Uma barra mais próxima parece maior que outra de mesmo
 * valor, e num painel financeiro isso não é estilo, é erro de leitura. Os
 * demais gráficos desta tela são 2D e precisos de propósito.
 *
 * Feito com transformações CSS, não com three.js: uma biblioteca 3D
 * custaria mais de 600 kB num app cujo bundle inteiro tem 300, para
 * desenhar caixas. O CSS faz o mesmo com aceleração de GPU e nada de
 * download extra.
 */

const ROT_INICIAL = -26;
const INCLINACAO = 12;

function Bloco({ altura, cor, rotulo, valor, participacao, largura = 132, profundidade = 84 }) {
  const h = Math.max(altura, 3);
  return (
    <div className="bloco" style={{ height: h, "--cor": cor, "--w": `${largura}px`, "--d": `${profundidade}px` }}>
      <div className="face frente" />
      <div className="face lateral" />
      <div className="face topo" />
      {h >= 26 && (
        <div className="bloco-rotulo">
          <b>{rotulo}</b>
          <span>{brl(valor)}</span>
          {participacao != null && <i>{pct(participacao)}</i>}
        </div>
      )}
    </div>
  );
}

function Torre({ titulo, total, blocos, altura, escala }) {
  return (
    <div className="torre">
      <div className="torre-pilha">
        {blocos.map((b) => (
          <Bloco key={b.rotulo} {...b} altura={Math.abs(b.valor) * escala} />
        ))}
      </div>
      <div className="torre-base" style={{ height: Math.max(6, altura * 0.012) }} />
      <div className="torre-legenda">
        <span className="rotulo">{titulo}</span>
        <b>{brl(total)}</b>
      </div>
    </div>
  );
}

export function TorresPatrimoniais({ estrutura }) {
  const [rot, setRot] = useState(ROT_INICIAL);
  const [arrastando, setArrastando] = useState(false);
  const [plano, setPlano] = useState(false);
  const ref = useRef(null);
  const inicio = useRef({ x: 0, rot: 0 });

  // Quem pediu menos movimento recebe a vista de frente, sem perspectiva:
  // a leitura continua completa, só perde o efeito.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => { if (mq.matches) { setPlano(true); setRot(0); } };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    if (!arrastando) return;
    const mover = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setRot(Math.max(-58, Math.min(58, inicio.current.rot + (x - inicio.current.x) * 0.35)));
    };
    const soltar = () => setArrastando(false);
    window.addEventListener("mousemove", mover);
    window.addEventListener("touchmove", mover);
    window.addEventListener("mouseup", soltar);
    window.addEventListener("touchend", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchend", soltar);
    };
  }, [arrastando]);

  const pegar = (e) => {
    if (plano) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    inicio.current = { x, rot };
    setArrastando(true);
  };

  const e = estrutura;
  const maior = Math.max(e.totalAtivo, e.totalPassivo + Math.abs(e.resultadoExercicio));
  const escala = 250 / (maior || 1);

  const ativo = [
    { rotulo: "Não circulante", valor: e.ativoNaoCirculante, cor: "var(--barra-nivel)", participacao: e.ativoNaoCirculante / e.totalAtivo },
    { rotulo: "Circulante", valor: e.ativoCirculante, cor: "var(--marca)", participacao: e.ativoCirculante / e.totalAtivo },
  ];
  const passivo = [
    { rotulo: "Patrimônio líquido", valor: e.patrimonioLiquido, cor: "var(--barra-pos)", participacao: e.patrimonioLiquido / e.totalAtivo },
    { rotulo: "Não circulante", valor: e.passivoNaoCirculante, cor: "var(--barra-neg)", participacao: e.passivoNaoCirculante / e.totalAtivo },
    { rotulo: "Circulante", valor: e.passivoCirculante, cor: "var(--atencao)", participacao: e.passivoCirculante / e.totalAtivo },
  ];
  if (Math.abs(e.resultadoExercicio) > 0.005) {
    passivo.unshift({
      rotulo: "Resultado do exercício",
      valor: e.resultadoExercicio,
      cor: "var(--positivo)",
      participacao: e.resultadoExercicio / e.totalAtivo,
    });
  }

  return (
    <div className="card">
      <div className="bal-cab">
        <div>
          <h2>Estrutura patrimonial</h2>
          <p className="hint" style={{ margin: 0 }}>
            As duas torres terminam na mesma altura: é a igualdade do Balanço, com o resultado do
            exercício empilhado do lado direito porque ainda não foi para o Patrimônio Líquido.
            {!plano && " Arraste para girar."}
          </p>
        </div>
        <button className="btn ghost" onClick={() => { setPlano(!plano); setRot(plano ? ROT_INICIAL : 0); }}>
          {plano ? "Ver em perspectiva" : "Ver de frente"}
        </button>
      </div>

      <div
        ref={ref}
        className="cena"
        data-plano={plano ? "1" : "0"}
        data-arrastando={arrastando ? "1" : "0"}
        onMouseDown={pegar}
        onTouchStart={pegar}
        role="img"
        aria-label={
          `Estrutura patrimonial. Ativo ${brl(e.totalAtivo)}, sendo circulante ${brl(e.ativoCirculante)} ` +
          `e não circulante ${brl(e.ativoNaoCirculante)}. Passivo mais patrimônio líquido ${brl(e.totalPassivo)}, ` +
          `sendo passivo circulante ${brl(e.passivoCirculante)}, não circulante ${brl(e.passivoNaoCirculante)} ` +
          `e patrimônio líquido ${brl(e.patrimonioLiquido)}. Resultado do exercício ${brl(e.resultadoExercicio)}.`
        }
      >
        <div className="palco" style={{ "--rot": `${rot}deg`, "--inc": `${plano ? 0 : INCLINACAO}deg` }}>
          <Torre titulo="Ativo" total={e.totalAtivo} blocos={ativo} escala={escala} altura={e.totalAtivo * escala} />
          <div className="igualdade" aria-hidden="true">=</div>
          <Torre titulo="Passivo + PL" total={e.totalPassivo} blocos={passivo} escala={escala} altura={e.totalPassivo * escala} />
        </div>
      </div>
    </div>
  );
}
