/* A MODALIDADE DE ENSINO — o TERCEIRO EIXO, e um catálogo que o usuário
 * controla.
 *
 * Ao lado do grupo da DRE (`grupos.js` + `classify.js`) e da categoria do
 * CPC 51 (`cpc51.js`), cada conta tem uma modalidade: a que produziu
 * aquela receita ou aquele custo.
 *
 * POR QUE UM EIXO, E NÃO GRUPOS NOVOS. Seria tentador criar
 * "REC_MENSALIDADES_EAD" em `grupos.js`. Isso quebraria a DRE validada
 * centavo a centavo contra a demonstração oficial (`fixtures/validar.mjs`)
 * e, no dia em que uma conta caísse num grupo que a hierarquia de
 * subtotais não soma, dinheiro sumiria da tela sem aviso. É o mesmo
 * argumento que o CPC 51 já tinha feito uma vez (ver o cabeçalho de
 * `cpc51.js`): eixo paralelo, e a soma das modalidades de um grupo é,
 * por construção, o total do grupo.
 *
 * POR QUE UM CATÁLOGO EDITÁVEL, E NÃO TRÊS CONSTANTES. A primeira versão
 * cravava Presencial / EAD / Comum no código. Bastou o primeiro uso real
 * para aparecer Médio/Fundamental — e curso técnico, pós e extensão viriam
 * depois, cada um exigindo commit, build e publicação. Agora a lista é
 * DADO: o usuário cria, renomeia, reordena e remove modalidades na tela, e
 * diz quais termos do plano de contas identificam cada uma.
 *
 * A FAIXA RESIDUAL NÃO SE REMOVE. Despesa administrativa, PIS/COFINS/ISS,
 * depreciação e provisão nascem da instituição inteira: não há modalidade
 * a atribuir sem ratear, e ratear inventaria número que a contabilidade
 * não lançou. Por isso existe sempre uma última faixa (por padrão "Comum /
 * não segregado") — renomeável como qualquer outra, mas não removível. É
 * ela que mostra quanto do resultado NÃO está atribuído, e é o que impede
 * alguém de somar duas faixas achando que fechou a DRE.
 */

/** O id da faixa residual. Fixo no código de propósito: é o destino de
 *  toda conta sem modalidade e o alvo do `?? RESIDUAL` de quem resolve
 *  uma modalidade que não existe mais no catálogo. */
export const RESIDUAL = "COMUM";

/* O catálogo que o app traz de fábrica. `termos` é o que se procura no
 * nome da conta e no dos ancestrais — em palavra inteira, sem
 * diferenciar acento nem caixa.
 *
 * Três decisões que já custaram caro e não devem ser desfeitas sem
 * motivo:
 *
 * 1. "SEMIPRESENCIAL" é termo de EAD, e a busca é por PALAVRA INTEIRA.
 *    Sem as duas coisas, "GRADUACAO SEMIPRESENCIAL" casaria com o termo
 *    "presencial" e a carga a distância entraria como presencial em
 *    silêncio. Com palavra inteira, "presencial" não casa dentro de
 *    "semipresencial" — e, se casasse, o desempate por TERMO MAIS LONGO
 *    resolveria do mesmo jeito.
 * 2. Semipresencial em EAD é julgamento contábil, não gramática: a carga
 *    a distância é o que a regulação trata sob o guarda-chuva do EAD. Se
 *    a instituição tratar diferente, muda-se o termo na tela — sem
 *    commit, sem build.
 * 3. "online", "digital" e "virtual" NÃO entram. Casariam com "MARKETING
 *    DIGITAL", "CERTIFICADO DIGITAL" e "COMPRAS ONLINE", que são despesa
 *    da instituição inteira. Um padrão que aponta tudo não aponta nada, e
 *    aqui o erro apareceria como EAD inflado — difícil de perceber. */
export const CATALOGO_PADRAO = [
  { id: "PRESENCIAL", nome: "Presencial", termos: ["presencial"] },
  { id: "EAD", nome: "EAD", termos: ["EAD", "a distância", "semipresencial", "semi presencial"] },
  { id: "MEDIO_FUNDAMENTAL", nome: "Médio / Fundamental", termos: ["médio", "fundamental"] },
  { id: RESIDUAL, nome: "Comum / não segregado", termos: [], residual: true },
];

const DIACRITICO = new RegExp("[\\u0300-\\u036f]", "g");

/** Sem acento, sem caixa — os dois lados da comparação passam por aqui.
 *  O plano de contas real escreve "MEDIO" e "GRADUACAO"; quem digita o
 *  termo na tela escreve "médio". Comparar sem normalizar erraria
 *  exatamente no caso comum. */
