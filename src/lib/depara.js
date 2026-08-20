/* O De-Para — a tabela de parametrização do plano de contas.
 *
 * O QUE É: uma linha por conta de resultado, dizendo de onde ela vem
 * (código e descrição no plano do cliente) e para onde ela vai nos dois
 * eixos que o app conhece — o GRUPO da DRE atual e a CATEGORIA do
 * CPC 51 —, com a origem de cada decisão registrada ao lado.
 *
 * POR QUE UM MÓDULO PRÓPRIO, se `classify.js` já decide o grupo e
 * `cpc51.js` já decide a categoria: porque a pergunta "para onde vai
 * esta conta?" era respondida em duas telas diferentes, e nenhuma das
 * duas mostrava a resposta inteira. Quem parametriza um ERP (Fase 4 do
 * cronograma) precisa da linha completa: código de origem, destino nas
 * duas estruturas, e quem decidiu. Este módulo é essa linha.
 *
 * ELE NÃO DECIDE NADA. Toda a resolução continua em `classify.js`
 * (via `grupoDe`) e em `cpc51.js` (via `resolverCategoria`). Aqui só se
 * junta, se rotula a ORIGEM e se conta o que falta. Reimplementar
 * qualquer uma das duas decisões aqui criaria uma segunda verdade sobre
 * o destino de uma conta — exatamente o defeito que o projeto inteiro
 * tenta evitar. `depara.test.js` congela o acordo com `deParaCPC51`.
 *
 * A ORIGEM DA DECISÃO É O CAMPO MAIS IMPORTANTE DA TABELA. Sem ela, um
 * mapeamento herdado do padrão e um mapeamento que alguém conferiu
 * conta a conta parecem iguais na planilha — e a auditoria pergunta
 * justamente por essa diferença.
 */

import { NOME_GRUPO, GRUPOS } from "./grupos.js";
import { NOME_CATEGORIA, POLITICA_PADRAO, resolverCategoria, revisarGrupo } from "./cpc51.js";

/** Descrição legível de uma conta: o nome oficial do plano de contas
 *  quando existe, senão o começo do histórico dos lançamentos. É a mesma
 *  regra das outras telas — escrita uma vez aqui para as três não
 *  divergirem no dia em que uma delas mudar o limite de caracteres. */
export function descricaoDaConta(c, nomes = {}) {
  if (nomes[c.conta]) return nomes[c.conta];
  return (c.historico || "").trim().split(",")[0].slice(0, 48);
}

/* As situações são o filtro de trabalho da tela: cada uma responde a uma
   pergunta que alguém faz de verdade ao parametrizar. "Pendente" junta
   as duas formas de trabalho que sobrou — conta sem destino na DRE e
   conta cuja categoria ainda depende de julgamento. */
export const SITUACOES = [
  { id: "todas", nome: "Todas as contas" },
  { id: "pendentes", nome: "Pendentes (sem grupo ou a revisar)" },
  { id: "sem-grupo", nome: "Fora da DRE" },
  { id: "revisar", nome: "Categoria a revisar" },
  { id: "manuais", nome: "Com decisão manual" },
  { id: "automaticas", nome: "Só no automático" },
];

/** A tabela De-Para inteira, uma linha por conta de resultado.
 *
 *  `tocadas` é o mapa de contas cujo grupo foi decidido à mão (ou veio
 *  de um perfil salvo, que é a mesma coisa: alguém já decidiu antes).
 *  `categoriaPorConta` é o equivalente do lado do CPC 51. */
export function montarDePara(contasResultado, {
  grupoDe,
  tocadas = {},
  categoriaPorConta = {},
  politica = POLITICA_PADRAO,
  nomes = {},
} = {}) {
  return contasResultado
    .map((c) => {
      const grupo = grupoDe(c.conta);
      const grupoManual = !!tocadas[c.conta];
      const categoria = resolverCategoria({ conta: c.conta, grupo, categoriaPorConta, politica });
      const categoriaManual = !!categoria && categoriaPorConta[c.conta] === categoria;
      const revisar = grupo === "IGNORAR" || categoriaManual ? null : revisarGrupo(grupo, politica);
      const semGrupo = grupo === "IGNORAR";
      return {
        conta: c.conta,
        descricao: descricaoDaConta(c, nomes),
        saldo: c.saldo,
        deb: c.deb || 0,
        cre: c.cre || 0,
        grupo,
        grupoNome: NOME_GRUPO[grupo] || grupo,
        grupoManual,
        origemGrupo: grupoManual ? "manual" : "sugerido",
        categoria,
        categoriaNome: categoria ? NOME_CATEGORIA[categoria] : "Não entra na DRE",
        categoriaManual,
        origemCategoria: categoriaManual ? "manual" : "padrão do grupo",
        revisar,
        semGrupo,
        pendente: semGrupo || !!revisar,
      };
    })
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
}

