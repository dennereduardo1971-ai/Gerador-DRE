/* O De-Para — a tabela de parametrização do plano de contas.
 *
 * O QUE É: uma linha por conta de resultado, dizendo de onde ela vem
 * (código e descrição no plano do cliente) e para onde ela vai nos três
 * eixos que o app conhece — o GRUPO da DRE atual, a CATEGORIA do
 * CPC 51 e a MODALIDADE de ensino (Presencial / EAD / Comum) —, com a
 * origem de cada decisão registrada ao lado.
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

import { GRUPOS } from "./grupos.js";
import { CATALOGO_PADRAO, RESIDUAL, nomeDaModalidade, origemModalidade } from "./modalidade.js";
import { POLITICA_PADRAO, categoriaDoPlano, resolverCategoria, revisarGrupo } from "./cpc51.js";
import { nomeDaCategoria51, nomeDaConta, nomeDoGrupo } from "./rotulos.js";

/** Descrição legível de uma conta. A regra inteira mora em
 *  `rotulos.nomeDaConta` (apelido do usuário > nome do plano > histórico);
 *  isto aqui é só o atalho que recebe a CONTA em vez do código, porque é
 *  assim que as telas e as exportações já chamavam. */
export function descricaoDaConta(c, nomes = {}, rotulos = null) {
  return nomeDaConta(c.conta, nomes, rotulos, c.historico);
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
  { id: "sem-modalidade", nome: "Sem modalidade (comum)" },
  { id: "automaticas", nome: "Só no automático" },
  { id: "com-movimento", nome: "Com movimento no período" },
  { id: "sem-movimento", nome: "Sem movimento no período" },
];

/** A tabela De-Para inteira, uma linha por conta de resultado.
 *
 *  `tocadas` é o mapa de contas cujo grupo foi decidido à mão (ou veio
 *  de um perfil salvo, que é a mesma coisa: alguém já decidiu antes).
 *  `categoriaPorConta` é o equivalente do lado do CPC 51 — e `plano`,
 *  quando o plano de contas embutido tem exceção conta a conta
 *  (`categoriaDoPlano`), resolve exatamente do mesmo jeito que uma
 *  decisão manual: a conta sai da fila de "a revisar", porque alguém
 *  já julgou aquela conta antes — só não nesta sessão. */
