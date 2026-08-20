import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { agregarPorConta, avisosDoMapeamento, competenciaLegivel, listarCompetencias, mapearColunas, parsearPlanoDeContas } from "./lib/parse.js";
import { importarAbasSimples, importarArquivo, importarLinhasSimples } from "./lib/importarArquivo.js";
import { agruparPorDigito, montarDRE, provaIntegridade, sugerirClassificacao } from "./lib/classify.js";
import { montarBalanco } from "./lib/balanco.js";
import { parsearAbertura } from "./lib/abertura.js";
import { coberturaBalancete, contasAcumuladas, contasDeMovimento, detectarColunas, nomesDoBalancete, parsearBalancete, periodoDoBalancete } from "./lib/balancete.js";
import { baixarCSV, baixarExcel } from "./lib/exportacao.js";
import { POLITICA_PADRAO, coberturaCPC51, conciliar, contasMistas, deParaCPC51, fazerCategoriaDe, montarDRE51 } from "./lib/cpc51.js";
import { baixarCSVDePara, baixarExcelCPC51, baixarNotaMPDA } from "./lib/exportacaoCPC51.js";
import { lerPlanoAcao, salvarPlanoAcao } from "./lib/planoAcao.js";
import { useTema } from "./lib/useTema.js";
import { salvarNoHistorico, salvarOuAtualizar, listarHistorico, removerDoHistorico, sincronizarHistorico } from "./lib/historico.js";
import { lerConfigGitHub } from "./lib/githubApi.js";
import { lerSessao, limparSessao, salvarSessao } from "./lib/sessao.js";
import { baixarPerfil, montarPerfil } from "./lib/perfil.js";
import { escolherPlano } from "./lib/planoPerfil.js";
import { PLANOS_EMBUTIDOS } from "./lib/planos/iesb.js";

import { EtapaImportar } from "./components/EtapaImportar.jsx";
import { EtapaConferir } from "./components/EtapaConferir.jsx";
import { EtapaClassificar } from "./components/EtapaClassificar.jsx";
import { EtapaDRE } from "./components/EtapaDRE.jsx";
import { EtapaBalanco } from "./components/EtapaBalanco.jsx";
import { BalancoCompleto } from "./components/BalancoCompleto.jsx";
import { Painel } from "./components/Painel.jsx";
import { Arquivos } from "./components/Arquivos.jsx";
import { FonteDados } from "./components/FonteDados.jsx";
import { EtapaHorizontal } from "./components/EtapaHorizontal.jsx";
import { EtapaComparativo } from "./components/EtapaComparativo.jsx";
import { EtapaHistorico } from "./components/EtapaHistorico.jsx";
import { EtapaCPC51 } from "./components/EtapaCPC51.jsx";
import { Cronograma51 } from "./components/Cronograma51.jsx";

/** O fluxo é sequencial de verdade (1 → 4), então numeração aqui
 *  carrega informação. Balanço, Horizontal e Histórico são vistas
 *  paralelas sobre o mesmo estado — recebem outro marcador, não um
 *  número, pra não fingirem ser passos 5, 6 e 7. */
const FLUXO = [
  ["importar", "Importar"],
  ["conferir", "Conferir"],
  ["classificar", "Classificar"],
  ["dre", "DRE"],
];

const VISTAS = [
  ["painel", "Painel"],
  ["balanco", "Balanço"],
  ["horizontal", "Horizontal"],
  ["comparativo", "Comparativa"],
  ["historico", "Histórico"],
  ["arquivos", "Arquivos"],
];

/* O CPC 51 ganha grupo próprio na trilha, e não uma linha a mais em
   "Análises", porque não é outra leitura dos mesmos números: é a
   estrutura que a demonstração vai ter a partir de 2027. Misturar com
   Horizontal e Comparativa esconderia justamente o que precisa ficar
   visível todo dia até a virada. O plano de ação não depende de arquivo
   nenhum — abre mesmo sem razão importado. */
const VISTAS_CPC51 = [
  ["cpc51", "Demonstração CPC 51"],
  ["plano", "Plano de ação"],
];

/* A mensagem que a tela mostra depois de ler um balancete.
 *
 * Ela responde três perguntas, nessa ordem, porque é a ordem em que elas
 * derrubam o trabalho de quem confere: o arquivo é consistente consigo
 * mesmo? ele cobre o que eu preciso? de que período ele é?
 *
 * A cobertura importa mais do que parece. O relatório de fechamento
 * costuma sair filtrado só nas contas 1 e 2, e nesse caso ele monta o
 * Balanço mas NÃO a DRE. Sem este aviso o app mostraria uma DRE zerada,
 * que é pior do que não mostrar nada: parece resultado, não parece
 * arquivo incompleto. */