export function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(DIACRITICO, "")
    .toLowerCase()
    /* Pontuação vira espaço nos DOIS lados da comparação. É o que faz
       "SEMI-PRESENCIAL" casar com o termo "semi presencial" e
       "MEDIO/FUNDAMENTAL" casar com "médio": o plano de contas real
       separa palavra com barra, hífen e ponto, e quem digita o termo na
       tela não tem por que adivinhar qual deles o arquivo usou. Como
       sobra só letra, dígito e espaço, a busca por palavra inteira
       (`\\b`) passa a valer para qualquer termo. */
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const escapar = (t) => semAcento(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Um catálogo sempre utilizável, venha ele da tela, da sessão ou de um
 *  perfil de arquivo: ids únicos, nomes não vazios, e a faixa residual
 *  existindo uma vez só, no fim.
 *
 *  Isto é defesa contra ARQUIVO, não contra a tela: o perfil é um JSON
 *  que o usuário pode editar à mão, e um catálogo sem residual faria toda
 *  conta sem modalidade cair num id inexistente — dinheiro fora de
 *  qualquer faixa, que é o defeito que este eixo inteiro existe para não
 *  ter. */
export function normalizarCatalogo(catalogo) {
  const lista = Array.isArray(catalogo) ? catalogo : [];
  const vistos = new Set();
  const limpas = [];
  lista.forEach((m) => {
    if (!m || typeof m !== "object") return;
    const id = String(m.id || "").trim();
    if (!id || vistos.has(id)) return;
    vistos.add(id);
    limpas.push({
      id,
      nome: String(m.nome || id).trim() || id,
      termos: Array.isArray(m.termos) ? m.termos.map((t) => String(t).trim()).filter(Boolean) : [],
      residual: id === RESIDUAL,
    });
  });
  const residual = limpas.find((m) => m.id === RESIDUAL)
    || { ...CATALOGO_PADRAO[CATALOGO_PADRAO.length - 1] };
  const resto = limpas.filter((m) => m.id !== RESIDUAL);
  return resto.length || limpas.length ? [...resto, residual] : [...CATALOGO_PADRAO];
}

export const idsDoCatalogo = (catalogo = CATALOGO_PADRAO) => normalizarCatalogo(catalogo).map((m) => m.id);

/** O nome de exibição de uma modalidade. Cai no próprio id quando a
 *  modalidade não existe mais — o que acontece de verdade quando alguém
 *  remove uma modalidade que ainda está escolhida à mão em alguma conta. */
export function nomeDaModalidade(id, catalogo = CATALOGO_PADRAO) {
  return normalizarCatalogo(catalogo).find((m) => m.id === id)?.nome || id;
}

/** Gera um id estável a partir do nome, sem colidir com os existentes.
 *  O id é a CHAVE: ele aparece na sessão, no perfil e no mapa de
 *  modalidade por conta. Renomear a modalidade depois não pode mudá-lo,
 *  senão toda conta decidida à mão perderia o destino de uma vez. */
export function novoId(nome, catalogo = []) {
  const base = semAcento(nome).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || "MODALIDADE";
  const usados = new Set(catalogo.map((m) => m.id));
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** A modalidade que um texto declara, ou `null` quando ele não declara
 *  nenhuma.
 *
 *  `null` NÃO é a faixa residual: é ausência de afirmação. Quem
 *  transforma uma na outra é `fazerModalidadeDe`, num lugar só — mesma
 *  doutrina do `null` de `ehCredora` e do `[______]` da nota de MPDA.
 *
 *  Quando dois termos casam, vence o MAIS LONGO: é ele que descreve o
 *  caso mais específico ("pós-graduação a distância" ganha de "a
 *  distância"). Sem esse desempate, a ordem da lista na tela viraria uma
 *  regra escondida de classificação. */
export function modalidadeDoTexto(texto, catalogo = CATALOGO_PADRAO) {
  const alvo = semAcento(texto);
  if (!alvo) return null;
  let achado = null;
  let tamanho = 0;
  normalizarCatalogo(catalogo).forEach((m) => {
    if (m.residual) return;
    m.termos.forEach((termo) => {
      const t = escapar(termo);
      if (!t || t.length <= tamanho) return;
      if (new RegExp(`\\b${t}\\b`).test(alvo)) {
        achado = m.id;
        tamanho = t.length;
      }
    });
  });
  return achado;
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
 *  quis declarar, e concatenar os dois textos faria o termo de EAD ganhar
 *  sempre.
 *
 *  LÊ O NOME ORIGINAL DO PLANO, nunca o apelido que o usuário digitou
 *  (ver `rotulos.js`). Renomear uma conta é aparência; se o nome novo
 *  reclassificasse, encurtar "GRADUACAO EAD INSTITUCIONAL" para "EAD
 *  institucional" poderia mover a conta de faixa sem ninguém pedir. */
export function modalidadePorNome(conta, nomes = {}, historico = "", catalogo = CATALOGO_PADRAO) {
  const cat = normalizarCatalogo(catalogo);
  const proprio = nomes[conta] || (historico || "").trim().split(",")[0] || "";
  const daFolha = modalidadeDoTexto(proprio, cat);
  if (daFolha) return daFolha;
  for (let len = String(conta).length - 1; len >= 1; len--) {
    const ancestral = nomes[String(conta).slice(0, len)];
    const m = ancestral && modalidadeDoTexto(ancestral, cat);
    if (m) return m;
  }
  return null;
}

/** A sugestão automática para todas as contas: só as que o plano de
 *  contas identifica entram no mapa. Conta ausente do mapa é conta sem
 *  modalidade declarada — não é "residual por engano". */
export function sugerirModalidades(contas = [], nomes = {}, catalogo = CATALOGO_PADRAO) {
  const cat = normalizarCatalogo(catalogo);
  const mapa = {};
  contas.forEach((c) => {
    const m = modalidadePorNome(c.conta, nomes, c.historico, cat);
    if (m) mapa[c.conta] = m;
  });
  return mapa;
}

/** A função `modalidadeDe(conta)` usada pelo resto do app, da decisão
 *  mais forte para a mais fraca: manual > termo do plano > residual. É a
 *  mesma hierarquia de `grupoDe` e de `categoriaDe`, escrita uma vez aqui
 *  para nenhum chamador montá-la de novo e errar a ordem.
 *
 *  ELA CARREGA O PRÓPRIO CATÁLOGO em `.catalogo`. `montarDRE` e
 *  `montarDRE51` precisam da lista de faixas para montar os blocos, e o
 *  catálogo é parte da mesma decisão que a função resolve — separá-los em
 *  dois parâmetros abriria a porta para alguém passar um resolvedor de um
 *  catálogo e a lista de outro, e faixas apareceriam vazias sem erro
 *  nenhum. */
export function fazerModalidadeDe({ modalidadePorConta = {}, sugestao = {}, catalogo = CATALOGO_PADRAO } = {}) {
  const cat = normalizarCatalogo(catalogo);
  const validos = new Set(cat.map((m) => m.id));
  const de = (conta) => {
    const manual = modalidadePorConta[conta];
    if (manual && validos.has(manual)) return manual;
    const sugerida = sugestao[conta];
    /* Modalidade removida do catálogo depois de já ter sido escolhida:
       a conta volta para a residual em vez de sumir num id fantasma. */
    return sugerida && validos.has(sugerida) ? sugerida : RESIDUAL;
  };
  de.catalogo = cat;
  return de;
}

/** De onde veio a decisão — o campo que separa "alguém conferiu" de
 *  "herdou o padrão", como no De-Para dos outros dois eixos. */
export function origemModalidade(conta, { modalidadePorConta = {}, sugestao = {}, catalogo = CATALOGO_PADRAO } = {}) {
  const validos = new Set(normalizarCatalogo(catalogo).map((m) => m.id));
  if (modalidadePorConta[conta] && validos.has(modalidadePorConta[conta])) return "manual";
  if (sugestao[conta] && validos.has(sugestao[conta])) return "nome no plano";
  return "sem modalidade";
}

/** Um bloco vazio por modalidade — a forma que `montarDRE` e `montarDRE51`
 *  preenchem. Em um lugar só para as duas demonstrações nunca divergirem
 *  na ordem das faixas nem no nome dos campos. */
export function blocosVazios(catalogo = CATALOGO_PADRAO) {
  const b = {};
  normalizarCatalogo(catalogo).forEach((m) => {
    b[m.id] = { id: m.id, nome: m.nome, residual: !!m.residual, total: 0, contas: [] };
  });
  return b;
}

/** As faixas de um grupo que valem a pena mostrar, na ordem do catálogo.
 *
 *  A REGRA DE QUANDO DIVIDIR MORA AQUI, UMA VEZ SÓ. Ela governa a DRE, a
 *  demonstração do CPC 51 e as exportações — foi o erro que o projeto já
 *  cometeu com `abaDisponivel()` antes de centralizá-la: duas cópias da
 *  mesma condição divergem no dia em que alguém mexe numa só.
 *
 *  Um grupo só se divide quando ALGUMA conta dele tem modalidade: um
 *  grupo inteiramente residual (despesas administrativas, PIS/COFINS/ISS)
 *  continua uma linha só, sem uma faixa solitária repetindo o valor da
 *  linha de cima. */
export function faixasDoGrupo(porModalidade) {
  if (!porModalidade) return [];
  const blocos = Object.values(porModalidade);
  const temModalidade = blocos.some((f) => !f.residual && f.contas.length > 0);
  if (!temModalidade) return [];
  return blocos.filter((f) => f.contas.length > 0 || Math.abs(f.total) > 0.005);
}

/** Conta → nome da modalidade, dentro de um grupo já montado. É o que a
 *  exportação usa para pôr a modalidade ao lado de cada conta sem
 *  reclassificar nada por fora: a resposta vem da MESMA quebra que gerou
 *  os totais da tela. */
export function rotuloPorConta(porModalidade) {
  const mapa = {};
  Object.values(porModalidade || {}).forEach((f) =>
    f.contas.forEach((c) => { mapa[c.conta] = f.nome; })
  );
  return mapa;
}
