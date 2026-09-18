/* A MODALIDADE DE ENSINO — Presencial, EAD ou comum aos dois.
 *
 * É o TERCEIRO EIXO do app, ao lado do grupo da DRE (`grupos.js` +
 * `classify.js`) e da categoria do CPC 51 (`cpc51.js`). A mesma conta
 * tem os três: a linha em que ela aparece na DRE, o bloco em que ela
 * aparece em 2027, e a modalidade que a produziu.
 *
 * POR QUE UM EIXO, E NÃO GRUPOS NOVOS. Seria tentador criar
 * "REC_MENSALIDADES_EAD" em `grupos.js`. Isso quebraria a DRE validada
 * centavo a centavo contra a demonstração oficial (`fixtures/validar.mjs`)
 * e, no dia em que uma conta caísse num grupo que a hierarquia de
 * subtotais não soma, dinheiro sumiria da tela sem aviso. É exatamente o
 * argumento que o CPC 51 já tinha feito uma vez (ver o cabeçalho de
 * `cpc51.js`) — a modalidade repete a mesma escolha: eixo paralelo, e a
 * soma das modalidades de um grupo é, por construção, o total do grupo.
 *
 * COMUM NÃO É "NÃO SEI", É UM FATO. Despesa administrativa, PIS/COFINS/
 * ISS, depreciação e provisão nascem da instituição inteira: não há
 * modalidade a atribuir sem ratear, e ratear inventaria número que a
 * contabilidade não lançou. Por isso a terceira faixa se chama "Comum /
 * não segregado" e aparece na tela: é ela que mostra quanto do resultado
 * NÃO está atribuído a uma modalidade — a informação honesta, e a que
 * impede alguém de somar Presencial + EAD achando que fechou a DRE.
 */

/* `nome` é o rótulo da faixa na demonstração, onde "Comum / não
 * segregado" precisa dizer por extenso o que é; `curto` é o mesmo nome
 * onde a largura manda — o seletor do De-Para, que divide a linha com
 * mais dois. São a mesma coisa dita em dois tamanhos, não duas
 * classificações. */
export const MODALIDADES = [
  { id: "PRESENCIAL", nome: "Presencial", curto: "Presencial" },
  { id: "EAD", nome: "EAD", curto: "EAD" },
  { id: "COMUM", nome: "Comum / não segregado", curto: "Comum" },
];

export const NOME_MODALIDADE = Object.fromEntries(MODALIDADES.map((m) => [m.id, m.nome]));
export const NOME_CURTO_MODALIDADE = Object.fromEntries(MODALIDADES.map((m) => [m.id, m.curto]));
export const IDS_MODALIDADE = MODALIDADES.map((m) => m.id);
const VALIDA = new Set(IDS_MODALIDADE);

/* OS PADRÕES SÃO DADO, NÃO LÓGICA — é para serem lidos e estendidos por
 * quem conhece o plano de contas do cliente, como os `PAT_*` de
 * `classify.js`.
 *
 * Três decisões que já foram pensadas e não devem ser desfeitas sem
 * motivo:
 *
 * 1. EAD É TESTADO ANTES DE PRESENCIAL, e `PAT_PRESENCIAL` começa com
 *    `\b`. Sem as duas coisas, "GRADUACAO SEMIPRESENCIAL" bateria com
 *    /PRESENCIAL/ e a carga a distância entraria como presencial em
 *    silêncio. Com `\bPRESENCIAL` não há fronteira de palavra antes do
 *    "P" de SEMIPRESENCIAL, então ela só casa com o padrão de EAD.
 * 2. SEMIPRESENCIAL CAI EM EAD. É julgamento contábil, não gramática: a
 *    carga a distância é o que a regulação trata sob o guarda-chuva do
 *    EAD. Se a instituição tratar diferente, a conta se corrige no
 *    De-Para — e a origem passa a ser "manual", que é o que a auditoria
 *    lê.
 * 3. "ONLINE", "DIGITAL" E "VIRTUAL" FICAM DE FORA. Casariam com
 *    "MARKETING DIGITAL", "CERTIFICADO DIGITAL" e "COMPRAS ONLINE", que
 *    são despesa administrativa da instituição inteira — um padrão que
 *    aponta tudo não aponta nada, e aqui o erro apareceria como EAD
 *    inflado, difícil de perceber. */
export const PAT_EAD = /\bEAD\b|\bA DIST[ÂA]NCIA\b|ENSINO A DIST|EDUCA[ÇC][ÃA]O A DIST|\bSEMI[\s-]?PRESENCIAL\b/i;
export const PAT_PRESENCIAL = /\bPRESENCIAL/i;

/** A modalidade que um texto declara, ou `null` quando ele não declara
 *  nenhuma. `null` NÃO é "comum": é ausência de afirmação, e quem
 *  transforma isso em "Comum" é `fazerModalidadeDe`, de propósito em um
 *  lugar só. */
export function modalidadeDoTexto(texto) {
  if (!texto) return null;
  if (PAT_EAD.test(texto)) return "EAD";
  if (PAT_PRESENCIAL.test(texto)) return "PRESENCIAL";
  return null;
}