export function montarDePara(contasResultado, {
  grupoDe,
  tocadas = {},
  categoriaPorConta = {},
  politica = POLITICA_PADRAO,
  nomes = {},
  plano = null,
  modalidadeDe = () => "COMUM",
  modalidadePorConta = {},
  sugestaoModalidade = {},
  /* O catálogo vem junto do resolvedor (`modalidadeDe.catalogo`) quando
     ele existe: são a mesma decisão, e passar os dois por caminhos
     diferentes deixaria a tabela nomear uma faixa que o resolvedor não
     conhece. */
  catalogo = modalidadeDe.catalogo || CATALOGO_PADRAO,
  rotulos = null,
} = {}) {
  return contasResultado
    .map((c) => {
      const grupo = grupoDe(c.conta);
      const grupoManual = !!tocadas[c.conta];
      const categoria = resolverCategoria({ conta: c.conta, grupo, categoriaPorConta, politica, plano });
      const categoriaManual = !!categoria && categoriaPorConta[c.conta] === categoria;
      const categoriaDoPlanoAtivo = !categoriaManual && !!categoriaDoPlano(plano, c.conta);
      const revisar =
        grupo === "IGNORAR" || categoriaManual || categoriaDoPlanoAtivo
          ? null
          : revisarGrupo(grupo, politica);
      const semGrupo = grupo === "IGNORAR";
      const modalidade = modalidadeDe(c.conta);
      return {
        conta: c.conta,
        descricao: descricaoDaConta(c, nomes, rotulos),
        /* O nome que veio do plano, ao lado do que está sendo exibido: é
           o que deixa o usuário renomear sem perder de vista o que o
           sistema contábil chama aquela conta — e é por ele, não pelo
           apelido, que a classificação automática continua decidindo. */
        descricaoOriginal: nomes[c.conta] || "",
        apelido: rotulos?.contas?.[c.conta] || "",
        saldo: c.saldo,
        deb: c.deb || 0,
        cre: c.cre || 0,
        /* Conta sem movimento no período. Ela está aqui de propósito: o
           De-Para é cadastro, e cadastrar a conta ANTES do primeiro mês
           em que ela tem saldo é justamente o que evita a surpresa
           depois. Mas ela não é o mesmo tipo de pendência que uma conta
           com dinheiro parado fora da DRE — por isso o placar separa as
           duas, e a tela deixa esconder estas. */
        semMovimento: !!c.semMovimento,
        grupo,
        grupoNome: nomeDoGrupo(grupo, rotulos),
        grupoManual,
        origemGrupo: grupoManual ? "manual" : "sugerido",
        categoria,
        categoriaNome: categoria ? nomeDaCategoria51(categoria, rotulos) : "Não entra na DRE",
        categoriaManual,
        origemCategoria: categoriaManual ? "manual" : categoriaDoPlanoAtivo ? "plano" : "padrão do grupo",
        /* O terceiro eixo. "Comum" NÃO é pendência: a despesa
           administrativa da instituição inteira é comum de verdade, e
           marcá-la como falta de trabalho encheria o placar de tarefa
           que não existe. Por isso a modalidade não entra em
           `pendente` — ela tem filtro próprio, para quem quiser varrer
           as comuns atrás de uma que deveria estar segregada. */
        modalidade,
        modalidadeNome: nomeDaModalidade(modalidade, catalogo),
        modalidadeManual: !!modalidadePorConta[c.conta],
        origemModalidade: origemModalidade(c.conta, { modalidadePorConta, sugestao: sugestaoModalidade }),
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
    semMovimento: 0,
    pendenteSemMovimento: 0,
    porModalidade: {},
    segregadas: 0,
    semModalidade: 0,
    manuaisModalidade: 0,
  };
  linhas.forEach((l) => {
    if (l.grupoManual) r.manuaisGrupo++;
    if (l.categoriaManual) r.manuaisCategoria++;
    if (l.modalidadeManual) r.manuaisModalidade++;
    /* O placar conta por FAIXA, não por nome cravado: com o catálogo
       editável, "Presencial" e "EAD" podem ter sido renomeados, e
       modalidade nova entra sem ninguém mexer aqui. */
    r.porModalidade[l.modalidade] = (r.porModalidade[l.modalidade] || 0) + 1;
    if (l.modalidade === RESIDUAL) r.semModalidade++;
    else r.segregadas++;
    if (l.semMovimento) r.semMovimento++;
    const contar = () => { if (l.semMovimento) r.pendenteSemMovimento++; };
    if (l.semGrupo) { r.semGrupo++; r.valorSemGrupo += Math.abs(l.saldo); contar(); return; }
    r.comGrupo++;
    if (l.revisar) { r.aRevisar++; r.valorARevisar += Math.abs(l.saldo); contar(); return; }
    r.resolvidas++;
  });
  r.pendente = r.total - r.resolvidas;
  /* A pendência que custa dinheiro é a da conta COM movimento: é ela que
     está deixando valor fora da demonstração. A conta zerada pendente é
     trabalho de cadastro, não risco na DRE — e é a que aparece em massa
     no dia em que o balancete passa a ser emitido com as zeradas. Separar
     as duas evita que o placar pareça uma regressão nesse dia. */
  r.pendenteComMovimento = r.pendente - r.pendenteSemMovimento;
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
 *  cada tecla digitada travaria a tabela num plano de contas grande. */
export function filtrarDePara(linhas, {
  busca = "", grupo = "todos", categoria = "todas", situacao = "todas", modalidade = "todas",
} = {}) {
  const q = busca.trim().toLowerCase();
  return linhas.filter((l) => {
    if (grupo !== "todos" && l.grupo !== grupo) return false;
    if (categoria !== "todas") {
      const atual = l.categoria || "SEM_CATEGORIA";
      if (atual !== categoria) return false;
    }
    if (modalidade !== "todas" && l.modalidade !== modalidade) return false;
    if (situacao === "sem-modalidade" && l.modalidade !== RESIDUAL) return false;
    if (situacao === "pendentes" && !l.pendente) return false;
    if (situacao === "sem-grupo" && !l.semGrupo) return false;
    if (situacao === "revisar" && !l.revisar) return false;
    if (situacao === "manuais" && !l.grupoManual && !l.categoriaManual) return false;
    if (situacao === "automaticas" && (l.grupoManual || l.categoriaManual)) return false;
    if (situacao === "sem-movimento" && !l.semMovimento) return false;
    if (situacao === "com-movimento" && l.semMovimento) return false;
    if (q && !(`${l.conta} ${l.descricao}`.toLowerCase().includes(q))) return false;
    return true;
  });
}
