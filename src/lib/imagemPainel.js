/* Imagem PNG do painel — um retrato de indicadores, cascata, evolução e
 * ranking, para baixar ou guardar como registro do mês.
 *
 * Desenhado em <canvas>, não capturado do DOM. Capturar a tela exigiria
 * uma biblioteca de "screenshot" (html2canvas ou parecido, ~50 kB) e
 * ainda assim tropeçaria nas variáveis CSS e nas transformações 3D das
 * torres patrimoniais, que a maioria dessas bibliotecas não resolve
 * direito. Desenhar do zero, a partir dos mesmos dados computados que
 * alimentam a tela (`indicadores.js`), é mais previsível, mais leve, e
 * usa exatamente a mesma fonte de verdade — a cascata daqui é
 * `cascataPassos()`, a mesma função que desenha o SVG da tela.
 *
 * O que NÃO entra na imagem: as torres patrimoniais 3D. A perspectiva é
 * feita de transformação CSS interativa; um retrato estático dela exigiria
 * reimplementar a projeção 3D em canvas só para uma imagem, o que não
 * paga o esforço. A imagem cobre indicadores, cascata, evolução e ranking
 * — o que já é a leitura completa do período em formato estático.
 */

import { brl, competenciaLegivel, pct } from "./parse.js";
import { cascataPassos } from "./indicadores.js";

const PALETAS = {
  claro: {
    fundo: "#FBFAF7", papel: "#FFFFFF", tinta: "#1E211D", tinta2: "#6B7268",
    regua: "#E4E1D8", reguaForte: "#C9C4B5",
    marca: "#5D6EE0", positivo: "#2F8558", negativo: "#C0433D",
    barraPos: "#3E8C67", barraNeg: "#B14B45", barraNivel: "#5D6EE0", atencao: "#B8863B",
  },
  escuro: {
    fundo: "#101613", papel: "#182019", tinta: "#E7EDE6", tinta2: "#93A29A",
    regua: "#2A342C", reguaForte: "#3D4A40",
    marca: "#97A6FF", positivo: "#4FB985", negativo: "#E4706B",
    barraPos: "#3E8C67", barraNeg: "#A8514D", barraNivel: "#5A6BD6", atencao: "#D3A855",
  },
};

const curto = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace(".", ",") + " bi";
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(".", ",") + " mi";
  if (a >= 1e3) return s + Math.round(a / 1e3) + " mil";
  return s + Math.round(a).toString();
};

/** Layout do painel em blocos — pura função de dados para posições,
 *  separada do desenho em si. É a parte testável sem canvas: dado o
 *  mesmo conjunto de indicadores, sempre produz as mesmas linhas e
 *  colunas, então um teste pode conferir a montagem sem precisar
 *  renderizar nada. */
export function montarLayoutPainel({ indicadores, larguraColuna = 320 }) {
  const porLinha = 3;
  const linhas = Math.ceil(indicadores.length / porLinha);
  return {
    porLinha,
    linhas,
    largura: porLinha * larguraColuna,
    altura: linhas * 92,
    celulas: indicadores.map((ind, i) => ({
      ...ind,
      col: i % porLinha,
      linha: Math.floor(i / porLinha),
    })),
  };
}

function arred(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function desenharIndicadores(ctx, layout, pal, top) {
  const larguraCel = layout.largura / layout.porLinha;
  layout.celulas.forEach((c) => {
    const x = 24 + c.col * larguraCel;
    const y = top + c.linha * 92;
    const w = larguraCel - 14;
    ctx.fillStyle = pal.papel;
    arred(ctx, x, y, w, 78, 8);
    ctx.fill();
    ctx.strokeStyle = pal.regua;
    ctx.lineWidth = 1;
    ctx.stroke();
    const cor = c.tone === "ok" ? pal.positivo : c.tone === "bad" ? pal.negativo : pal.reguaForte;
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, 3, 78);

    ctx.fillStyle = pal.tinta2;
    ctx.font = "600 10.5px Arial";
    ctx.fillText(c.k.toUpperCase(), x + 16, y + 21);

    ctx.fillStyle = c.tone === "bad" ? pal.negativo : pal.tinta;
    ctx.font = "600 19px Arial";
    ctx.fillText(c.texto, x + 16, y + 46);

    if (c.sub) {
      ctx.fillStyle = pal.tinta2;
      ctx.font = "11px Arial";
      quebrarLinha(ctx, c.sub, x + 16, y + 63, w - 30, 13);
    }
  });
  return top + layout.altura + 16;
}