/** A modalidade de uma conta segundo o PLANO DE CONTAS: o nome da própria
 *  conta primeiro e, se ele não disser nada, o de cada conta ANCESTRAL,
 *  da mais próxima à mais distante.
 *
 *  A hierarquia é a mesma leitura que `sugerirClassificacao` já faz, e
 *  pelo mesmo motivo: num plano real é comum a conta-folha ter nome
 *  genérico ("MENSALIDADES") e a conta-síntese duas casas acima ser quem
 *  diz a modalidade ("GRADUACAO EAD"). A diferença é que aqui a conta
 *  MAIS PRÓXIMA vence, em vez de tudo virar um texto só: uma folha que
 *  diz "PRESENCIAL" dentro de uma síntese "EAD" é a exceção que o plano
 *  quis declarar, e concatenar os dois textos faria o padrão de EAD
 *  ganhar sempre. */
export function modalidadePorNome(conta, nomes = {}, historico = "") {
  const proprio = nomes[conta] || (historico || "").trim().split(",")[0] || "";
  const daFolha = modalidadeDoTexto(proprio);
  if (daFolha) return daFolha;
  for (let len = conta.length - 1; len >= 1; len--) {
    const ancestral = nomes[conta.slice(0, len)];
    const m = ancestral && modalidadeDoTexto(ancestral);
    if (m) return m;
  }
  return null;
}

/** A sugestão automática para todas as contas: só as que o plano de
 *  contas identifica entram no mapa. Conta ausente do mapa é conta sem
 *  modalidade declarada — não é "comum por engano". */
export function sugerirModalidades(contas = [], nomes = {}) {
  const mapa = {};
  contas.forEach((c) => {
    const m = modalidadePorNome(c.conta, nomes, c.historico);
    if (m) mapa[c.conta] = m;
  });
  return mapa;
}

/** A função `modalidadeDe(conta)` usada pelo resto do app, da decisão
 *  mais forte para a mais fraca: manual > nome no plano > Comum. É a
 *  mesma hierarquia de `grupoDe` e de `categoriaDe`; escrita uma vez aqui
 *  para nenhum chamador montá-la de novo e errar a ordem. */
export function fazerModalidadeDe({ modalidadePorConta = {}, sugestao = {} } = {}) {
  return (conta) => {
    const manual = modalidadePorConta[conta];
    if (manual && VALIDA.has(manual)) return manual;
    return sugestao[conta] || "COMUM";
  };
}

/** De onde veio a decisão — o campo que separa "alguém conferiu" de
 *  "herdou o padrão", como no De-Para dos outros dois eixos. */
export function origemModalidade(conta, { modalidadePorConta = {}, sugestao = {} } = {}) {
  if (modalidadePorConta[conta] && VALIDA.has(modalidadePorConta[conta])) return "manual";
  if (sugestao[conta]) return "nome no plano";
  return "sem modalidade";
}

/** Um bloco vazio por modalidade — a forma que `montarDRE` e `montarDRE51`
 *  preenchem. Em um lugar só para as duas demonstrações nunca divergirem
 *  na ordem das faixas nem no nome dos campos. */
export function blocosVazios() {
  const b = {};
  IDS_MODALIDADE.forEach((id) => (b[id] = { id, nome: NOME_MODALIDADE[id], total: 0, contas: [] }));
  return b;
}

/** As faixas de um grupo que valem a pena mostrar, na ordem da norma
 *  interna (Presencial, EAD, Comum).
 *
 *  A REGRA DE QUANDO DIVIDIR MORA AQUI, UMA VEZ SÓ. Ela governa a DRE, a
 *  demonstração do CPC 51 e as exportações — foi o erro que o projeto já
 *  cometeu com `abaDisponivel()` antes de centralizá-la: duas cópias da
 *  mesma condição divergem no dia em que alguém mexe numa só.
 *
 *  Um grupo só se divide quando ALGUMA conta dele tem modalidade: um
 *  grupo inteiramente comum (despesas administrativas, PIS/COFINS/ISS)
 *  continua uma linha só, sem uma sub-linha "Comum" solitária repetindo
 *  o valor da linha de cima. */
export function faixasDoGrupo(porModalidade) {
  if (!porModalidade) return [];
  const temModalidade = IDS_MODALIDADE.some(
    (id) => id !== "COMUM" && porModalidade[id] && porModalidade[id].contas.length > 0
  );
  if (!temModalidade) return [];
  return IDS_MODALIDADE
    .map((id) => porModalidade[id])
    .filter((f) => f && (f.contas.length > 0 || Math.abs(f.total) > 0.005));
}

/** Conta → nome da modalidade, dentro de um grupo já montado. É o que a
 *  exportação usa para pôr a modalidade ao lado de cada conta sem
 *  reclassificar nada por fora: a resposta vem da MESMA quebra que
 *  gerou os totais da tela. */
export function rotuloPorConta(porModalidade) {
  const mapa = {};
  Object.values(porModalidade || {}).forEach((f) =>
    f.contas.forEach((c) => { mapa[c.conta] = f.nome; })
  );
  return mapa;
}
