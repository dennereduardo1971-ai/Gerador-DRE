/* Perfil de PLANO DE CONTAS: liga código de conta → grupo da DRE.
 *
 * Antes, o plano de contas do IESB morava dentro de `classify.js` como
 * três constantes cravadas no código-fonte. Isso tinha dois custos: cada
 * cliente novo exigia editar a lógica e refazer o build, e o plano de
 * contas de uma instituição real ficava versionado num repositório
 * público. Aqui o plano vira DADO — um objeto que se descreve, se
 * valida e se carrega de um arquivo.
 *
 * Por que um perfil por código, se já existe o classificador por texto:
 * o texto do histórico é um sinal probabilístico ("PROVISÃO DE IRPJ"
 * casa com provisão E com IRPJ); o código da conta no plano oficial é um
 * fato. Quando o plano é reconhecido, o código manda.
 *
 * Formato:
 *   assinatura — código → trecho que o nome daquela conta-síntese precisa
 *                conter. TODOS precisam bater para o perfil ser aplicado.
 *                Sem isso, um perfil aplicado ao plano de contas errado
 *                distribuiria valores silenciosamente errados.
 *   codigos    — código (conta-síntese ou conta-folha exata) → grupo.
 *                Resolvido do mais específico para o mais genérico:
 *                a conta 3210208 acha "3210208" antes de "32102".
 *   regras     — o que não cabe num mapa de prefixo. Duas formas:
 *                "nome"  → dentro do prefixo P, se o NOME da conta casar
 *                          com o padrão, vai para outro grupo (o caso do
 *                          Prouni morando dentro de Bolsas Estudantis).
 *                "sinal" → dentro do prefixo P, o grupo depende do saldo
 *                          ser credor ou devedor (seções que misturam
 *                          contas de receita e de despesa).
 *                Regras "antes" rodam antes do mapa de códigos; "depois",
 *                só se o mapa não resolveu.
 */

import { GRUPOS } from "./grupos.js";

const IDS_VALIDOS = new Set(GRUPOS.map((g) => g.id));

/** O perfil serve para este plano de contas? Confere a assinatura contra
 *  os nomes importados. Sem plano de contas, nenhum perfil se aplica —
 *  cai no classificador por texto, como sempre. */
export function planoCombina(plano, nomes = {}) {
  const entradas = Object.entries(plano.assinatura || {});
  if (!entradas.length) return false;
  return entradas.every(([cod, trecho]) =>
    (nomes[cod] || "").toUpperCase().includes(String(trecho).toUpperCase())
  );
}

/** Escolhe o primeiro perfil cuja assinatura bate. */
export function escolherPlano(planos, nomes = {}) {
  return planos.find((p) => planoCombina(p, nomes)) || null;
}

function aplicarRegra(regra, conta, nomes, saldo) {
  if (regra.prefixo && conta.slice(0, regra.prefixo.length) !== regra.prefixo) return null;
  if (regra.tipo === "nome") {
    const alvo = (nomes[conta] || "").toUpperCase();
    return new RegExp(regra.padrao, "i").test(alvo) ? regra.grupo : null;
  }
  if (regra.tipo === "sinal") {
    return saldo > 0 ? regra.positivo : regra.negativo;
  }
  return null;
}

/** Resolve o grupo de uma conta pelo perfil. Devolve null quando o perfil
 *  não reconhece o código — aí quem decide é o classificador por texto. */
export function grupoPorPlano(plano, conta, nomes = {}, saldo = 0) {
  for (const r of plano.regras || []) {
    if (r.quando !== "depois") {
      const g = aplicarRegra(r, conta, nomes, saldo);
      if (g) return g;
    }
  }
  // Do código mais específico para o mais genérico: a conta-folha exata
  // vence a conta-síntese que a contém, que vence a de um nível acima.
  for (let len = conta.length; len >= 1; len--) {
    const g = plano.codigos[conta.slice(0, len)];
    if (g) return g;
  }
  for (const r of plano.regras || []) {
    if (r.quando === "depois") {
      const g = aplicarRegra(r, conta, nomes, saldo);
      if (g) return g;
    }
  }
  return null;
}

/** Valida um perfil de plano vindo de arquivo. Devolve { ok, plano, erro }
 *  em vez de lançar — isto responde a um arquivo escolhido pelo usuário. */
export function lerPlano(texto) {
  let d;
  try {
    d = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse arquivo não é um JSON válido." };
  }
  if (!d || d.formato !== "gerador-dre/plano") {
    return { ok: false, erro: "Esse arquivo não é um perfil de plano de contas do Gerador de DRE." };
  }
  if (!d.assinatura || !Object.keys(d.assinatura).length) {
    return {
      ok: false,
      erro: "O perfil não tem assinatura. Sem ela, o app não tem como saber se o perfil serve para o plano de contas importado — e aplicá-lo ao plano errado distribuiria os valores de forma silenciosamente errada.",
    };
  }

  const codigos = {};
  let ignorados = 0;
  for (const [cod, grupo] of Object.entries(d.codigos || {})) {
    if (IDS_VALIDOS.has(grupo)) codigos[String(cod)] = grupo;
    else ignorados++;
  }
  const regras = (d.regras || []).filter(
    (r) =>
      (r.tipo === "nome" && IDS_VALIDOS.has(r.grupo)) ||
      (r.tipo === "sinal" && IDS_VALIDOS.has(r.positivo) && IDS_VALIDOS.has(r.negativo))
  );

  return {
    ok: true,
    ignorados,
    plano: {
      nome: d.nome || "Plano sem nome",
      assinatura: d.assinatura,
      codigos,
      regras,
    },
  };
}

export function baixarPlano(plano) {
  const dados = { formato: "gerador-dre/plano", versao: 1, ...plano };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `plano-dre_${(plano.nome || "sem-nome").replace(/\W+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
