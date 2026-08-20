import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { agregarPorConta, avisosDoMapeamento, listarCompetencias, mapearColunas, parsearPlanoDeContas } from "./lib/parse.js";
import { importarAbasSimples, importarArquivo, importarLinhasSimples } from "./lib/importarArquivo.js";
import { agruparPorDigito, montarDRE, provaIntegridade, sugerirClassificacao } from "./lib/classify.js";
import { coberturaBalancete, contasDeMovimento, detectarColunas, nomesDoBalancete, parsearBalancete, periodoDoBalancete } from "./lib/balancete.js";
import { baixarCSV, baixarExcel, periodoLegivel } from "./lib/exportacao.js";
import { POLITICA_PADRAO, coberturaCPC51, conciliar, contasMistas, deParaCPC51, fazerCategoriaDe, montarDRE51 } from "./lib/cpc51.js";
import { baixarCSVDePara, baixarExcelCPC51, baixarNotaMPDA } from "./lib/exportacaoCPC51.js";
import { comparativo51 } from "./lib/linhasCPC51.js";
import { montarDePara, porGrupo, resumoDePara } from "./lib/depara.js";
import { baixarCSVDeParaCompleto, baixarExcelDePara } from "./lib/exportacaoDePara.js";
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
import { FonteDados } from "./components/FonteDados.jsx";
import { EtapaComparativo } from "./components/EtapaComparativo.jsx";
import { EtapaHistorico } from "./components/EtapaHistorico.jsx";
import { EtapaCPC51 } from "./components/EtapaCPC51.jsx";
import { Cronograma51 } from "./components/Cronograma51.jsx";
import { DePara } from "./components/DePara.jsx";
import { Inicio } from "./components/Inicio.jsx";
import { Icone } from "./components/Icones.jsx";

/* A TRILHA É DADO, NÃO JSX.
 *
 * Antes eram três listas e três blocos de JSX quase idênticos, com a
 * regra de "esta aba abre quando?" escrita à mão dentro de cada um — três
 * expressões booleanas diferentes que ninguém conseguia comparar. Como
 * dado, acrescentar uma seção nova (o caminho do app virar ERP: cadastros,
 * fiscal, contas a pagar) é uma linha aqui e uma cláusula em
 * `abaDisponivel`, e não mais um bloco copiado.
 *
 * Cada seção agrupa abas que respondem à MESMA pergunta:
 *
 *   Fluxo       → "como eu chego na DRE?"      (sequencial, numerado)
 *   Análises    → "o que estes números dizem?"
 *   Parâmetros  → "para onde vai cada conta?"  (o De-Para; é daqui que
 *                  sai a parametrização do ERP)
 *   Arquivo     → "o que já foi fechado?"
 *   CPC 51      → "como isso fica em 2027?"
 *
 * Parâmetros ficou fora de Análises de propósito: De-Para não é leitura
 * de resultado, é cadastro — e cadastro que se procura em "Análises" é
 * cadastro que ninguém acha. */
const SECOES = [
  {
    id: "fluxo",
    rotulo: "Fluxo",
    // Só o fluxo é numerado: ele É sequencial. As outras seções são
    // vistas paralelas e recebem só o ícone, para não fingirem ser passos.
    numerado: true,
    abas: [
      ["importar", "Importar", "importar"],
      ["conferir", "Conferir", "conferir"],
      ["classificar", "Classificar", "classificar"],
      ["dre", "DRE", "dre"],
    ],
  },
  {
    id: "parametros",
    rotulo: "Parâmetros",
    abas: [["depara", "De-Para", "depara"]],
  },
  {
    /* Comparativa e Histórico respondem à mesma pergunta em dois tempos:
       como a DRE se moveu nos meses do arquivo aberto, e o que já foi
       fechado antes dele. Eram duas seções de um item cada depois do
       corte — uma seção inteira para uma linha é chrome, não navegação. */
    id: "acompanhamento",
    rotulo: "Acompanhamento",
    abas: [
      ["comparativo", "Comparativa", "comparativo"],
      ["historico", "Histórico", "historico"],
    ],
  },
  {
    id: "cpc51",
    rotulo: "CPC 51 · 2027",
    abas: [
      ["cpc51", "Demonstração", "cpc51"],
      ["plano", "Plano de ação", "plano"],
    ],
  },
];

