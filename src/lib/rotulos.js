/* OS NOMES — o registro de tudo que o usuário pode renomear.
 *
 * O app nasceu com todo nome cravado: o rótulo de cada linha da DRE, o
 * nome de cada grupo, o das categorias do CPC 51 e a descrição de cada
 * conta, que vinha do plano de contas e ficava como estava. Isso servia
 * enquanto o app atendia um plano só. Não serve mais: o nome no plano é
 * escrito para caber no sistema contábil ("GRADUACAO PRESENCIAL
 * INSTITUCIONAL"), e a DRE é lida por quem não conhece o plano.
 *
 * O QUE ESTE MÓDULO É: um dicionário de APELIDOS, por eixo —
 *
 *   contas        código da conta → nome que aparece no lugar do plano
 *   grupos        id do grupo da DRE → nome da linha
 *   linhas        id de linha estrutural (seções e subtotais) → rótulo
 *   categorias51  id da categoria do CPC 51 → nome
 *
 * O QUE ELE NÃO É: uma segunda classificação. Renomear é APARÊNCIA.
 * `sugerirClassificacao` e `modalidadePorNome` continuam lendo o nome
 * ORIGINAL do plano de contas — se o apelido reclassificasse, encurtar
 * "GRADUACAO EAD INSTITUCIONAL" para "EAD institucional" moveria a conta
 * de faixa sem ninguém pedir, e quem renomeou por estética descobriria
 * isso no fechamento. Quem decide destino são os três eixos, cada um com
 * sua coluna no De-Para.
 *
 * VALOR NUNCA É EDITÁVEL, e é por isso que este módulo só mexe em texto.
 * A DRE é uma demonstração: o número vem do balancete, passa pela
 * classificação e chega na tela. Um campo de valor editável faria o app
 * produzir demonstração que não corresponde a lançamento nenhum.
 */

import { NOME_GRUPO } from "./grupos.js";
import { NOME_CATEGORIA } from "./cpc51.js";

/** Os eixos que aceitam apelido. Lista fechada de propósito: um eixo novo
 *  aqui significa uma tela nova de edição e uma linha nova no perfil. */
export const EIXOS_ROTULO = ["contas", "grupos", "linhas", "categorias51"];

export const ROTULOS_VAZIOS = Object.freeze({ contas: {}, grupos: {}, linhas: {}, categorias51: {} });

/* Teto de 90 caracteres: é o que cabe na coluna de rótulo da DRE
   impressa em retrato sem quebrar a linha em três. Quebra de linha e
   caractere de controle saem porque o mesmo texto vai para célula de
   Excel e para CSV, onde eles rompem a linha do arquivo. */
const LIMITE = 90;
/* `\p{Cc}` é a categoria Unicode dos caracteres de CONTROLE. Escrito
   assim, e não como intervalo literal, porque o intervalo literal dispara
   o `no-control-regex` do oxlint — e o projeto trabalha com zero avisos. */
const CONTROLE = /\p{Cc}+/gu;

/** Limpeza de LEITURA e de GRAVAÇÃO EM ARQUIVO: o texto como ele vai
 *  parar na demonstração, no perfil e na planilha. */
export function limparRotulo(texto) {
  return String(texto ?? "")
    .replace(CONTROLE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITE);
}

/** Limpeza de DIGITAÇÃO — a que roda a cada tecla, enquanto o campo está
 *  sendo escrito.
 *
 *  ELA NÃO APARA O FIM DO TEXTO, e a diferença não é cosmética: com
 *  `limparRotulo` na tecla, digitar "Receita " virava "Receita" antes de
 *  o "d" de "de" chegar, o campo voltava ao valor anterior e o espaço
 *  NUNCA aparecia — ou seja, nome de mais de uma palavra era impossível
 *  de escrever. O mesmo vale para a vírgula que separa os termos de uma
 *  modalidade. Normalizar o que a pessoa está digitando é sempre isto:
 *  brigar com ela a cada tecla.
 *
 *  O que sai aqui é só o que não pode chegar num arquivo (caractere de
 *  controle, que rompe linha de CSV) e o excesso de tamanho. O aparo de
 *  verdade acontece na leitura e ao salvar o perfil — `normalizarRotulos`. */