function quebrarLinha(ctx, texto, x, y, larguraMax, altLinha) {
  const palavras = texto.split(" ");
  let linha = "", ly = y, linhas = 0;
  for (const p of palavras) {
    const teste = linha ? linha + " " + p : p;
    if (ctx.measureText(teste).width > larguraMax && linha) {
      ctx.fillText(linha, x, ly);
      linha = p; ly += altLinha; linhas++;
      if (linhas >= 2) return;
    } else linha = teste;
  }
  if (linha) ctx.fillText(linha, x, ly);
}

function desenharCascata(ctx, dre, pal, x, top, largura) {
  const { passos, liquido } = cascataPassos(dre);
  const L = 150, alturaBarra = 26, gap = 9;
  const larguraUtil = largura - L - 90;
  const teto = Math.max(dre.receitaBruta, liquido, 1);
  const px = (v) => x + L + (v / teto) * larguraUtil;
  const cor = { base: pal.barraNivel, entra: pal.barraPos, sai: pal.barraNeg, final: pal.positivo };

  ctx.font = "600 13px Arial";
  ctx.fillStyle = pal.tinta;
  ctx.fillText("Cascata do resultado", x, top);
  let y = top + 22;

  [...passos, { lbl: "Lucro líquido", de: 0, ate: liquido, tipo: liquido >= 0 ? "final" : "sai", final: true }]
    .forEach((b) => {
      const x1 = px(Math.min(b.de, b.ate));
      const x2 = px(Math.max(b.de, b.ate));
      ctx.textAlign = "right";
      ctx.font = b.final ? "600 11.5px Arial" : "11.5px Arial";
      ctx.fillStyle = b.final ? pal.tinta : pal.tinta2;
      ctx.fillText(b.lbl, x + L - 10, y + alturaBarra / 2 + 4);

      ctx.fillStyle = cor[b.tipo] || pal.barraNivel;
      arred(ctx, x1, y, Math.max(x2 - x1, 2), alturaBarra, 2);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.font = "11px Arial";
      ctx.fillStyle = pal.tinta2;
      ctx.fillText(curto(b.ate - b.de), x2 + 8, y + alturaBarra / 2 + 4);

      y += alturaBarra + gap;
    });

  return y + 8;
}

function desenharEvolucao(ctx, serie, pal, x, top, largura, altura) {
  ctx.font = "600 13px Arial";
  ctx.fillStyle = pal.tinta;
  ctx.fillText("Evolução mensal", x, top);

  const L = 54, T = top + 18, alturaGrafico = altura - 40;
  const teto = Math.max(...serie.map((p) => Math.max(p.receitaLiq, p.despesas)), 1);
  const piso = Math.min(...serie.map((p) => p.liquido), 0);
  const y = (v) => T + alturaGrafico * (1 - (v - piso) / (teto - piso || 1));
  const passo = (largura - L - 10) / serie.length;
  const larguraBarra = Math.min(passo * 0.3, 22);

  ctx.strokeStyle = pal.reguaForte;
  ctx.beginPath(); ctx.moveTo(x + L, y(0)); ctx.lineTo(x + largura - 10, y(0)); ctx.stroke();

  const pontos = serie.map((p, i) => [x + L + passo * (i + 0.5), y(p.liquido)]);

  serie.forEach((p, i) => {
    const cx = x + L + passo * (i + 0.5);
    const y0 = y(0);
    ctx.fillStyle = pal.marca;
    ctx.fillRect(cx - larguraBarra - 2, y(p.receitaLiq), larguraBarra, Math.max(y0 - y(p.receitaLiq), 1));
    ctx.fillStyle = pal.barraNeg;
    ctx.fillRect(cx + 2, y(p.despesas), larguraBarra, Math.max(y0 - y(p.despesas), 1));
    ctx.fillStyle = pal.tinta2;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(competenciaLegivel(p.competencia), cx, T + alturaGrafico + 16);
  });

  ctx.strokeStyle = pal.tinta;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pontos.forEach(([px2, py2], i) => (i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2)));
  ctx.stroke();
  ctx.lineWidth = 1;
  pontos.forEach(([px2, py2], i) => {
    ctx.fillStyle = serie[i].liquido < 0 ? pal.negativo : pal.tinta;
    ctx.beginPath(); ctx.arc(px2, py2, 3.2, 0, Math.PI * 2); ctx.fill();
  });

  ctx.textAlign = "left";
  return top + altura + 8;
}

