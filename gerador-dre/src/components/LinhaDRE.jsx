import { brl, pct } from "../lib/parse.js";

export function Linha({ lbl, val, tipo, sinal, base }) {
  return (
    <div className="line" data-k={tipo || ""}>
      <div className="lbl">{lbl}</div>
      <div className={"val " + (val < 0 && tipo !== "final" ? "neg" : "")}>
        {sinal === "-" ? "(" + brl(Math.abs(val)) + ")" : brl(val)}
      </div>
      <div className="av">{pct(val / base)}</div>
    </div>
  );
}

export function Secao({ nome }) {
  return (
    <div className="line" data-k="secao">
      <div className="lbl">{nome}</div>
      <div className="val" />
      <div className="av" />
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
      <div className="val">{brl(c.val)}</div>
      <div className="av">{pct(c.val / base)}</div>
    </div>
  ));
}