export function textoDigitado(texto) {
  return String(texto ?? "")
    .replace(CONTROLE, " ")
    .replace(/^\s+/, "")
    .slice(0, LIMITE);
}

/** Grava (ou apaga) um apelido, devolvendo um registro novo.
 *
 *  Apelido vazio REMOVE a entrada em vez de guardar string vazia: é
 *  assim que se volta ao nome original, e é o mesmo gesto que já desfaz
 *  uma categoria manual do CPC 51 ou uma modalidade escolhida à mão. Sem
 *  isso, "limpar o campo" deixaria a linha sem nome nenhum na tela. */
export function definirRotulo(rotulos, eixo, chave, valor) {
  if (!EIXOS_ROTULO.includes(eixo)) return rotulos;
  const limpo = textoDigitado(valor);
  const atual = { ...rotulos?.[eixo] };
  if (limpo) atual[chave] = limpo;
  else delete atual[chave];
  return { ...ROTULOS_VAZIOS, ...rotulos, [eixo]: atual };
}

/** Só as entradas que valem: chave não vazia e apelido não vazio. Roda na
 *  leitura do perfil (arquivo que o usuário pode ter editado à mão) e
 *  antes de gravar. */
export function normalizarRotulos(rotulos) {
  const saida = { contas: {}, grupos: {}, linhas: {}, categorias51: {} };
  EIXOS_ROTULO.forEach((eixo) => {
    const entradas = rotulos?.[eixo];
    if (!entradas || typeof entradas !== "object") return;
    Object.entries(entradas).forEach(([chave, valor]) => {
      const limpo = limparRotulo(valor);
      if (chave && limpo) saida[eixo][chave] = limpo;
    });
  });
  return saida;
}

export const temRotulos = (rotulos) =>
  EIXOS_ROTULO.some((eixo) => Object.keys(rotulos?.[eixo] || {}).length > 0);

export const quantosRotulos = (rotulos) =>
  EIXOS_ROTULO.reduce((n, eixo) => n + Object.keys(rotulos?.[eixo] || {}).length, 0);

/* ---- As quatro leituras. Todas caem no nome padrão, nunca em vazio ---- */

/** O nome de um grupo na DRE. Governa a linha da demonstração, a coluna
 *  "Grupo na DRE" do De-Para e as duas exportações ao mesmo tempo —
 *  renomear em um lugar e não no outro é como o arquivo entregue passa a
 *  divergir da tela conferida. */
export function nomeDoGrupo(id, rotulos) {
  return rotulos?.grupos?.[id] || NOME_GRUPO[id] || id;
}

/** O rótulo de uma linha estrutural (seção ou subtotal), que não pertence
 *  a grupo nenhum: "Receita Operacional Bruta", "( = ) Receita Bruta de
 *  Serviços". O padrão viaja como parâmetro porque ele mora em
 *  `linhasDRE.js` / `linhasCPC51.js` — importá-lo aqui faria ciclo. */
export function rotuloDaLinha(id, padrao, rotulos) {
  return rotulos?.linhas?.[id] || padrao;
}

export function nomeDaCategoria51(id, rotulos) {
  return rotulos?.categorias51?.[id] || NOME_CATEGORIA[id] || id;
}

/** A descrição de uma conta: apelido do usuário, senão o nome oficial do
 *  plano de contas, senão o começo do histórico dos lançamentos. Escrita
 *  uma vez aqui porque a DRE, o De-Para, o CPC 51 e as exportações
 *  precisam responder isso igual — era `descricaoDaConta` em `depara.js`,
 *  que agora delega para cá. */
export function nomeDaConta(conta, nomes = {}, rotulos, historico = "") {
  const apelido = rotulos?.contas?.[conta];
  if (apelido) return apelido;
  if (nomes[conta]) return nomes[conta];
  return (historico || "").trim().split(",")[0].slice(0, 48);
}
