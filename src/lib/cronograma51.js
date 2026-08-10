/* O cronograma de implementação do CPC 51 como DADO.
 *
 * Transcrito do documento "CRONOGRAMA PARA IMPLEMENTAÇÃO DAS DFs CONFORME
 * CPC51" (Gennesys): 10 fases, 49 passos e os entregáveis de cada fase,
 * com os prazos e responsáveis originais. O texto dos passos é do
 * documento; o campo `apoio` é acréscimo deste app — diz, em uma frase, o
 * que a ferramenta faz por aquele passo e para qual tela ir.
 *
 * Por que dentro do software, e não numa planilha à parte: metade dos
 * passos é trabalho que este app já executa (categorizar contas, gerar o
 * De-Para, provar que o lucro líquido não mudou, redigir a minuta da nota
 * de MPDA). Um cronograma que vive ao lado do trabalho é conferido; um
 * que vive noutro arquivo vira anexo de e-mail desatualizado.
 *
 * `limite` é a data-limite em ISO para cálculo de prazo; `prazo` é o
 * rótulo como está no documento ("Out-Nov/2026"), que às vezes é um
 * intervalo e não uma data. Quando o documento dá intervalo, `limite` é o
 * último dia dele — a leitura conservadora.
 */

export const FASES = [
  {
    id: "f0",
    titulo: "Diagnóstico, formação do comitê e comunicação inicial",
    prazo: "10/08/2026",
    limite: "2026-08-10",
    responsavel: "Liderança contábil",
    objetivo:
      "Estabelecer a estrutura de governança do projeto, entender o grau de exposição de cada " +
      "empresa/cliente às mudanças do CPC 51 e comunicar formalmente o início dos trabalhos.",
    passos: [
      { texto: "Formar o comitê de implementação (contabilidade, controladoria, TI, fiscal e, quando aplicável, auditoria externa)." },
      { texto: "Levantar, para cada empresa/cliente, o regime tributário, o porte, a obrigatoriedade de elaborar demonstrações financeiras e a existência de indicadores gerenciais (MPDA) hoje divulgados." },
      {
        texto: "Revisar a DRE atual de cada empresa e identificar contas que hoje se misturam entre operacional, investimento, financiamento e operações descontinuadas.",
        apoio: "A aba CPC 51 lista as contas mistas do razão importado, ordenadas por valor, com o motivo de cada apontamento.",
      },
      { texto: "Comunicar formalmente a diretoria/sócios sobre prazos, riscos e necessidade de recursos (sistema, horas técnicas, treinamento)." },
      { texto: "Definir o cronograma-mestre e os marcos de controle conforme a estrutura de Fases 0 a 9 aprovada, adaptando por cliente quando necessário." },
    ],
    entregaveis: [
      "Ata de constituição do comitê de implementação",
      "Relatório de diagnóstico por empresa/cliente",
      "Comunicação inicial formalizada e cronograma aprovado pela liderança contábil",
    ],
  },
  {
    id: "f1",
    titulo: "Capacitação técnica e definição da política contábil",
    prazo: "15/08/2026",
    limite: "2026-08-15",
    responsavel: "Contabilidade + Auditoria",
    objetivo:
      "Garantir que a equipe compreenda tecnicamente as novas exigências e formalizar as " +
      "definições que exigem julgamento profissional.",
    passos: [
      { n: 1, texto: "Treinar a equipe contábil e fiscal no texto integral do CPC 51 e na correlação com a IFRS 18." },
      {
        n: 2,
        texto: 'Definir, em política contábil formal, os critérios de classificação que envolvem julgamento (ex.: o que é "atividade de negócio principal" para fins de classificação de investimento/financiamento).',
        apoio: "A política de atividade principal fica na aba CPC 51, muda a categorização na hora e sai documentada na planilha exportada.",
      },
      {
        n: 3,
        texto: "Definir a metodologia de cálculo, definição e conciliação de cada Medida de Desempenho Definida pela Administração (MPDA) que a empresa pretende continuar divulgando.",
        apoio: "O bloco MPDA calcula a medida e a conciliação a partir das mesmas contas da DRE; EBITDA, EBITDA ajustado e resultado recorrente já vêm prontos.",
      },
      { n: 4, texto: "Envolver a área fiscal desde o início para mapear os pontos de possível divergência entre a nova classificação contábil e conceitos fiscais (despesas operacionais, incentivos fiscais, preços de transferência)." },
      { n: 5, texto: "Documentar as decisões tomadas em conjunto com a auditoria, pois servirão de base para justificar classificações residuais (categoria operacional)." },
    ],
    entregaveis: [
      "Registro de treinamento da equipe",
      "Documento de política contábil de classificação (CPC 51)",
      "Memorando conjunto contabilidade/fiscal sobre pontos de atenção",
    ],
  },
  {
    id: "f2",
    titulo: "Mapeamento e reestruturação do plano de contas",
    prazo: "31/08/2026",
    limite: "2026-08-31",
    responsavel: "Contabilidade + TI",
    objetivo:
      "Traduzir as cinco categorias do CPC 51 em uma estrutura de plano de contas e de plano de " +
      "contas referencial compatível, permitindo a extração automática das novas demonstrações.",
    passos: [
      {
        n: 6,
        texto: "Extrair o plano de contas analítico vigente de cada empresa/cliente (contas de resultado).",
        apoio: "O balancete de verificação importado já traz o plano de contas junto — código e descrição, sintéticas inclusive.",
      },
      {
        n: 7,
        texto: 'Classificar cada conta/grupo de contas em uma das cinco categorias (operacional, investimento, financiamento, tributos sobre o lucro, operações descontinuadas), usando a tabela "De-Para".',
        apoio: "Cada conta recebe categoria pelo grupo da DRE, com decisão manual por conta quando o padrão não serve.",
      },
      {
        n: 8,
        texto: "Identificar contas mistas (que hoje agregam receitas/despesas de naturezas diferentes) e desmembrá-las em subcontas.",
        apoio: "O detector de contas mistas cruza dois sinais: movimento nos dois sentidos e divergência entre o histórico dos lançamentos e a categoria da conta.",
      },
      { n: 9, texto: "Revisar o Plano de Contas Referencial do SPED (ECD/ECF) para manter a aderência entre a escrituração fiscal e a nova estrutura contábil." },
      {
        n: 10,
        texto: "Realizar a validação interna do mapeamento (contabilidade + TI) e consolidar a versão que será apresentada ao cliente na Fase 3.",
        apoio: "A cobertura mostra quantas contas estão categorizadas, quantas por decisão manual e quanto valor ainda depende de revisão.",
      },
    ],
    entregaveis: [
      "Planilha De-Para do plano de contas por empresa",
      "Plano de contas revisado (com nova segmentação por categoria)",
      "Versão consolidada da nova estrutura para apresentação ao cliente",
    ],
  },
  {
    id: "f3",
    titulo: "Apresentação, discussão e aprovação com o cliente",
    prazo: "30/09/2026",
    limite: "2026-09-30",
    responsavel: "Contabilidade + TI",
    objetivo:
      "Apresentar ao cliente o plano de contas reestruturado e o mapeamento De-Para, discutir os " +
      "pontos que envolvem julgamento e obter aprovação formal antes da parametrização.",
    passos: [
      {
        n: 11,
        texto: "Preparar o material de apresentação com o plano de contas revisado, a planilha De-Para e os impactos esperados na estrutura da DRE.",
        apoio: "A exportação CPC 51 gera, num arquivo só, a DRE nas duas estruturas, o De-Para e a política adotada.",
      },
      { n: 12, texto: "Conduzir reunião de apresentação e discussão com a diretoria/sócios e, quando aplicável, com os auditores externos." },
      {
        n: 13,
        texto: "Discutir e registrar os pontos que envolvem julgamento (classificação de contas mistas, categoria residual operacional e MPDA a divulgar).",
        apoio: "Os grupos que dependem de julgamento aparecem listados com o motivo, prontos para virar pauta.",
      },
      {
        n: 14,
        texto: "Incorporar os ajustes solicitados pelo cliente ao mapeamento e ao plano de contas.",
        apoio: "Mudar uma categoria refaz a demonstração e a conciliação na hora, sem reimportar nada.",
      },
      { n: 15, texto: "Obter a aprovação formal da nova estrutura, autorizando o início da parametrização nos ERPs (Fase 4)." },
    ],
    entregaveis: [
      "Material de apresentação ao cliente",
      "Ata da reunião com o registro das discussões e ajustes solicitados",
      "Aprovação formal do plano de contas ajustado",
    ],
  },
  {
    id: "f4",
    titulo: "Parametrização dos ERPs (Protheus/Sankhya/outros)",
    prazo: "Out-Nov/2026",
    limite: "2026-11-30",
    responsavel: "TI + Contabilidade",
    objetivo:
      "Configurar os sistemas contábeis/ERP para que a categorização do CPC 51 seja capturada " +
      "automaticamente no lançamento contábil, evitando reclassificação manual recorrente.",
    passos: [
      { n: 16, texto: "TOTVS Protheus (módulos SIGACTB/SIGATAF): criar ou ajustar o campo de natureza/categoria de conta contábil e o de-para com os grupos do CPC 51; revisar os itens contábeis (SX5) e as fórmulas de geração de relatórios gerenciais e do ECD/ECF; adequar no módulo financeiro e faturamento as novas contas, bem como explanar para as equipes o funcionamento do novo plano." },
      { n: 17, texto: "Sankhya: revisar a estrutura de naturezas de lançamento e os agrupamentos usados na geração das demonstrações contábeis (Balanço/DRE), assegurando que cada natureza esteja vinculada a uma categoria do CPC 51, bem como ajustar as TOPs necessárias." },
      { n: 18, texto: "Outros ERPs/sistemas legados: mapear campos equivalentes (centro de custo, natureza, classe de conta) e parametrizar a categoria correspondente; ajustar cada módulo necessário e explanar para a equipe responsável o novo funcionamento." },
      {
        n: 19,
        texto: "Ajustar layouts de relatórios gerenciais e de demonstrações contábeis para incluir os novos subtotais obrigatórios.",
        apoio: "O De-Para exportado serve de especificação para a parametrização: conta, grupo, categoria e origem da decisão.",
      },
      { n: 20, texto: "Testar a geração de relatórios em ambiente de homologação antes de liberar em produção." },
    ],
    entregaveis: [
      "Parametrização concluída em ambiente de teste",
      "Relatório de testes de geração de DRE segmentada",
      "Aprovação de TI e contabilidade para promoção a produção",
    ],
  },
  {
    id: "f5",
    titulo: "Demonstração piloto (dry run) com dados de 2026",
    prazo: "Out-Nov/2026",
    limite: "2026-11-30",
    responsavel: "Contabilidade",
    objetivo:
      "Simular a geração das demonstrações no novo formato usando dados reais de 2026, para " +
      "validar o mapeamento e treinar a equipe antes do exercício obrigatório.",
    passos: [
      {
        n: 21,
        texto: "Gerar uma DRE piloto de um período fechado (ex.: 1º semestre de 2026) na nova estrutura de categorias e subtotais.",
        apoio: "É a própria aba CPC 51: filtre a competência na etapa Conferir e a demonstração sai na estrutura nova.",
      },
      {
        n: 22,
        texto: "Comparar o resultado piloto com a DRE tradicional, verificando se o lucro líquido final permanece idêntico (o CPC 51 reclassifica, não altera o resultado total).",
        apoio: "A conciliação faz essa prova a cada render, e mostra conta a conta o que saiu e o que entrou no operacional.",
      },
      {
        n: 23,
        texto: 'Revisar itens classificados residualmente como "operacional" e confirmar se a classificação é apropriada.',
        apoio: "Os grupos marcados para revisão saem listados com o motivo, e o detalhe por conta abre embaixo de cada linha.",
      },
      {
        n: 24,
        texto: "Elaborar rascunho da nota explicativa de MPDA com os indicadores gerenciais já utilizados pela empresa.",
        apoio: "A minuta é gerada com a conciliação preenchida e as lacunas de efeito tributário marcadas para o contador completar.",
      },
      { n: 25, texto: "Colher feedback da diretoria e, se houver, dos auditores externos, ajustando o mapeamento conforme necessário." },
    ],
    entregaveis: [
      "DRE piloto no novo formato",
      "Relatório de divergências e ajustes necessários",
      "Minuta de nota explicativa de MPDA",
    ],
  },
  {
    id: "f6",
    titulo: "Validação, revisão, auditoria interna e reapresentação do 1º semestre de 2026 (DFs paralelas)",
    prazo: "30/11/2026",
    limite: "2026-11-30",
    responsavel: "Auditoria + Diretoria",
    objetivo:
      "Assegurar que a nova estrutura esteja tecnicamente correta e documentada, reapresentando " +
      "as demonstrações do 1º semestre de 2026 em formato paralelo (estrutura atual x CPC 51).",
    passos: [
      { n: 26, texto: "Realizar a revisão técnica final da política contábil de classificação e do plano de contas reestruturado." },
      { n: 27, texto: "Efetuar a validação cruzada com a área fiscal sobre eventuais impactos indiretos (incentivos fiscais, preços de transferência, lucro operacional x não operacional)." },
      { n: 28, texto: "Conduzir auditoria interna sobre a consistência do mapeamento e da parametrização no ERP." },
      {
        n: 29,
        texto: "Reapresentar as demonstrações do 1º semestre de 2026 em DFs paralelas (formato atual x formato CPC 51), confirmando que o lucro líquido permanece idêntico.",
        apoio: "A exportação traz a aba de DFs paralelas com as duas estruturas lado a lado e a prova do lucro líquido.",
      },
      { n: 30, texto: "Submeter as DFs paralelas à apreciação da diretoria, realizar os ajustes finais e obter a aprovação formal para adoção em produção." },
    ],
    entregaveis: [
      "Parecer técnico final de validação",
      "DFs paralelas do 1º semestre de 2026 (formato atual x CPC 51)",
      "Ata de aprovação da diretoria para adoção do novo padrão",
    ],
  },
  {
    id: "f7",
    titulo: "Reunião de alinhamento e estratégias com as partes relacionadas",
    prazo: "30/12/2026",
    limite: "2026-12-30",
    responsavel: "Contabilidade",
    objetivo:
      "Alinhar com todas as partes relacionadas ao plano de contas ajustado as estratégias, " +
      "responsabilidades e rotinas necessárias para a virada ao novo padrão em janeiro de 2027.",
    passos: [
      { n: 31, texto: "Convocar todas as partes relacionadas ao plano de contas ajustado (contabilidade, fiscal, TI, financeiro, faturamento, controladoria e diretoria)." },
      { n: 32, texto: "Apresentar os resultados das DFs paralelas do 1º semestre de 2026 e as lições aprendidas na demonstração piloto." },
      { n: 33, texto: "Alinhar responsabilidades, rotinas de lançamento e pontos de controle para o go-live." },
      { n: 34, texto: "Definir a estratégia de comunicação e o canal de suporte para dúvidas durante a transição." },
      { n: 35, texto: "Formalizar os compromissos assumidos e o plano de virada (cut-over) para o início de 2027." },
    ],
    entregaveis: [
      "Ata da reunião de alinhamento com as partes relacionadas",
      "Plano de virada (cut-over) aprovado para o go-live",
    ],
  },
  {
    id: "f8",
    titulo: "Go-live — primeiras demonstrações no novo padrão",
    prazo: "Jan-fev/2027",
    limite: "2027-02-28",
    responsavel: "Contabilidade",
    objetivo:
      "Adotar oficialmente o CPC 51 a partir do exercício iniciado em 1º de janeiro de 2027, com " +
      "a comparação obrigatória em relação a 2026.",
    passos: [
      { n: 36, texto: "Fechar o exercício de 2026 já com o de-para aplicado, permitindo gerar as demonstrações comparativas exigidas." },
      {
        n: 37,
        texto: "Gerar as demonstrações de 2027 (ou do primeiro período de apuração) já na estrutura do CPC 51.",
        apoio: "Mesma aba, mesmo fluxo: importar o razão ou o balancete do período e a demonstração sai categorizada.",
      },
      {
        n: 38,
        texto: "Publicar/entregar as demonstrações com as novas categorias, subtotais e nota de MPDA.",
        apoio: "Exportação em Excel com DRE CPC 51, paralelas, De-Para, MPDA e política; PDF pela impressão do navegador.",
      },
      { n: 39, texto: "Arquivar toda a documentação de suporte às classificações (memorandos, planilhas de mapeamento, pareceres)." },
    ],
    entregaveis: [
      "Demonstrações contábeis de 2027 em conformidade com o CPC 51",
      "Dossiê de implementação arquivado para fins de auditoria",
    ],
  },
  {
    id: "f9",
    titulo: "Revisão das execuções com as partes relacionadas",
    prazo: "Jan-fev/2027",
    limite: "2027-02-28",
    responsavel: "Contabilidade + Controladoria",
    objetivo:
      "Revisar a execução dos primeiros fechamentos no novo padrão e estabelecer a rotina de " +
      "conformidade contínua.",
    passos: [
      { n: 40, texto: "Revisar os primeiros fechamentos no novo padrão, identificando lançamentos classificados incorretamente e orientando as equipes responsáveis." },
      { n: 41, texto: "Realizar reuniões de revisão com todas as partes relacionadas ao plano de contas ajustado, tratando inconsistências e dúvidas de execução." },
      {
        n: 42,
        texto: "Revisar a classificação de novas contas criadas e reavaliar a definição e o cálculo das MPDA divulgadas.",
        apoio: "Conta nova cai na categoria padrão do grupo e aparece como pendente de revisão na cobertura.",
      },
      { n: 43, texto: "Acompanhar orientações complementares do CPC, CFC e CVM e eventuais manifestações da Receita Federal sobre efeitos fiscais indiretos." },
      { n: 44, texto: "Atualizar a política contábil de classificação e instituir rotina anual de revisão de conformidade com o CPC 51." },
    ],
    entregaveis: [
      "Relatório de revisão das execuções com as partes relacionadas",
      "Rotina anual de revisão de conformidade com o CPC 51",
      "Atualizações da política contábil documentadas",
    ],
  },
];