function avisoDoBalancete(bal, periodo) {
  const r = bal.resumo;
  const partes = [
    `Balancete de verificação carregado: ${r.nContas} contas (${r.nFolhas} analíticas)` +
      (periodo?.legivel ? `, período de ${periodo.legivel}` : "") + ".",
  ];

  partes.push(
    r.integro
      ? "Conferência interna: anterior + movimento = atual em todas as linhas, e as contas analíticas somam o total de cada grupo raiz."
      : `Atenção: ${r.inconsistentes} linha(s) não fecham (anterior + movimento ≠ atual) e ` +
        `${r.raizesErradas} grupo(s) raiz divergem da soma das suas analíticas.`
  );

  const cob = coberturaBalancete(bal);
  if (!cob.resultado) {
    partes.push(
      "Este arquivo traz só as contas patrimoniais, então dá para montar o Balanço mas não a DRE. " +
      "Para ter as duas, exporte o mesmo relatório sem filtrar por conta (da 1 até a 7)."
    );
  } else if (!cob.patrimonial) {
    partes.push(
      "Este arquivo traz só as contas de resultado, então dá para montar a DRE mas não o Balanço. " +
      "Para ter as duas, exporte o mesmo relatório sem filtrar por conta (da 1 até a 7)."
    );
  }

  return partes.join(" ");
}