function desenharRanking(ctx, itens, base, pal, x, top, largura) {
  ctx.font = "600 13px Arial";
  ctx.fillStyle = pal.tinta;
  ctx.fillText("Composição das despesas", x, top);

  const L = 210, alturaLinha = 24;
  const teto = itens[0]?.valor || 1;
  const larguraBarra = largura - L - 150;
  let y = top + 20;
  itens.slice(0, 8).forEach((it) => {
    ctx.textAlign = "right";
    ctx.font = "11.5px Arial";
    ctx.fillStyle = pal.tinta;
    quebrarLinha(ctx, it.nome, x + L - 10, y + 14, L - 20, 12);

    ctx.fillStyle = pal.regua;
    arred(ctx, x + L, y + 4, larguraBarra, 9, 2); ctx.fill();
    ctx.fillStyle = pal.barraNeg;
    arred(ctx, x + L, y + 4, Math.max((it.valor / teto) * larguraBarra, 3), 9, 2); ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = pal.tinta2;
    ctx.font = "11px Arial";
    ctx.fillText(`${brl(it.valor)}  ·  ${base ? pct(it.valor / base) : "—"}`, x + L + larguraBarra + 10, y + 14);

    y += alturaLinha;
  });
  return y + 8;
}

/** Monta o canvas inteiro e devolve um Blob PNG.
 *  `tema` é "claro" ou "escuro" — a imagem usa cores concretas, não
 *  variáveis CSS, porque um arquivo exportado precisa se bastar sozinho. */
export async function gerarImagemPainel({
  empresa, periodo, indicadores, dre, serie, despesas, tema = "claro",
}) {
  const pal = PALETAS[tema] || PALETAS.claro;
  const largura = 1000;
  const layout = montarLayoutPainel({ indicadores });

  const alturaCascata = (cascataPassos(dre).passos.length + 1) * 35 + 40;
  const alturaEvolucao = serie.length >= 2 ? 230 : 0;
  const alturaRanking = despesas.length ? Math.min(despesas.length, 8) * 24 + 40 : 0;
  const altura = 108 + layout.altura + 24 + alturaCascata +
    (alturaEvolucao ? alturaEvolucao + 16 : 0) + (alturaRanking ? alturaRanking + 16 : 0) + 48;

  const canvas = document.createElement("canvas");
  const escala = 2; // retina — a imagem exportada precisa ficar nítida ao ampliar
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);

  ctx.fillStyle = pal.fundo;
  ctx.fillRect(0, 0, largura, altura);

  ctx.fillStyle = pal.tinta2;
  ctx.font = "600 10.5px Arial";
  ctx.fillText("PAINEL · GERADOR DE DRE", 24, 30);
  ctx.fillStyle = pal.tinta;
  ctx.font = "600 22px Arial";
  ctx.fillText(empresa || "Resultado do período", 24, 58);
  if (periodo) {
    ctx.fillStyle = pal.tinta2;
    ctx.font = "13px Arial";
    ctx.textAlign = "right";
    ctx.fillText(periodo, largura - 24, 58);
    ctx.textAlign = "left";
  }
  ctx.strokeStyle = pal.regua;
  ctx.beginPath(); ctx.moveTo(24, 74); ctx.lineTo(largura - 24, 74); ctx.stroke();

  let y = desenharIndicadores(ctx, layout, pal, 96);
  y = desenharCascata(ctx, dre, pal, 24, y + 12, largura - 48) + 12;
  if (serie.length >= 2) y = desenharEvolucao(ctx, serie, pal, 24, y, largura - 48, 210) + 12;
  if (despesas.length) desenharRanking(ctx, despesas, dre.receitaLiq, pal, 24, y, largura - 48);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function baixarImagemPainel(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