/** Chave de um item no mapa de status. Passo e entregável têm espaços de
 *  chave separados para um nunca sobrescrever o outro. */
export const chavePasso = (faseId, i) => `${faseId}.p${i}`;
export const chaveEntregavel = (faseId, i) => `${faseId}.e${i}`;

export const ESTADOS = [
  { id: "pendente", nome: "Pendente" },
  { id: "andamento", nome: "Em andamento" },
  { id: "feito", nome: "Concluído" },
];

/** Progresso de uma fase contando passos E entregáveis: um passo feito
 *  sem o entregável correspondente é trabalho que não sobrevive à
 *  auditoria, então os dois pesam igual. */
export function progressoFase(fase, status = {}) {
  const itens = [
    ...fase.passos.map((_, i) => chavePasso(fase.id, i)),
    ...fase.entregaveis.map((_, i) => chaveEntregavel(fase.id, i)),
  ];
  const feitos = itens.filter((k) => status[k] === "feito").length;
  const andamento = itens.filter((k) => status[k] === "andamento").length;
  return { total: itens.length, feitos, andamento, pct: itens.length ? feitos / itens.length : 0 };
}

export function progressoGeral(status = {}) {
  return FASES.reduce(
    (acc, f) => {
      const p = progressoFase(f, status);
      return { total: acc.total + p.total, feitos: acc.feitos + p.feitos, andamento: acc.andamento + p.andamento };
    },
    { total: 0, feitos: 0, andamento: 0 }
  );
}

const DIA = 24 * 60 * 60 * 1000;

/** Dias até a data-limite de uma fase. Negativo = prazo vencido.
 *
 *  Compara em UTC, com as duas datas normalizadas à meia-noite: sem isso,
 *  um prazo que vence hoje aparece como "vencido há 1 dia" dependendo da
 *  hora em que a tela é aberta — e prazo é justamente o campo em que uma
 *  imprecisão dessas destrói a confiança na ferramenta. */
export function diasPara(limiteISO, hoje = new Date()) {
  const [a, m, d] = limiteISO.split("-").map(Number);
  const limite = Date.UTC(a, m - 1, d);
  const agora = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((limite - agora) / DIA);
}

/** A fase em que o projeto está: a primeira ainda não concluída. Se todas
 *  estiverem concluídas, devolve null — e a tela diz isso em vez de
 *  apontar para a última fase como se ela estivesse aberta. */
export function faseAtual(status = {}) {
  return FASES.find((f) => progressoFase(f, status).pct < 1) || null;
}
