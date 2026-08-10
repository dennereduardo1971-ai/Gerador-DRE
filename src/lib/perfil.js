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
import { IDS_CATEGORIA, POLITICA_PADRAO } from "./cpc51.js";

/* Versão 2: o perfil passou a levar também as decisões do CPC 51 —
 * categoria por conta, política de atividade principal e as MPDA
 * divulgadas. Continuam sendo só DECISÕES, nenhum valor, então a regra
 * de o arquivo poder ser versionado e compartilhado segue valendo.
 *
 * Perfis versão 1 continuam sendo lidos: os campos novos simplesmente
 * chegam vazios. Quem separou juros de mora de rendimento de aplicação
 * em janeiro não deve ter de refazer isso em fevereiro — e essa era a
 * razão de o perfil existir desde o início. */
const VERSAO = 2;
const IDS_VALIDOS = new Set(GRUPOS.map((g) => g.id));
const CATEGORIAS_VALIDAS = new Set(IDS_CATEGORIA);

/** Monta o objeto do perfil a partir do estado atual da classificação.
 *  `classif` são as escolhas manuais; `nomes`, o plano de contas
 *  importado. Só entram contas com grupo reconhecido. */
export function montarPerfil({ nome, classif = {}, nomes = {}, categorias = {}, politica, medidas = [] }) {
  const contas = {};
  for (const [conta, grupo] of Object.entries(classif)) {
    if (IDS_VALIDOS.has(grupo)) contas[conta] = grupo;
  }
  const cats = {};
  for (const [conta, categoria] of Object.entries(categorias)) {
    if (CATEGORIAS_VALIDAS.has(categoria)) cats[conta] = categoria;
  }
  return {
    formato: "gerador-dre/perfil",
    versao: VERSAO,
    nome: nome || "Perfil sem nome",
    criadoEm: new Date().toISOString(),
    contas,
    nomes,
    categorias: cats,
    politica: { ...POLITICA_PADRAO, ...politica },
    medidas,
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

  const categorias = {};
  for (const [conta, categoria] of Object.entries(dados.categorias || {})) {
    if (CATEGORIAS_VALIDAS.has(categoria)) categorias[conta] = categoria;
    else ignoradas++;
  }

  /* Medida sem ajuste nenhum é igual ao próprio subtotal do CPC 51 — não
     é MPDA. Entra a validação estrutural mínima aqui, na leitura do
     arquivo, porque depois disso a medida vai direto para a nota
     explicativa. */
  const medidas = (dados.medidas || []).filter(
    (m) => m && typeof m === "object" && m.nome && m.base && Array.isArray(m.ajustes) && m.ajustes.length
  );

  return {
    ok: true,
    ignoradas,
    perfil: {
      nome: dados.nome || "Perfil sem nome",
      criadoEm: dados.criadoEm || null,
      contas,
      nomes: dados.nomes && typeof dados.nomes === "object" ? dados.nomes : {},
      categorias,
      politica: dados.politica && typeof dados.politica === "object" ? dados.politica : null,
      medidas,
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