export default function App() {
  const [aba, setAba] = useState("importar");
  const [linhas, setLinhas] = useState([]);
  const [cols, setCols] = useState([]);
  const [map, setMap] = useState({});
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [arquivo, setArquivo] = useState("");
  const [classif, setClassif] = useState({});
  const [tocadas, setTocadas] = useState({});
  const [resultadoManual, setResultadoManual] = useState({});
  const [nomes, setNomes] = useState({});
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroCC, setFiltroCC] = useState("todos");
  const [filtroCompetencia, setFiltroCompetencia] = useState("todas");
  const [busca, setBusca] = useState("");
  const [detalhado, setDetalhado] = useState(true);
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [progresso, setProgresso] = useState(null);
  const [tema, setTema] = useTema();
  const [historico, setHistorico] = useState(() => listarHistorico());
  const [sessaoCarregada, setSessaoCarregada] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState("");
  // Perfis carregados pelo usuário entram na frente dos embutidos, para
  // dar para corrigir um perfil embutido sem precisar de novo build.
  const [planosExtras, setPlanosExtras] = useState([]);
  const [abertura, setAbertura] = useState({ saldos: {}, arquivo: "", aviso: "" });
  /* CPC 51: a política é o julgamento da empresa, `categoriaConta` são as
     decisões conta a conta e `medidas` são as MPDA divulgadas. Os três são
     decisão, não dado importado — por isso viajam na sessão e no perfil,
     junto com a classificação manual. */
  const [politica51, setPolitica51] = useState(POLITICA_PADRAO);
  const [categoriaConta, setCategoriaConta] = useState({});
  const [medidas51, setMedidas51] = useState([]);
  const [planoAcao, setPlanoAcao] = useState(() => lerPlanoAcao());
  // "auto" resolve para balancete quando ele cobre as contas de resultado.
  const [fonte, setFonte] = useState("auto");
  /* O balancete traz o plano de contas junto — código e descrição de
     todas as contas, sintéticas inclusive. Como a classificação por
     código reconhece o plano pela ASSINATURA (o nome das contas-síntese
     de topo), carregar o balancete dispensa o arquivo separado de plano
     de contas. Entram por baixo do que o usuário importou à mão, que
     continua tendo a última palavra. */
  const nomesBalancete = useMemo(() => nomesDoBalancete(abertura.balancete), [abertura.balancete]);
  const nomesEfetivos = useMemo(() => ({ ...nomesBalancete, ...nomes }), [nomesBalancete, nomes]);

  const planos = useMemo(() => [...planosExtras, ...PLANOS_EMBUTIDOS], [planosExtras]);
  const planoAtivo = useMemo(() => escolherPlano(planos, nomesEfetivos), [planos, nomesEfetivos]);

  /* Restaura a sessão anterior antes de qualquer outra coisa. Enquanto
     isso não termina, nada é gravado — senão o estado vazio inicial
     sobrescreveria a sessão salva no primeiro render. */
  useEffect(() => {
    let vivo = true;
    lerSessao().then((s) => {
      if (!vivo) return;
      if (s) {
        setLinhas(s.linhas || []);
        setCols(s.cols || []);
        setMap(s.map || {});
        setArquivo(s.arquivo || "");
        setClassif(s.classif || {});
        setTocadas(s.tocadas || {});
        setNomes(s.nomes || {});
        setResultadoManual(s.resultadoManual || {});
        setEmpresa(s.empresa || "");
        setCnpj(s.cnpj || "");
        setFiltroMes(s.filtroMes || "todos");
        setFiltroCC(s.filtroCC || "todos");
        setFiltroCompetencia(s.filtroCompetencia || "todas");
        setAbertura(s.abertura || { saldos: {}, arquivo: "", aviso: "", balancete: null });
        setFonte(s.fonte || "auto");
        setPolitica51({ ...POLITICA_PADRAO, ...s.politica51 });
        setCategoriaConta(s.categoriaConta || {});
        setMedidas51(s.medidas51 || []);
        // Sessão só de balancete não tem razão para conferir: leva direto
        // ao Balanço, que é o que aquele arquivo entrega.
        setAba((s.linhas || []).length ? "conferir" : "balanco");
      }
      setSessaoCarregada(true);
    });
    return () => { vivo = false; };
  }, []);

  /* Grava a sessão a cada mudança relevante, com um respiro para não
     gravar a cada tecla digitada em Empresa/CNPJ. */
  useEffect(() => {
    if (!sessaoCarregada || (!linhas.length && !abertura.balancete)) return;
    const t = setTimeout(() => {
      salvarSessao({
        linhas, cols, map, arquivo, classif, tocadas, nomes, resultadoManual,
        empresa, cnpj, filtroMes, filtroCC, filtroCompetencia, abertura, fonte,
        politica51, categoriaConta, medidas51,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [sessaoCarregada, linhas, cols, map, arquivo, classif, tocadas, nomes,
      resultadoManual, empresa, cnpj, filtroMes, filtroCC, filtroCompetencia, abertura, fonte,
      politica51, categoriaConta, medidas51]);

  /* O andamento do plano de ação não é dado financeiro e não pertence ao
     arquivo aberto: fica em localStorage, sobrevive à troca de razão e
     não é apagado por "Limpar tudo". */
  useEffect(() => { salvarPlanoAcao(planoAcao); }, [planoAcao]);

  useEffect(() => {
    if (lerConfigGitHub()) {
      sincronizarHistorico().then((r) => { if (r.ok) setHistorico(listarHistorico()); }).catch(() => {});
    }
  }, []);

  async function importar(file) {
    if (!file) return;
    setCarregando(true);
    setErro("");
    setProgresso({ linhas: 0, pct: 0, tamanho: file.size });
    try {
      const { campos, linhas } = await importarArquivo(file, (p) => setProgresso((prev) => ({ ...prev, ...p })));
      if (!campos.length) throw new Error("Não encontrei cabeçalho no arquivo.");
      const m = mapearColunas(campos);
      if (!m.contaD && !m.contaC) throw new Error("Não identifiquei as colunas de conta. Ajuste o mapeamento abaixo.");
      setCols(campos);
      setMap(m);
      setLinhas(linhas);
      setArquivo(file.name);
      setClassif({});
      setTocadas({});
      setFiltroMes("todos");
      setFiltroCC("todos");
      setFiltroCompetencia("todas");
      setAba("conferir");
    } catch (e) {
      setErro(e.message || "Não consegui ler esse arquivo.");
    }
    setCarregando(false);
    setProgresso(null);
  }

  function salvarPerfil() {
    baixarPerfil(montarPerfil({
      nome: empresa || arquivo || "Perfil", classif, nomes: nomesEfetivos,
      categorias: categoriaConta, politica: politica51, medidas: medidas51,
    }));
  }

  function aplicarPerfil(perfil) {
    // O perfil sobrescreve a sugestão automática, e cada conta que ele
    // traz passa a contar como decisão manual — porque é isso que ela é:
    // alguém já decidiu, num mês anterior, para onde essa conta vai.
    setClassif((p) => ({ ...p, ...perfil.contas }));
    setTocadas((p) => {
      const novo = { ...p };
      Object.keys(perfil.contas).forEach((c) => { novo[c] = true; });
      return novo;
    });
    if (perfil.nomes && Object.keys(perfil.nomes).length) {
      setNomes((p) => ({ ...perfil.nomes, ...p }));
    }
    // As decisões do CPC 51 andam junto com as de classificação: quem
    // separou juros de mora de rendimento de aplicação em janeiro não
    // deve refazer isso em fevereiro.
    if (perfil.categorias && Object.keys(perfil.categorias).length) {
      setCategoriaConta((p) => ({ ...p, ...perfil.categorias }));
    }
    if (perfil.politica) setPolitica51((p) => ({ ...p, ...perfil.politica }));
    if (perfil.medidas?.length) setMedidas51(perfil.medidas);
  }

  function importarAbertura(file) {
    if (!file) return;
    /* Lê TODAS as abas: a dos dados é a que tem cabeçalho de balancete
       (não a primeira, porque o relatório vem com uma aba "Parametros" na
       frente), e é justamente essa aba de parâmetros que declara o
       período coberto pelo arquivo. */
    importarAbasSimples(file)
      .then((abas) => {
        const daAba = abas.find((a) => detectarColunas(a.linhas)) || abas[0];
        const linhasBrutas = daAba ? daAba.linhas : [];
        const periodo = periodoDoBalancete(abas);
        /* Tenta primeiro o balancete completo (hierárquico, com saldo
           anterior/débito/crédito/atual). Se o arquivo for esse, ele traz
           o Balanço inteiro pronto e vira a fonte da tela. Só se não for é
           que cai no formato simples código;saldo. O usuário não precisa
           saber qual dos dois tem em mãos. */
        const completo = parsearBalancete(linhasBrutas);
        if (completo) {
          setAbertura({
            saldos: completo.saldosAbertura,
            arquivo: file.name,
            balancete: completo,
            periodo,
            aviso: avisoDoBalancete(completo, periodo),
          });
          return;
        }
        const r = parsearAbertura(linhasBrutas);
        if (!r.lidas) {
          setAbertura({ saldos: {}, arquivo: "", aviso: "Não achei nenhuma conta nesse arquivo. O balancete precisa ter o código da conta na primeira coluna e o saldo na segunda (ou débito e crédito na segunda e terceira)." });
          return;
        }
        setAbertura({
          saldos: r.saldos,
          arquivo: file.name,
          balancete: null,
          aviso: `Balancete de abertura carregado: ${r.lidas} contas.` +
            (r.ignoradas ? ` ${r.ignoradas} linha(s) sem código numérico foram ignoradas (cabeçalho e títulos).` : ""),
        });
      })
      .catch(() => setAbertura({ saldos: {}, arquivo: "", aviso: "Não consegui ler esse arquivo de balancete." }));
  }

  async function limparTudo() {
    await limparSessao();
    setLinhas([]); setCols([]); setMap({}); setArquivo("");
    setClassif({}); setTocadas({}); setNomes({}); setResultadoManual({});
    setEmpresa(""); setCnpj("");
    setAbertura({ saldos: {}, arquivo: "", aviso: "", balancete: null });
    setFonte("auto");
    // Categorias, política e MPDA são decisões sobre ESTE cliente: saem
    // junto com o resto. O plano de ação não — ele é do escritório.
    setPolitica51(POLITICA_PADRAO); setCategoriaConta({}); setMedidas51([]);
    setFiltroMes("todos"); setFiltroCC("todos"); setFiltroCompetencia("todas");
    setErro(""); setAvisoPerfil(""); setAba("importar");
  }

  function importarPlano(file) {
    if (!file) return;
    setAvisoPerfil("");
    importarLinhasSimples(file)
      .then((linhasBrutas) => {
        const novos = parsearPlanoDeContas(linhasBrutas);
        const quantos = Object.keys(novos).length;
        if (!quantos) {
          setAvisoPerfil("Não achei nenhum par código/descrição nesse arquivo. O plano de contas precisa ter o código na primeira coluna e a descrição na segunda.");
          return;
        }
        setNomes((p) => ({ ...p, ...novos }));
        setAvisoPerfil(`Plano de contas importado: ${quantos} contas nomeadas.`);
      })
      .catch(() => setAvisoPerfil("Não consegui ler esse arquivo de plano de contas."));
  }

  const doRazao = useMemo(
    () => agregarPorConta(linhas, map, filtroMes, filtroCC, filtroCompetencia),
    [linhas, map, filtroMes, filtroCC, filtroCompetencia]
  );

  /* AS DUAS FONTES DESCREVEM O MESMO FATO.
     O razão soma lançamento a lançamento até chegar no movimento de cada
     conta; o balancete já traz esse movimento somado pela contabilidade.
     Por isso as duas alimentam `contas` no mesmo formato, e a DRE pode
     ser montada a partir de qualquer uma.

     O balancete é a fonte preferida quando cobre as contas de resultado:
     ele passou pelo fechamento, então é mais confiável que a soma que o
     app faz por conta própria. Mas ele é um retrato de UM período
     agregado — não tem competência mês a mês, nem centro de custo, nem
     lançamento individual. É por isso que o razão continua existindo, e
     não como redundância. */
  const cobertura = useMemo(() => coberturaBalancete(abertura.balancete), [abertura.balancete]);
  const balancetePodeDRE = cobertura.resultado;
  // Salvo escolha explícita pelo razão, o balancete manda quando pode.
  const fonteEfetiva = balancetePodeDRE && fonte !== "razao" ? "balancete" : "razao";

  const doBalancete = useMemo(
    () => contasDeMovimento(abertura.balancete),
    [abertura.balancete]
  );

  /* O MESMO balancete, lido pelo saldo acumulado em vez do movimento do
     período. Não é uma segunda fonte: é a outra pergunta que o mesmo
     arquivo responde — "quanto deu no ano até aqui", em vez de "quanto
     deu neste mês". É esta leitura que reproduz o Ativo − Passivo do
     balancete, e é contra ela que a prova cruzada do Balanço tem que ser
     feita. Comparar o acumulado do Balanço com a DRE do mês acusava
     divergência todo mês sem erro nenhum existir. */
  const doBalanceteAcumulado = useMemo(
    () => contasAcumuladas(abertura.balancete),
    [abertura.balancete]
  );

  const contas = fonteEfetiva === "balancete" ? doBalancete : doRazao.contas;
  const { tDeb, tCre, meses, ccs, nLinhas, competencias, contasPorCompetencia,
    debSemConta, creSemConta } = doRazao;

  const avisosMap = useMemo(() => avisosDoMapeamento(map, linhas), [map, linhas]);

  const competenciasDisponiveis = useMemo(() => listarCompetencias(linhas, map), [linhas, map]);

  const grupos1 = useMemo(() => agruparPorDigito(contas), [contas]);

  const digitosResultado = useMemo(() => {
    const auto = grupos1.filter((g) => g.digito >= "3" && g.digito <= "9").map((g) => g.digito);
    return grupos1.map((g) => g.digito).filter((d) => resultadoManual[d] ?? auto.includes(d));
  }, [grupos1, resultadoManual]);

  const contasResultado = useMemo(
    () => contas.filter((c) => digitosResultado.includes(c.conta[0])),
    [contas, digitosResultado]
  );

  const sugestao = useMemo(
    () => (contasResultado.length ? sugerirClassificacao(contasResultado, nomesEfetivos, planos) : {}),
    [contasResultado, nomesEfetivos, planos]
  );
  const grupoDe = (conta) => classif[conta] ?? sugestao[conta] ?? "IGNORAR";

  const dre = useMemo(
    () => montarDRE(contasResultado, grupoDe),
    [contasResultado, classif, sugestao]
  );

  /* DRE do exercício até a data do balancete, montada com a MESMA
     classificação da DRE do período — mudar de leitura não pode mudar em
     que linha cada conta cai. */
  const dreAcumulada = useMemo(() => {
    if (!abertura.balancete) return null;
    const cs = doBalanceteAcumulado.filter((c) => digitosResultado.includes(c.conta[0]));
    return cs.length ? montarDRE(cs, grupoDe) : null;
  }, [abertura.balancete, doBalanceteAcumulado, digitosResultado, classif, sugestao]);

  /* HISTÓRICO SE ALIMENTA SOZINHO AO LER UM BALANCETE.
     O balancete declara o próprio período, então não há o que perguntar
     ao usuário: assim que um arquivo com contas de resultado é lido e
     classificado, o retrato daquele mês entra no histórico.

     A chave é o período, não o clique. Reimportar o mesmo mês atualiza a
     linha em vez de duplicar, e reclassificar uma conta depois corrige o
     retrato — senão o histórico guardaria para sempre a versão anterior à
     correção, que é justamente a errada.

     Espera `sessaoCarregada` pelo mesmo motivo que a gravação da sessão
     espera: antes disso o estado ainda é o vazio do primeiro render. */
  useEffect(() => {
    if (!sessaoCarregada || !abertura.balancete) return;
    const periodo = abertura.periodo?.legivel;
    if (!periodo || !contasResultado.length) return;
    const chave = `balancete|${empresa || "sem-empresa"}|${periodo}`;
    if (salvarOuAtualizar({ empresa, cnpj, periodo, dre, chave })) {
      setHistorico(listarHistorico());
    }
  }, [sessaoCarregada, abertura.balancete, abertura.periodo, contasResultado, dre, empresa, cnpj]);

  /* ---------- CPC 51 ----------
     A categoria é um eixo PARALELO ao grupo: a mesma conta tem um grupo
     (a linha da DRE atual) e uma categoria (o bloco do CPC 51). As duas
     demonstrações leem exatamente as mesmas contas — é isso que faz o
     lucro líquido ser idêntico nas duas, e `conciliar` prova isso a cada
     render em vez de confiar. */
  const categoriaDe = useMemo(
    () => fazerCategoriaDe({ grupoDe, categoriaPorConta: categoriaConta, politica: politica51 }),
    [classif, sugestao, categoriaConta, politica51]
  );

  const dre51 = useMemo(
    () => montarDRE51(contasResultado, grupoDe, categoriaDe),
    [contasResultado, classif, sugestao, categoriaDe]
  );

  const conciliacao51 = useMemo(
    () => conciliar(dre, dre51, contasResultado, grupoDe, categoriaDe),
    [dre, dre51, contasResultado, classif, sugestao, categoriaDe]
  );

  /* A leitura por TEXTO (sem perfil de plano de contas) serve só ao
     detector de contas mistas: ela é a segunda opinião que se confronta
     com a categoria efetiva. Roda apenas com a aba aberta, porque é uma
     passada de regex por todas as contas do razão e nenhuma outra tela
     precisa dela. */
  const sugestaoTexto = useMemo(
    () => (aba === "cpc51" && contasResultado.length ? sugerirClassificacao(contasResultado, nomesEfetivos, []) : {}),
    [aba, contasResultado, nomesEfetivos]
  );

  const mistas51 = useMemo(
    () => contasMistas(contasResultado, { grupoDe, categoriaDe, sugestaoTexto, politica: politica51 }),
    [contasResultado, classif, sugestao, categoriaDe, sugestaoTexto, politica51]
  );

  const cobertura51 = useMemo(
    () => coberturaCPC51(contasResultado, { grupoDe, categoriaPorConta: categoriaConta, politica: politica51 }),
    [contasResultado, classif, sugestao, categoriaConta, politica51]
  );

  const dePara51 = useMemo(
    () => deParaCPC51(contasResultado, { grupoDe, categoriaPorConta: categoriaConta, politica: politica51, nomes: nomesEfetivos }),
    [contasResultado, classif, sugestao, categoriaConta, politica51, nomesEfetivos]
  );

  const ctxExport51 = {
    dre, dre51, conciliacao: conciliacao51, dePara: dePara51, medidas: medidas51,
    politica: politica51, empresa, cnpj, filtroMes, meses, filtroCompetencia, nomes: nomesEfetivos,
  };

  function definirCategoria(conta, categoria) {
    setCategoriaConta((p) => {
      const novo = { ...p };
      if (categoria) novo[conta] = categoria;
      else delete novo[conta]; // volta ao padrão do grupo
      return novo;
    });
  }

  /* Um ajuste por grupo, no máximo: pedir "excluir Depreciação" numa
     medida que já a inclui é trocar de intenção, não empilhar duas
     linhas que se anulam na conciliação. */
  function ajustarMedida(id, grupo, modo) {
    setMedidas51((ms) =>
      ms.map((m) =>
        m.id === id
          ? { ...m, ajustes: [...(m.ajustes || []).filter((a) => a.id !== grupo), { tipo: "grupo", id: grupo, modo }] }
          : m
      )
    );
  }

  const balanco = useMemo(() => montarBalanco(contas, abertura.saldos), [contas, abertura]);

  const dresPorCompetencia = useMemo(() => {
    return competencias.map((comp) => {
      const cs = contasPorCompetencia[comp] || [];
      const csResultado = cs.filter((c) => digitosResultado.includes(c.conta[0]));
      const g = (conta) => classif[conta] ?? sugestao[conta] ?? "IGNORAR";
      return { competencia: comp, dre: montarDRE(csResultado, g) };
    });
  }, [competencias, contasPorCompetencia, digitosResultado, classif, sugestao]);

  const dif = tDeb - tCre;
  const temDados = contas.length > 0;
  // O balancete completo desenha o Balanço sozinho, sem razão — então a
  // vista Balanço não pode depender de ter havido importação de razão.
  const temBalancete = !!abertura.balancete;
  const prova = useMemo(() => provaIntegridade(contasResultado, grupoDe), [contasResultado, grupoDe]);

  return (
    <div className="dre-app">
      <div className="wrap">
        <header className="masthead">
          <div>
            <h1>Gerador de DRE</h1>
            <p>
              Importe o razão contábil, confira as partidas e classifique as contas de resultado.
              A demonstração sai pronta, com análise vertical e detalhe por conta.
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn ghost theme-btn" onClick={() => setTema(tema === "dark" ? "light" : "dark")}
              aria-label="Alternar tema claro/escuro">
              {tema === "dark" ? "Modo claro" : "Modo escuro"}
            </button>
            {temDados && (
              <button className="btn ghost" onClick={limparTudo}
                title="Apaga o razão, as classificações e os dados da empresa deste navegador">
                Limpar tudo
              </button>
            )}
            <div className="selo rotulo">Partidas dobradas · CPC 26</div>
          </div>
        </header>

        <div className="app-grid">
          <nav className="trilha" aria-label="Etapas e vistas">
            <div className="trilha-grupo">
              <div className="rotulo">Fluxo</div>
              {FLUXO.map(([id, nome], i) => (
                <button key={id} className="etapa" data-on={aba === id ? "1" : "0"}
                  data-feito={id === "importar" && temDados ? "1" : "0"}
                  aria-current={aba === id ? "step" : undefined}
                  disabled={id !== "importar" && !temDados} onClick={() => setAba(id)}>
                  <span className="etapa-num">{i + 1}</span>
                  <span className="etapa-txt">
                    <span className="etapa-nome">{nome}</span>
                    {id === "importar" && arquivo && <span className="etapa-sub">{arquivo}</span>}
                  </span>
                </button>
              ))}
            </div>

            <div className="trilha-grupo">
              <div className="rotulo">Análises</div>
              {VISTAS.map(([id, nome]) => (
                <button key={id} className="etapa" data-on={aba === id ? "1" : "0"}
                  aria-current={aba === id ? "page" : undefined}
                  disabled={!["historico", "arquivos"].includes(id) && !temDados && !(["balanco", "painel"].includes(id) && temBalancete)}
                  onClick={() => setAba(id)}>
                  <span className="etapa-marca" />
                  <span className="etapa-txt">
                    <span className="etapa-nome">{nome}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="trilha-grupo">
              <div className="rotulo">CPC 51 · 2027</div>
              {VISTAS_CPC51.map(([id, nome]) => (
                <button key={id} className="etapa" data-on={aba === id ? "1" : "0"}
                  aria-current={aba === id ? "page" : undefined}
                  disabled={id !== "plano" && !temDados}
                  onClick={() => setAba(id)}>
                  <span className="etapa-marca" />
                  <span className="etapa-txt">
                    <span className="etapa-nome">{nome}</span>
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <main className="painel">
            {erro && <div className="err">{erro}</div>}

            {aba === "importar" && <EtapaImportar carregando={carregando} progresso={progresso} onImportar={importar}
                onImportarBalancete={importarAbertura} abertura={abertura} />}

            {["conferir", "classificar", "dre"].includes(aba) && (temDados || temBalancete) && (
              <FonteDados
                fonteEfetiva={fonteEfetiva} cobertura={cobertura}
                temRazao={linhas.length > 0} temBalancete={temBalancete}
                arquivoBalancete={abertura.arquivo} onFonte={setFonte}
              />
            )}

            {aba === "conferir" && temDados && (
              <EtapaConferir
                arquivo={arquivo} nLinhas={nLinhas} contas={contas} dif={dif} tDeb={tDeb} tCre={tCre}
                meses={meses} ccs={ccs} filtroMes={filtroMes} filtroCC={filtroCC}
                competenciasDisponiveis={competenciasDisponiveis} filtroCompetencia={filtroCompetencia}
                onFiltroCompetencia={setFiltroCompetencia}
                empresa={empresa} cnpj={cnpj} map={map} cols={cols} nomes={nomesEfetivos}
                avisosMap={avisosMap} debSemConta={debSemConta} creSemConta={creSemConta}
                semRazao={fonteEfetiva === "balancete" && linhas.length === 0}
                onFiltroMes={setFiltroMes} onFiltroCC={setFiltroCC}
                onEmpresa={setEmpresa} onCnpj={setCnpj} onMap={setMap}
                onIrClassificar={() => setAba("classificar")}
              />
            )}

            {aba === "classificar" && temDados && (
              <EtapaClassificar
                grupos1={grupos1} digitosResultado={digitosResultado}
                resultadoManual={resultadoManual} onResultadoManual={setResultadoManual}
                contasResultado={contasResultado} grupoDe={grupoDe} tocadas={tocadas} nomes={nomesEfetivos}
                busca={busca} onBusca={setBusca}
                onClassificar={(conta, grupo) => {
                  setClassif({ ...classif, [conta]: grupo });
                  setTocadas({ ...tocadas, [conta]: true });
                }}
                onImportarPlano={importarPlano}
                onGerarDRE={() => setAba("dre")}
                onLimparManuais={() => { setClassif({}); setTocadas({}); }}
                avisoPerfil={avisoPerfil} onAvisoPerfil={setAvisoPerfil}
                onSalvarPerfil={salvarPerfil} onAplicarPerfil={aplicarPerfil}
                onAplicarPlano={(p) => setPlanosExtras((ps) => [p, ...ps])} planoAtivo={planoAtivo}
              />
            )}

            {aba === "dre" && temDados && (
              <EtapaDRE
                dre={dre} empresa={empresa} cnpj={cnpj} filtroMes={filtroMes} meses={meses}
                filtroCC={filtroCC} filtroCompetencia={filtroCompetencia} tDeb={tDeb} tCre={tCre} dif={dif} nomes={nomesEfetivos}
                detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
                onBaixarCSV={() => baixarCSV({ dre, empresa, cnpj, filtroMes, meses, nomes: nomesEfetivos, filtroCompetencia })}
                onBaixarExcel={() => baixarExcel({ dre, empresa, cnpj, filtroMes, meses, nomes: nomesEfetivos, filtroCompetencia, dresPorCompetencia })}
                prova={prova}
                onSalvarHistorico={() => {
                  const periodo = filtroCompetencia !== "todas"
                    ? competenciaLegivel(filtroCompetencia)
                    : (filtroMes === "todos" ? meses.join(", ") : filtroMes);
                  salvarNoHistorico({ empresa, cnpj, periodo, dre });
                  setHistorico(listarHistorico());
                }}
              />
            )}

            {aba === "painel" && (temDados || temBalancete) && (
              <Painel dre={dre} temDados={temDados} balancete={abertura.balancete}
                dresPorCompetencia={dresPorCompetencia} empresa={empresa}
                periodo={filtroCompetencia !== "todas" ? competenciaLegivel(filtroCompetencia)
                  : (meses.length ? `${meses[0]} a ${meses[meses.length - 1]}` : "")} />
            )}

            {aba === "balanco" && (temDados || temBalancete) && (
              abertura.balancete
                ? <BalancoCompleto bal={abertura.balancete} arquivo={abertura.arquivo}
                    lucroLiquido={dreAcumulada ? dreAcumulada.liquido : (temDados ? dre.liquido : null)}
                    lucroLiquidoDoMes={temDados ? dre.liquido : null}
                    onTrocar={() => setAbertura({ saldos: {}, arquivo: "", aviso: "", balancete: null })} />
                : <EtapaBalanco balanco={balanco} filtroCompetencia={filtroCompetencia}
                    abertura={abertura} onImportarAbertura={importarAbertura} />
            )}

            {aba === "horizontal" && temDados && <EtapaHorizontal dresPorCompetencia={dresPorCompetencia} />}

            {aba === "comparativo" && temDados && <EtapaComparativo dresPorCompetencia={dresPorCompetencia} />}

            {aba === "cpc51" && temDados && (
              <EtapaCPC51
                dre={dre} dre51={dre51} conciliacao={conciliacao51} mistas={mistas51}
                cobertura={cobertura51} politica={politica51} categoriaPorConta={categoriaConta}
                contasResultado={contasResultado} grupoDe={grupoDe} categoriaDe={categoriaDe}
                nomes={nomesEfetivos} empresa={empresa} cnpj={cnpj}
                filtroMes={filtroMes} meses={meses} filtroCompetencia={filtroCompetencia}
                detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
                medidas={medidas51}
                onPolitica={setPolitica51}
                onCategoriaConta={definirCategoria}
                onLimparCategorias={() => setCategoriaConta({})}
                onAdicionarMedida={(modelo) => setMedidas51((ms) => [...ms, { ...modelo }])}
                onRemoverMedida={(id) => setMedidas51((ms) => ms.filter((m) => m.id !== id))}
                onAjusteMedida={ajustarMedida}
                onRemoverAjuste={(id, grupo) =>
                  setMedidas51((ms) => ms.map((m) =>
                    m.id === id ? { ...m, ajustes: (m.ajustes || []).filter((a) => a.id !== grupo) } : m))}
                onBaixarExcel={() => baixarExcelCPC51(ctxExport51)}
                onBaixarDePara={() => baixarCSVDePara(dePara51, ctxExport51)}
                onBaixarNota={() => baixarNotaMPDA(medidas51, dre51, ctxExport51)}
                onIrAoPlano={() => setAba("plano")}
              />
            )}

            {aba === "plano" && (
              <Cronograma51
                status={planoAcao}
                onStatus={(chave, valor) => setPlanoAcao((p) => ({ ...p, [chave]: valor }))}
                onLimpar={() => setPlanoAcao({})}
              />
            )}

            {aba === "arquivos" && <Arquivos />}

            {aba === "historico" && (
              <EtapaHistorico
                historico={historico}
                onRemover={async (id) => { await removerDoHistorico(id); setHistorico(listarHistorico()); }}
                onSincronizado={() => setHistorico(listarHistorico())}
              />
            )}

            {!temDados && !(["balanco", "painel"].includes(aba) && temBalancete) && !["importar", "historico", "arquivos", "plano"].includes(aba) && (
              <div className="empty">
                <b>Nenhum razão carregado</b>
                Comece pela etapa 1, Importar — as outras telas se abrem sozinhas assim que o
                arquivo entrar.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