/** O placar do trabalho de parametrização.
 *
 *  `completude` conta a conta que TEM destino na DRE e não depende mais
 *  de julgamento — não a conta que simplesmente recebeu algum rótulo.
 *  Um De-Para 100% "preenchido" com metade das contas em "Não entra na
 *  DRE" não está pronto, está escondendo trabalho. */
export function resumoDePara(linhas) {
  const r = {
    total: linhas.length,
    comGrupo: 0,
    semGrupo: 0,
    valorSemGrupo: 0,
    manuaisGrupo: 0,
    manuaisCategoria: 0,
    aRevisar: 0,
    valorARevisar: 0,
    resolvidas: 0,
    pendente: 0,
    completude: 0,
  };
  linhas.forEach((l) => {
    if (l.grupoManual) r.manuaisGrupo++;
    if (l.categoriaManual) r.manuaisCategoria++;
    if (l.semGrupo) { r.semGrupo++; r.valorSemGrupo += Math.abs(l.saldo); return; }
    r.comGrupo++;
    if (l.revisar) { r.aRevisar++; r.valorARevisar += Math.abs(l.saldo); return; }
    r.resolvidas++;
  });
  r.pendente = r.total - r.resolvidas;
  r.completude = r.total ? r.resolvidas / r.total : 0;
  return r;
}

/** Quantas contas cada grupo carrega — a leitura por destino, que é como
 *  quem confere o mapeamento olha a tabela ("as 14 contas de Custos
 *  fazem sentido?"). Só grupos usados aparecem, na ordem da DRE.
 *
 *  `contas` leva junto as linhas que formaram o total, na mesma ordem em
 *  que elas foram somadas. É o que permite abrir o grupo e conferir a
 *  composição sem cruzar duas tabelas — na tela e, no Excel exportado,
 *  como as linhas recolhidas debaixo do grupo. Como o total é acumulado
 *  percorrendo essa mesma lista, "abrir o grupo" nunca pode mostrar uma
 *  composição diferente da que gerou o número. */
export function porGrupo(linhas) {
  const acc = {};
  linhas.forEach((l) => {
    acc[l.grupo] = acc[l.grupo] || { id: l.grupo, nome: l.grupoNome, n: 0, total: 0, aRevisar: 0, contas: [] };
    acc[l.grupo].n++;
    acc[l.grupo].total += l.saldo;
    acc[l.grupo].contas.push(l);
    if (l.revisar) acc[l.grupo].aRevisar++;
  });
  return GRUPOS.filter((g) => acc[g.id]).map((g) => acc[g.id]);
}

/** O filtro da tela. A busca casa código e descrição — e a descrição já
 *  cai no histórico do lançamento quando a conta não tem nome no plano,
 *  então quem só lembra do texto do lançamento também acha. O histórico
 *  inteiro não entra: são até 20 mil caracteres por conta, e varrê-los a
 *  cada tecla digitada travaria a tabela num razão grande. */
export function filtrarDePara(linhas, { busca = "", grupo = "todos", categoria = "todas", situacao = "todas" } = {}) {
  const q = busca.trim().toLowerCase();
  return linhas.filter((l) => {
    if (grupo !== "todos" && l.grupo !== grupo) return false;
    if (categoria !== "todas") {
      const atual = l.categoria || "SEM_CATEGORIA";
      if (atual !== categoria) return false;
    }
    if (situacao === "pendentes" && !l.pendente) return false;
    if (situacao === "sem-grupo" && !l.semGrupo) return false;
    if (situacao === "revisar" && !l.revisar) return false;
    if (situacao === "manuais" && !l.grupoManual && !l.categoriaManual) return false;
    if (situacao === "automaticas" && (l.grupoManual || l.categoriaManual)) return false;
    if (q && !(`${l.conta} ${l.descricao}`.toLowerCase().includes(q))) return false;
    return true;
  });
}
