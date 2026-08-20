import { lerConfigGitHub, buscarArquivo, gravarArquivo } from "./githubApi.js";

const CHAVE = "gerador-dre:historico";
const CHAVE_SHA = "gerador-dre:historico-sha";
const LIMITE = 50;

function ler() {
  try {
    const raw = window.localStorage.getItem(CHAVE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function gravar(lista) {
  try { window.localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* localStorage indisponível */ }
}

function lerSha() {
  try { return window.localStorage.getItem(CHAVE_SHA) || null; } catch { return null; }
}
function gravarSha(sha) {
  try { sha ? window.localStorage.setItem(CHAVE_SHA, sha) : window.localStorage.removeItem(CHAVE_SHA); } catch { /* indisponível */ }
}

/** Lista o histórico de DREs salvas, mais recente primeiro. */
export function listarHistorico() {
  return ler().sort((a, b) => b.criadoEm - a.criadoEm);
}

/** Salva um retrato (snapshot) da DRE atual no histórico local — só os
 *  totais de cada linha, não o razão inteiro, para não pesar o navegador
 *  e o repositório. Grava só localmente; use sincronizar() para mandar
 *  para o GitHub. */
export function salvarNoHistorico({ empresa, cnpj, periodo, dre, chave }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: Date.now(),
    empresa: empresa || "",
    cnpj: cnpj || "",
    periodo: periodo || "",
    chave: chave || "",
    totais: {
      receitaBruta: dre.receitaBruta,
      deducoes: dre.deducoes,
      receitaLiq: dre.receitaLiq,
      resultadoOperBruto: dre.resultadoOperBruto,
      despOper: dre.despOper,
      resultadoFin: dre.resultadoFin,
      resultadoOper: dre.resultadoOper,
      naoOper: dre.naoOper,
      antesIR: dre.antesIR,
      liquido: dre.liquido,
    },
  };
  const lista = [item, ...ler()].slice(0, LIMITE);
  gravar(lista);
  return item;
}

/** Salva um retrato identificado por `chave`, ATUALIZANDO o que já existir
 *  com a mesma chave em vez de criar outro.
 *
 *  É o que permite o histórico se alimentar sozinho ao importar um
 *  balancete. Duas garantias que o salvamento automático precisa dar para
 *  não virar um problema:
 *
 *  1. Reimportar o mesmo mês não duplica a linha — a chave é o período do
 *     próprio arquivo, não o instante do clique.
 *  2. Reclassificar uma conta depois de importado corrige o retrato já
 *     salvo, em vez de deixar no histórico um número que a tela não mostra
 *     mais. Sem isso o salvamento automático congelaria justamente a
 *     versão pré-correção, que é a errada.
 *
 *  A data de criação original é preservada na atualização: ela marca
 *  quando aquele período entrou no histórico, não quando foi recalculado. */
export function salvarOuAtualizar({ empresa, cnpj, periodo, dre, chave }) {
  if (!chave) return null;
  const lista = ler();
  const anterior = lista.find((i) => i.chave === chave);
  const novo = salvarNoHistoricoItem({ empresa, cnpj, periodo, dre, chave });
  if (anterior) {
    novo.id = anterior.id;
    novo.criadoEm = anterior.criadoEm;
    gravar(lista.map((i) => (i.chave === chave ? novo : i)));
  } else {
    gravar([novo, ...lista].slice(0, LIMITE));
  }
  return novo;
}

/** Monta o item sem gravar — usado por salvarOuAtualizar, que decide
 *  sozinho se insere ou substitui. */
function salvarNoHistoricoItem({ empresa, cnpj, periodo, dre, chave }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: Date.now(),
    empresa: empresa || "",
    cnpj: cnpj || "",
    periodo: periodo || "",
    chave: chave || "",
    totais: {
      receitaBruta: dre.receitaBruta,
      deducoes: dre.deducoes,
      receitaLiq: dre.receitaLiq,
      resultadoOperBruto: dre.resultadoOperBruto,
      despOper: dre.despOper,
      resultadoFin: dre.resultadoFin,
      resultadoOper: dre.resultadoOper,
      naoOper: dre.naoOper,
      antesIR: dre.antesIR,
      liquido: dre.liquido,
    },
  };
}

/** Remove um item do histórico local. Se a sincronização com o GitHub
 *  estiver configurada, também sobrescreve o arquivo remoto com a lista
 *  já sem o item — senão, a próxima sincronização traria ele de volta
 *  (a mesclagem normal só faz união, nunca remove). */
export async function removerDoHistorico(id) {
  const lista = ler().filter((i) => i.id !== id);
  gravar(lista);
  const cfg = lerConfigGitHub();
  if (cfg && cfg.token && cfg.owner && cfg.repo) {
    try {
      const remoto = await buscarArquivo(cfg);
      const { sha } = await gravarArquivo(
        cfg, { historico: lista, atualizadoEm: new Date().toISOString() },
        remoto?.sha, "Remove item do histórico de DREs"
      );
      gravarSha(sha);
    } catch {
      // se a remoção remota falhar (sem rede, token expirado etc.), o item
      // já saiu do navegador local; uma sincronização manual mais tarde resolve.
    }
  }
}

function mesclar(local, remoto) {
  const porId = new Map();
  [...remoto, ...local].forEach((item) => porId.set(item.id, item));
  return [...porId.values()].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, LIMITE);
}

/** Sincroniza o histórico local com o arquivo no repositório do GitHub:
 *  busca o que está lá, mescla com o que está só neste navegador (sem
 *  perder nada de nenhum dos dois lados) e regrava tanto local quanto
 *  remoto com o resultado. Precisa de uma configuração salva
 *  (owner/repo/caminho/token) — ver githubApi.js. */
export async function sincronizarHistorico() {
  const cfg = lerConfigGitHub();
  if (!cfg || !cfg.token || !cfg.owner || !cfg.repo) {
    return { ok: false, motivo: "sem-config" };
  }
  const remoto = await buscarArquivo(cfg);
  const mesclado = mesclar(ler(), remoto?.dados?.historico || []);
  const { sha } = await gravarArquivo(
    cfg,
    { historico: mesclado, atualizadoEm: new Date().toISOString() },
    remoto?.sha,
    "Sincroniza histórico de DREs"
  );
  gravar(mesclado);
  gravarSha(sha);
  return { ok: true, quantidade: mesclado.length, quando: Date.now() };
}
