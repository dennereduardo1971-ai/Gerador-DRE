import { brl, pct } from "../lib/parse.js";
import { Canal } from "./Eixo.jsx";

/** Mostra uma linha da DRE. `val` já deve vir no sinal contábil real da
 *  linha (negativo para despesa/dedução, positivo para receita) — quem
 *  chama decide o sinal, não este componente. Isso importa porque um grupo
 *  "de despesa" pode fechar líquido positivo num mês em que reversões
 *  superam provisões novas (ex. Provisões/Reversões de PCLD), e nesse caso
 *  a linha tem que aparecer positiva de verdade, não forçada em parênteses.
 *
 *  `escala`, `inicio`, `fim` e `nivel` alimentam a coluna-canal (a cascata
 *  da receita até o lucro) — são só apresentação, calculados em EtapaDRE. */
export function Linha({ lbl, val, tipo, base, escala, inicio, fim, nivel }) {
  return (
    <div className="line" data-k={tipo || ""}>
      <div className="lbl">{lbl}</div>
      <Canal escala={escala} inicio={inicio} fim={fim} nivel={nivel} />
      <div className={"val " + (val < 0 ? "neg" : "")}>
        {val < 0 ? "(" + brl(Math.abs(val)) + ")" : brl(val)}
      </div>
      <div className="av">{pct(val / base)}</div>
    </div>
  );
}

export function Secao({ nome }) {
  return (
    <div className="line" data-k="secao">
      <div className="lbl">{nome}</div>
      <div className="canal" />
      <div className="val" />
      <div className="av" />
    </div>
  );
}

/** Cabeçalho das colunas — nomeia o canal para quem vê a tela pela
 *  primeira vez e não sabe o que a barra está medindo. */
export function Cabecalho() {
  return (
    <div className="line" data-k="cab">
      <div className="lbl">Linha</div>
      <div className="canal-legenda"><span>0</span><span>receita bruta</span></div>
      <div className="val">Valor (R$)</div>
      <div className="av">% RL</div>
    </div>
  );
}

export function Detalhe({ dre, id, nomes, base, mostrar }) {
  if (!mostrar) return null;
  return dre.bal[id].contas.slice(0, 40).map((c) => (
    <div className="line" data-k="det" key={id + c.conta}>
      <div className="lbl">
        <span className="code">{c.conta}</span>{" "}
        {nomes[c.conta] || (c.historico.trim().split(",")[0] || "").slice(0, 42)}
      </div>
      <div className="canal" />
      <div className="val">{brl(c.val)}</div>
      <div className="av">{pct(c.val / base)}</div>
    </div>
  ));
}