/* Abas que não dependem de arquivo nenhum: abrem sempre. O Histórico lê
   o que já foi salvo; o plano de ação é do escritório, não do razão
   aberto; Início mostra justamente o estado de "ainda vazio". */
const SEMPRE_ABERTAS = ["inicio", "importar", "historico", "plano"];

/* O menu recolhido é preferência de quem usa, não estado do arquivo:
   sobrevive ao F5 e à troca de razão, e não entra na sessão em
   IndexedDB, que é só para dado do cliente. */
const CHAVE_MENU = "dre.menu.recolhido";
/* A mensagem que a tela mostra depois de ler um balancete.
 *
 * Ela responde três perguntas, nessa ordem, porque é a ordem em que elas
 * derrubam o trabalho de quem confere: o arquivo é consistente consigo
 * mesmo? ele cobre o que eu preciso? de que período ele é?
 *
 * A cobertura importa mais do que parece. O relatório de fechamento
 * costuma sair filtrado só nas contas 1 e 2, e nesse caso ele NÃO monta a
 * DRE. Sem este aviso o app mostraria uma DRE zerada, que é pior do que
 * não mostrar nada: parece resultado, não parece arquivo incompleto. */
function avisoDoBalancete(bal, periodo) {
  const r = bal.resumo;
  const partes = [
    `Balancete de verificação carregado: ${r.nContas} contas (${r.nFolhas} analíticas)` +
      (periodo?.legivel ? `, período de ${periodo.legivel}` : "") + ".",
  ];

  partes.push(
    r.integro
      ? "Conferência interna do arquivo: anterior + movimento = atual em todas as linhas, e cada conta sintética bate com suas filhas."
      : `Atenção: ${r.inconsistentes} linha(s) e ${r.sinteticasErradas} sintética(s) não fecham dentro do próprio arquivo.`
  );

  // A hierarquia não é dedutível só do código quando a máscara do
  // relatório é ambígua; quando o app precisa remontar um ramo para a
  // sintética fechar, ele diz que remontou — não é silencioso.
  if (bal.reconciliadas.length) {
    partes.push(
      `A hierarquia de ${bal.reconciliadas.length} ramo(s) foi remontada pelos próprios totais do arquivo ` +
      `(${bal.reconciliadas.map((m) => `${m.de} → ${m.para}`).join(", ")}), porque a numeração das contas sozinha não fechava.`
    );
  }

  /* A CONFERÊNCIA CRUZADA — a validação mais forte que este arquivo
     permite, e que só existe quando ele traz os dois lados.
     Δ(Ativo + Passivo) do período TEM que ser o resultado do período
     apurado pelas contas 3 a 7. São dois caminhos independentes para o
     mesmo número: se batem, a DRE que sai daqui está apoiada no
     patrimônio; se não batem, o arquivo tem problema antes de qualquer
     classificação. */
  if (r.resultadoConfere === true) {
    partes.push(
      "Conferência cruzada: o resultado do período apurado pelas contas de resultado bate com " +
      "a variação do patrimônio no mesmo período."
    );
  } else if (r.resultadoConfere === false) {
    partes.push(
      "Atenção: o resultado do período apurado pelas contas de resultado NÃO bate com a variação " +
      "do patrimônio no mesmo período. Confira o arquivo antes de usar esta DRE."
    );
  }

  /* A cobertura importa por um motivo só: a DRE precisa das contas de
     resultado. O relatório de fechamento costuma sair filtrado em 1 e 2,
     e nesse caso o app mostraria uma DRE zerada — que é pior do que não
     mostrar nada, porque parece resultado e não parece arquivo
     incompleto. */
  const cob = coberturaBalancete(bal);
  if (!cob.resultado) {
    partes.push(
      "Este arquivo traz só as contas patrimoniais (1 e 2), então não dá para montar a DRE com ele. " +
      "Exporte o mesmo relatório sem filtrar por conta, ou importe o razão."
    );
  }

  return partes.join(" ");
}

