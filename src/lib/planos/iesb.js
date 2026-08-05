/* Perfil do plano de contas do IESB — antes cravado dentro de
 * `classify.js`, agora um dado como qualquer outro.
 *
 * Validado linha a linha contra a DRE real de jan a jun/2026: todo grupo
 * bateu com a DRE oficial até o centavo. Antes de mexer em qualquer
 * código aqui, rode `node fixtures/validar.mjs`.
 *
 * Não há nada de confidencial neste arquivo: são códigos e nomes de
 * conta-síntese do plano, sem nenhum valor. Ainda assim, o caminho para
 * um cliente novo NÃO é copiar este arquivo e editar — é exportar um
 * perfil pela própria interface (etapa 3), que não exige build nem
 * commit. Este perfil só continua embutido porque é o que faz o app
 * funcionar direito no arquivo do dia a dia do Denner.
 */

export const PLANO_IESB = {
  nome: "IESB — instituição de ensino",

  /* A assinatura confere que o plano importado é mesmo este, olhando o
   * nome das contas-síntese de topo (1 dígito), que são as mais estáveis.
   * Todos precisam bater; com outro plano, ou sem plano, o app cai no
   * classificador por texto. */
  assinatura: {
    "3": "RECEITAS LIQUIDAS",
    "4": "DESPESAS ADMINISTRATIVAS",
    "5": "OUTRAS RECEITAS",
    "6": "PROVISOES",
  },

  codigos: {
    // ---- Receita bruta ----
    "31101": "REC_MENSALIDADES", // RECEITAS PROPRIAS
    "31103": "REC_MENSALIDADES", // RECEITAS BOLSISTAS (fies/prouni/gdf/convênios — ainda receita bruta)
    "31102": "REC_TAXAS", // OUTRAS/RECEITAS ACESSORIAS TAXAS

    // ---- Deduções da receita ----
    "32100": "DED_BOLSAS", // (-)BOLSAS ESTUDANTIS
    "32101": "DED_DESCONTOS", // (-)OUTROS DESCONTOS
    "32102": "DED_DESCONTOS", // (-)MENSALIDADES CANCELADAS PROPRIAS
    "32103": "DED_DESCONTOS", // (-)MENSALIDADES CANCELADAS BOLSISTAS
    "32104": "DED_DEVOLUCOES", // (-)DEVOLUCOES MENSALIDADES/TAXAS
    "32105": "DED_IMPOSTOS", // (-)IMPOSTOS E CONTRIB. S/SERVICOS (ISS/PIS/COFINS)

    /* Exceção: mora dentro de "Mensalidades Canceladas Próprias" (32102)
     * no plano, mas o nome ("DEV. DE MENSALIDADES") é devolução de
     * verdade. Como o código exato é mais específico que 32102, vence. */
    "3210208": "DED_DEVOLUCOES",

    /* Custo dos serviços = folha dos DOCENTES, quem entrega o
     * serviço-fim. Distinção por desenho contábil, não coincidência: a
     * folha do administrativo (4111) e a do apoio acadêmico (4112) são
     * Despesas com Pessoal, logo abaixo. Não junte os dois. */
    "41101": "CUSTOS", // CUSTO TOTAL - DOCENTES
    "41102": "CUSTOS", // IMPOSTOS/CONTRIB. FOPAG - DOCENTES
    "41103": "CUSTOS", // DEMAIS ENCARGOS FOPAG - DOCENTES

    // ---- Fopag operacional: administrativo + apoio acadêmico ----
    "41110": "DESP_FOPAG", "41111": "DESP_FOPAG", "41112": "DESP_FOPAG",
    "41120": "DESP_FOPAG", "41121": "DESP_FOPAG", "41122": "DESP_FOPAG",

    // ---- Despesas administrativas ----
    "41201": "DESP_ADM", "41202": "DESP_ADM", "41203": "DESP_ADM", "41204": "DESP_ADM",
    "41205": "DESP_ADM", "41206": "DESP_ADM", "41207": "DESP_ADM", "41208": "DESP_ADM",
    "41209": "DESP_ADM", "41211": "DESP_ADM",
    "41210": "DEPRECIACAO", // DEPRECIACAO SOCIETARIA — não é despesa administrativa comum

    // ---- Resultado financeiro ----
    "42101": "DESP_FIN", // DESPESAS FINANCEIRAS
    "42102": "REC_FIN", // (-)RECEITAS FINANCEIRAS — o nome do plano engana: é receita

    /* Provisões são DUAS linhas na DRE oficial, não uma: Contingências
     * (cíveis/trabalhistas, novas e revertidas) e PCLD (perdas estimadas
     * com créditos de liquidação duvidosa, fiscal e societária). Juntar
     * numa linha só foi o erro da primeira versão desta camada. */
    "6110100": "PROVISOES_CONTINGENCIAS", // PROV. CONTINGENCIAS CIVEIS
    "6110101": "PROVISOES_CONTINGENCIAS", // (-) REV. PROV. CONTINGENCIAS CIVEIS
    "6110102": "PROVISOES_CONTINGENCIAS", // INSS (contingência)
    "6110104": "PROVISOES_CONTINGENCIAS", // PROV. CONTINGENCIAS TRABALHISTAS
    "6110105": "PROVISOES_CONTINGENCIAS", // (-) REV. PROV. CONTING. TRABALHISTAS
    "6110115": "PROVISOES_CONTINGENCIAS", // CONTINGENCIAS CIVEIS REALIZADAS
    "6110116": "PROVISOES_CONTINGENCIAS", // CONTINGENCIAS TRABALHISTAS REALIZADAS

    "6110103": "PROVISOES_PCLD", // PERDAS EST. P/CRED. LIQ. DUVIDOSA FISCAL
    "6110106": "PROVISOES_PCLD", // PERDAS EST. PROG./CONVENIOS
    "6110111": "PROVISOES_PCLD", // (-)REV. CRED. LIQ. DUV. EXERC ANTERIORES
    "6110112": "PROVISOES_PCLD", // (-)REV. CRED. LIQ. DUV. EXERC. CORRENTE
    "6110114": "PROVISOES_PCLD", // (-)PROG. ALIM. TRABALHADOR
    "6110119": "PROVISOES_PCLD", // PERDAS EST. P/CRED. LIQ. DUVIDOSA SOCIET
    "61101": "PROVISOES_PCLD", // conta nova nesse grupo que ainda não foi vista

    /* IRPJ/CSLL (inclui incentivo Prouni e diferimento) mora dentro do
     * grupo 611 de provisões, mas tem linha própria na DRE. O código
     * exato é mais específico que 61101, então vence naturalmente. */
    "6110107": "IRPJ_CSLL", "6110108": "IRPJ_CSLL", // PROVISAO IRPJ / CSLL
    "6110109": "IRPJ_CSLL", "6110110": "IRPJ_CSLL", // (-) RESERVA INCENTIVO FISCAL PROUNI
    "6110117": "IRPJ_CSLL", "6110118": "IRPJ_CSLL", // PROVISAO IRPJ / CSLL DIFERIDO(A)

    /* Exceção: mora dentro de "Provisões" no plano, mas a DRE oficial
     * trata IPTU de imóvel de investimento como Não Operacional. */
    "6110113": "OUTRAS_DESP", // IPTU IMOVEIS INVESTIMENTO

    // Fechamento do exercício — não é conta de resultado
    "71101": "IGNORAR",
  },

  regras: [
    {
      /* "(-)PROUNI" mora dentro da conta-síntese "(-)BOLSAS ESTUDANTIS"
       * (32100), mas a DRE oficial dá linha própria ao Prouni. Contas de
       * Prouni em OUTROS grupos (ex. Mensalidades Canceladas Bolsistas)
       * ficam no grupo do código — só a de Bolsas é exceção, confirmado
       * batendo com a DRE oficial mês a mês. Roda ANTES do mapa, senão
       * o prefixo 32100 já teria mandado a conta para Bolsas. */
      tipo: "nome",
      quando: "antes",
      prefixo: "32100",
      padrao: "PROUNI",
      grupo: "DED_PROUNI",
    },
    {
      /* A seção 511 mistura contas devedoras e credoras, então quem
       * decide é o sinal do saldo, não o código. Roda DEPOIS: só se o
       * mapa não reconheceu o código. */
      tipo: "sinal",
      quando: "depois",
      prefixo: "51",
      positivo: "OUTRAS_REC",
      negativo: "OUTRAS_DESP",
    },
  ],
};

/** Perfis que vêm junto com o app. Um perfil carregado pelo usuário entra
 *  na frente destes, para poder corrigir um embutido sem novo build. */
export const PLANOS_EMBUTIDOS = [PLANO_IESB];
