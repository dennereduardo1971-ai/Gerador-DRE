/* Perfil de classificação: o mapa conta → grupo da DRE como um arquivo
 * que se salva, se reimporta e se leva para outro computador.
 *
 * Sem isto, o trabalho manual de classificar contas era descartável: se o
 * usuário arrumava 30 contas na mão em janeiro, em fevereiro arrumava as
 * mesmas 30 de novo, porque importar um razão novo zerava tudo. O perfil
 * transforma esse trabalho num ativo — e é também o caminho para atender
 * um plano de contas que não seja o do IESB sem tocar em classify.js.
 *
 * O perfil guarda SÓ decisões (código da conta → grupo) e nomes de conta.
 * Nenhum valor, nenhum lançamento, nenhum dado financeiro — de propósito:
 * assim o arquivo pode ser compartilhado ou versionado sem carregar
 * número de cliente nenhum. */

import { GRUPOS } from "./grupos.js";

const VERSAO = 1;
const IDS_VALIDOS = new Set(GRUPOS.map((g) => g.id));

/** Monta o objeto do perfil a partir do estado atual da classificação.
 *  `classif` são as escolhas manuais; `nomes`, o plano de contas
 *  importado. Só entram contas com grupo reconhecido. */
export function montarPerfil({ nome, classif = {}, nomes = {} }) {
  const contas = {};
  for (const [conta, grupo] of Object.entries(classif)) {
    if (IDS_VALIDOS.has(grupo)) contas[conta] = grupo;
  }
  return {
    formato: "gerador-dre/perfil",
    versao: VERSAO,
    nome: nome || "Perfil sem nome",
    criadoEm: new Date().toISOString(),
    contas,
    nomes,
  };
}

/** Lê e valida um perfil vindo de arquivo. Devolve { ok, perfil, erro }
 *  em vez de lançar, porque isto responde a um arquivo escolhido pelo
 *  usuário — que pode ser qualquer coisa. */
export function lerPerfil(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse arquivo não é um JSON válido." };
  }
  if (!dados || dados.formato !== "gerador-dre/perfil") {
    return { ok: false, erro: "Esse arquivo não é um perfil de classificação do Gerador de DRE." };
  }
  if (dados.versao > VERSAO) {
    return { ok: false, erro: "Esse perfil foi salvo por uma versão mais nova do app." };
  }

  const contas = {};
  let ignoradas = 0;
  for (const [conta, grupo] of Object.entries(dados.contas || {})) {
    if (IDS_VALIDOS.has(grupo)) contas[conta] = grupo;
    else ignoradas++;
  }

  return {
    ok: true,
    ignoradas,
    perfil: {
      nome: dados.nome || "Perfil sem nome",
      criadoEm: dados.criadoEm || null,
      contas,
      nomes: dados.nomes && typeof dados.nomes === "object" ? dados.nomes : {},
    },
  };
}

/** Quantas contas do perfil se aplicam ao razão aberto agora — o número
 *  que responde "esse perfil serve para este arquivo?" antes de aplicar. */
export function cobertura(perfil, contasResultado = []) {
  const presentes = contasResultado.filter((c) => perfil.contas[c.conta]).length;
  return { presentes, total: contasResultado.length, noPerfil: Object.keys(perfil.contas).length };
}

export function baixarPerfil(perfil) {
  const nomeArquivo = `perfil-dre_${(perfil.nome || "sem-nome").replace(/\W+/g, "_")}.json`;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(perfil, null, 2)], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
