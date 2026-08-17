/* Ícones — SVG inline, não biblioteca.
 *
 * Um pacote de ícones (lucide, heroicons) custaria dezenas de kB e um
 * import a mais por tela, para desenhar dezoito formas. Aqui cada ícone é
 * um `<path>` de traço em `currentColor`, então ele herda a cor do item
 * da navegação — inclusive no tema escuro — sem nenhuma regra extra.
 *
 * Traço, nunca preenchimento: ícone chapado em cor de marca competiria
 * com o verde/vermelho do dado, que neste projeto é o único lugar onde
 * cor significa alguma coisa.
 */

const D = {
  inicio: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6",
  importar: "M12 15V3m0 0L8 7m4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4",
  conferir: "M12 4v16M5 8h14M8 8l-3 6h6zM19 8l-3 6h6z",
  classificar: "M4 6h10M4 12h7M4 18h10M17 9l3 3-3 3",
  dre: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7M9 8h3",
  painel: "M4 20V10M9.5 20V4M15 20v-7M20.5 20v-4",
  balanco: "M4 4h7v16H4zM13 4h7v16h-7z",
  horizontal: "M3 17l5-5 4 3 8-8M16 7h5v5",
  comparativo: "M5 20V9h4v11zM15 20V4h4v16zM10 20V13h4v7z",
  depara: "M4 8h11m0 0-3-3m3 3-3 3M20 16H9m0 0 3-3m-3 3 3 3",
  historico: "M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4M12 8v4.5l3 2",
  arquivos: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  cpc51: "M12 3l2.4 5.2 5.6.7-4.2 3.9 1.2 5.6L12 15.7 6.9 18.4l1.2-5.6L4 8.9l5.6-.7z",
  plano: "M4 6h3v3H4zM4 15h3v3H4zM10 7.5h10M10 16.5h10M4.6 7.5l.9.9 1.6-1.9",
  sol: "M12 6.5A5.5 5.5 0 1 0 12 17.5 5.5 5.5 0 1 0 12 6.5M12 1.5v2.5M12 20v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M1.5 12H4M20 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8",
  lua: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  fechar: "M6 6l12 12M18 6 6 18",
  lixo: "M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10.5 11v5M13.5 11v5",
  recolher: "M14.5 6 9 12l5.5 6",
  expandir: "M9.5 6l5.5 6-5.5 6",
  seta: "M5 12h13m0 0-5-5m5 5-5 5",
  aviso: "M12 4.5 21 19.5H3zM12 10v4.5M12 17.2v.1",
  ok: "M4.5 12.5 9.5 17.5 19.5 6.5",
};

export function Icone({ nome, tamanho = 18, className = "" }) {
  const d = D[nome];
  if (!d) return null;
  return (
    <svg
      className={"ico " + className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