export default function App() {
  const [aba, setAba] = useState("inicio");
  // Gaveta no celular (fechada por padrão) e trilho recolhido no desktop
  // (lembrado entre sessões). São dois estados porque são dois gestos
  // diferentes: um é "abrir o menu", o outro é "ganhar largura de tela".
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenuRef = useRef(null);
  const [recolhido, setRecolhido] = useState(() => {
    try { return localStorage.getItem(CHAVE_MENU) === "1"; } catch { return false; }
  });
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
        // Volta sempre para o Início: é ele que diz, em uma linha, qual
        // arquivo está aberto e o que ficou pendente da última vez.
        setAba("inicio");
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
    try { localStorage.setItem(CHAVE_MENU, recolhido ? "1" : "0"); } catch { /* modo privado */ }
  }, [recolhido]);

  /* Trocar de aba fecha a gaveta do celular — senão o menu cobre a tela
     que a pessoa acabou de escolher. */
  function irPara(id) {
    setAba(id);
    setMenuAberto(false);
  }

  /* Fecha a gaveta com Esc e devolve o foco pro botão que a abriu — sem
     isso, quem navega por teclado fecha o menu e perde a posição do
     cursor, tendo que recomeçar do topo da página a cada vez. */
  function fecharMenu() {
    setMenuAberto(false);
    botaoMenuRef.current?.focus();
  }
  useEffect(() => {
    if (!menuAberto) return;
    function onEsc(e) { if (e.key === "Escape") fecharMenu(); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [menuAberto]);

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
        /* SÓ O BALANCETE COMPLETO ENTRA (o hierárquico, com saldo
           anterior, débito, crédito e saldo atual). Existia aqui um
           segundo caminho para o formato simples `código;saldo`, e ele
           servia a uma coisa só: dar saldo de abertura ao Balanço
           Patrimonial, tela que este app não tem mais. Um arquivo desse
           formato seria aceito e não produziria nada — pior que
           recusá-lo, porque o usuário acharia que carregou. */
        const completo = parsearBalancete(linhasBrutas);
        if (!completo) {
          setAbertura({
            saldos: {}, arquivo: "", balancete: null,
            aviso: "Não reconheci um balancete de verificação nesse arquivo. Ele precisa " +
              "trazer, por conta, o saldo anterior, o débito e o crédito do período e o saldo " +
              "atual — é o relatório que o sistema contábil emite para o fechamento.",
          });
          return;
        }
        setAbertura({
          saldos: completo.saldosAbertura,
          arquivo: file.name,
          balancete: completo,
          periodo,
          aviso: avisoDoBalancete(completo, periodo),
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
    setErro(""); setAvisoPerfil(""); setAba("inicio");
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

  /* A demonstração do CPC 51 de cada competência, para a coluna
     comparativa do Excel exportado — o mesmo desenho de
     `dresPorCompetencia`, um andar acima. `comparativo51` decide sozinho
     se existe período anterior de verdade; quando não existe, a coluna
     sai em branco em vez de comparar coisas diferentes. */
  const dres51PorCompetencia = useMemo(() => {
    return competencias.map((comp) => {
      const cs = (contasPorCompetencia[comp] || []).filter((c) => digitosResultado.includes(c.conta[0]));
      return { competencia: comp, dre51: montarDRE51(cs, grupoDe, categoriaDe) };
    });
  }, [competencias, contasPorCompetencia, digitosResultado, classif, sugestao, categoriaDe]);

  const ctxExport51 = {
    dre, dre51, conciliacao: conciliacao51, dePara: dePara51, medidas: medidas51,
    politica: politica51, empresa, cnpj, filtroMes, filtroCompetencia,
    competencias: competenciasDisponiveis, nomes: nomesEfetivos,
    comparativo: comparativo51(dres51PorCompetencia, filtroCompetencia),
  };

  /* ---------- De-Para ----------
     A mesma decisão das etapas Classificar e CPC 51, vista conta a conta
     e nos dois eixos ao mesmo tempo. Não é um terceiro estado: lê
     `grupoDe`, `tocadas` e `categoriaConta`, e escreve de volta nos
     mesmos setters — por isso reclassificar aqui refaz a DRE na hora. */
  const deParaLinhas = useMemo(
    () => montarDePara(contasResultado, {
      grupoDe, tocadas, categoriaPorConta: categoriaConta, politica: politica51, nomes: nomesEfetivos,
    }),
    [contasResultado, classif, sugestao, tocadas, categoriaConta, politica51, nomesEfetivos]
  );
  const placarDePara = useMemo(() => resumoDePara(deParaLinhas), [deParaLinhas]);
  const ctxDePara = { empresa, cnpj, filtroMes, filtroCompetencia, competencias: competenciasDisponiveis };

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
  // O balancete completo monta a DRE sozinho, sem razão — então a
  // demonstração não pode depender de ter havido importação de razão.
  const temBalancete = !!abertura.balancete;
  const prova = useMemo(() => provaIntegridade(contasResultado, grupoDe), [contasResultado, grupoDe]);

  /** Uma aba abre quando a fonte de que ela depende existe. Escrito uma
   *  vez, e não como expressão booleana repetida em cada ramo do
   *  `<main>` e do menu: eram duas cópias, e aba nova aberta no menu caía
   *  em tela branca quando alguém esquecia da segunda. */
  function abaDisponivel(id) {
    if (SEMPRE_ABERTAS.includes(id)) return true;
    /* A DRE e tudo que descende dela abrem com QUALQUER uma das duas
       fontes: o razão importado ou o balancete completo, que monta a
       demonstração sozinho. */
    return temDados || temBalancete;
  }

  /* O estado de cada aba, no próprio menu — agora como SELO, não frase.
     A pergunta continua a mesma ("onde tem trabalho me esperando?"), mas
     a resposta cabe num número: `3` contas a resolver diz o mesmo que
     "3 a resolver" e sobrevive ao menu recolhido, onde não há largura
     para texto nenhum. `alerta` pinta o selo de âmbar — nunca vermelho,
     que neste projeto pertence ao dado.

     `titulo` é o que o selo significa por extenso: vira `title` e
     `aria-label` do item, porque "3" sozinho não é acessível. */
  const estadoDaAba = useMemo(() => {
    const e = {};
    if (temDados && linhas.length && Math.abs(dif) >= 0.01) {
      e.conferir = { selo: "!", alerta: true, titulo: "partidas não fecham" };
    }
    if (contasResultado.length) {
      e.classificar = { selo: `${contasResultado.length}`, titulo: `${contasResultado.length} contas de resultado` };
      e.depara = placarDePara.pendente
        ? { selo: `${placarDePara.pendente}`, alerta: true, titulo: `${placarDePara.pendente} contas a resolver` }
        : { selo: "✓", titulo: "mapeamento completo" };
    }
    if (temDados && !conciliacao51.fecha) e.cpc51 = { selo: "!", alerta: true, titulo: "não concilia" };
    return e;
  }, [temDados, linhas.length, dif, contasResultado.length, placarDePara, conciliacao51.fecha]);

  /* O período, escrito uma vez: ele aparece na faixa de contexto do topo,
     no Início, na DRE, no CPC 51 e em todo
     arquivo exportado. Eram seis expressões — cinco delas com o mesmo
     defeito: usavam `meses` (a lista de DIAS do arquivo, um Set sem
     ordem cronológica — apesar do nome) como se fosse o período do
     arquivo, e mostravam ou uma centena de dias soltos ("01/jan, 01/fev,
     01/mar...") ou um intervalo de dois dias quase aleatórios
     ("01/jan a 29/mar" para um arquivo de janeiro a junho). Período é
     COMPETÊNCIA — `periodoLegivel()` (exportacao.js) usa
     `competenciasDisponiveis`, que já vem ordenada por mês/ano de
     verdade. */
  const periodo = periodoLegivel({ filtroMes, filtroCompetencia, competencias: competenciasDisponiveis });

  /* Um item do menu. Mesma marcação para o Início e para as abas das
     seções, para não haver dois jeitos de desenhar a mesma coisa. */
  function ItemMenu({ id, nome, ico, num }) {
    const livre = abaDisponivel(id);
    const est = livre ? estadoDaAba[id] : null;
    return (
      <button className="etapa" data-on={aba === id ? "1" : "0"}
        data-feito={id === "importar" && temDados ? "1" : "0"}
        aria-current={aba === id ? (num ? "step" : "page") : undefined}
        disabled={!livre} onClick={() => irPara(id)}
        aria-label={est?.titulo ? `${nome} — ${est.titulo}` : nome}
        title={livre ? (est?.titulo ? `${nome} — ${est.titulo}` : nome) : `${nome} — abre com um razão ou balancete importado`}>
        <span className="etapa-ico">
          <Icone nome={ico} />
          {num && <span className="etapa-num" aria-hidden="true">{num}</span>}
        </span>
        <span className="etapa-nome">{nome}</span>
        {est && <span className="etapa-selo" data-alerta={est.alerta ? "1" : "0"} aria-hidden="true">{est.selo}</span>}
      </button>
    );
  }

  return (
    <div className="dre-app" data-recolhido={recolhido ? "1" : "0"}>
      {/* Faixa do topo: identidade à esquerda, CONTEXTO no meio, ações à
          direita. O contexto é o que o parágrafo de apresentação antigo
          tentava dizer e nunca conseguia — qual arquivo, qual período,
          qual fonte —, agora em três selos clicáveis que levam à tela
          que muda cada um. */}
      <header className="topo">
        <div className="topo-in">
          <button ref={botaoMenuRef} className="topo-menu" aria-label="Abrir o menu" aria-expanded={menuAberto}
            onClick={() => (menuAberto ? fecharMenu() : setMenuAberto(true))}>
            <Icone nome={menuAberto ? "fechar" : "menu"} tamanho={20} />
          </button>

          <button className="marca-app" onClick={() => irPara("inicio")} title="Início">
            <span className="marca-glifo" aria-hidden="true">DRE</span>
            <span className="marca-nome">Gerador de DRE</span>
          </button>

          <div className="topo-ctx">
            {(arquivo || abertura.arquivo) && (
              <button className="ctx-chip" onClick={() => irPara("importar")} title="Trocar o arquivo">
                <Icone nome="dre" tamanho={14} />
                <span className="ctx-chip-txt">{arquivo || abertura.arquivo}</span>
              </button>
            )}
            {periodo && (
              <button className="ctx-chip" onClick={() => irPara("conferir")} disabled={!temDados} title="Mudar o período">
                <Icone nome="historico" tamanho={14} />
                <span className="ctx-chip-txt">{periodo}</span>
              </button>
            )}
            {temBalancete && (
              <button className="ctx-chip" data-forte="1" onClick={() => irPara("conferir")} title="Trocar a fonte dos dados">
                <Icone nome="balanco" tamanho={14} />
                <span className="ctx-chip-txt">{fonteEfetiva === "balancete" ? "Balancete" : "Razão"}</span>
              </button>
            )}
          </div>

          <div className="topo-acoes">
            {(temDados || temBalancete) && (
              <button className="ico-btn" onClick={limparTudo}
                aria-label="Limpar tudo"
                title="Apaga o razão, as classificações e os dados da empresa deste navegador">
                <Icone nome="lixo" />
              </button>
            )}
            <button className="ico-btn" onClick={() => setTema(tema === "dark" ? "light" : "dark")}
              aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
              title={tema === "dark" ? "Tema claro" : "Tema escuro"}>
              <Icone nome={tema === "dark" ? "sol" : "lua"} />
            </button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="app-grid">
          {/* Véu do celular: fecha a gaveta ao tocar fora dela. */}
          <div className="veu" data-on={menuAberto ? "1" : "0"} onClick={fecharMenu} aria-hidden="true" />

          <nav className="lateral" data-aberto={menuAberto ? "1" : "0"} aria-label="Seções do aplicativo">
            <div className="lateral-rolagem">
              <div className="trilha-grupo">
                <ItemMenu id="inicio" nome="Início" ico="inicio" />
              </div>

              {SECOES.map((secao) => (
                <div className="trilha-grupo" key={secao.id} role="group" aria-label={secao.rotulo}>
                  <div className="rotulo">{secao.rotulo}</div>
                  {secao.abas.map(([id, nome, ico], i) => (
                    <ItemMenu key={id} id={id} nome={nome} ico={ico} num={secao.numerado ? i + 1 : null} />
                  ))}
                </div>
              ))}
            </div>

            <button className="recolher" onClick={() => setRecolhido((v) => !v)}
              aria-label={recolhido ? "Expandir o menu" : "Recolher o menu"}
              title={recolhido ? "Expandir o menu" : "Recolher o menu"}>
              <Icone nome={recolhido ? "expandir" : "recolher"} tamanho={16} />
              <span className="etapa-nome">Recolher</span>
            </button>
          </nav>

          <main className="painel" key={aba}>
            {erro && <div className="err">{erro}</div>}

            {aba === "inicio" && (
              <Inicio
                arquivo={arquivo} arquivoBalancete={abertura.arquivo} empresa={empresa}
                periodo={periodo} temDados={temDados} temBalancete={temBalancete}
                temRazao={linhas.length > 0} nLinhas={nLinhas} nContas={contas.length}
                nContasResultado={contasResultado.length} dif={dif} placar={placarDePara}
                concilia={conciliacao51.fecha} dre={dre}
                onIr={irPara} disponivel={abaDisponivel}
              />
            )}

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
                onIrClassificar={() => irPara("classificar")}
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
                onGerarDRE={() => irPara("dre")}
                onLimparManuais={() => { setClassif({}); setTocadas({}); }}
                avisoPerfil={avisoPerfil} onAvisoPerfil={setAvisoPerfil}
                onSalvarPerfil={salvarPerfil} onAplicarPerfil={aplicarPerfil}
                onAplicarPlano={(p) => setPlanosExtras((ps) => [p, ...ps])} planoAtivo={planoAtivo}
              />
            )}

            {aba === "dre" && temDados && (
              <EtapaDRE
                dre={dre} empresa={empresa} cnpj={cnpj} periodo={periodo}
                filtroCC={filtroCC} tDeb={tDeb} tCre={tCre} dif={dif} nomes={nomesEfetivos}
                detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
                onBaixarCSV={() => baixarCSV({ dre, empresa, cnpj, filtroMes, filtroCompetencia, competencias: competenciasDisponiveis, nomes: nomesEfetivos })}
                onBaixarExcel={() => baixarExcel({ dre, empresa, cnpj, filtroMes, filtroCompetencia, competencias: competenciasDisponiveis, nomes: nomesEfetivos, dresPorCompetencia })}
                prova={prova}
                onSalvarHistorico={() => {
                  salvarNoHistorico({ empresa, cnpj, periodo, dre });
                  setHistorico(listarHistorico());
                }}
              />
            )}

            {aba === "depara" && temDados && (
              <DePara
                linhas={deParaLinhas} empresa={empresa} cnpj={cnpj}
                onClassificar={(conta, grupo) => {
                  setClassif({ ...classif, [conta]: grupo });
                  setTocadas({ ...tocadas, [conta]: true });
                }}
                onCategoriaConta={definirCategoria}
                onLimparCategorias={() => setCategoriaConta({})}
                onBaixarCSV={() => baixarCSVDeParaCompleto(deParaLinhas, ctxDePara)}
                onBaixarExcel={() => baixarExcelDePara(deParaLinhas, placarDePara, porGrupo(deParaLinhas), ctxDePara)}
              />
            )}

            {aba === "comparativo" && temDados && <EtapaComparativo dresPorCompetencia={dresPorCompetencia} />}

            {aba === "cpc51" && temDados && (
              <EtapaCPC51
                dre={dre} dre51={dre51} conciliacao={conciliacao51} mistas={mistas51}
                cobertura={cobertura51} politica={politica51} categoriaPorConta={categoriaConta}
                contasResultado={contasResultado} grupoDe={grupoDe} categoriaDe={categoriaDe}
                nomes={nomesEfetivos} empresa={empresa} cnpj={cnpj} periodo={periodo}
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
                onIrAoPlano={() => irPara("plano")}
              />
            )}

            {aba === "plano" && (
              <Cronograma51
                status={planoAcao}
                onStatus={(chave, valor) => setPlanoAcao((p) => ({ ...p, [chave]: valor }))}
                onLimpar={() => setPlanoAcao({})}
              />
            )}


            {aba === "historico" && (
              <EtapaHistorico
                historico={historico}
                onRemover={async (id) => { await removerDoHistorico(id); setHistorico(listarHistorico()); }}
                onSincronizado={() => setHistorico(listarHistorico())}
              />
            )}

            {/* Mesma regra da trilha, e não uma cópia dela: sem isso, uma
                aba nova aberta na trilha caía numa tela em branco aqui. */}
            {!abaDisponivel(aba) && (
              <div className="empty">
                <b>Nenhum arquivo carregado</b>
                <button className="btn" onClick={() => irPara("importar")}>Importar razão</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
