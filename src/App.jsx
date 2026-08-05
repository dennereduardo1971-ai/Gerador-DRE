import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { agregarPorConta, avisosDoMapeamento, competenciaLegivel, listarCompetencias, mapearColunas, parsearPlanoDeContas } from "./lib/parse.js";
import { importarArquivo, importarLinhasSimples } from "./lib/importarArquivo.js";
import { agruparPorDigito, montarDRE, sugerirClassificacao } from "./lib/classify.js";
import { montarBalanco } from "./lib/balanco.js";
import { baixarCSV } from "./lib/exportCsv.js";
import { useTema } from "./lib/useTema.js";
import { salvarNoHistorico, listarHistorico, removerDoHistorico, sincronizarHistorico } from "./lib/historico.js";
import { lerConfigGitHub } from "./lib/githubApi.js";
import { lerSessao, limparSessao, salvarSessao } from "./lib/sessao.js";
import { baixarPerfil, montarPerfil } from "./lib/perfil.js";

import { EtapaImportar } from "./components/EtapaImportar.jsx";
import { EtapaConferir } from "./components/EtapaConferir.jsx";
import { EtapaClassificar } from "./components/EtapaClassificar.jsx";
import { EtapaDRE } from "./components/EtapaDRE.jsx";
import { EtapaBalanco } from "./components/EtapaBalanco.jsx";
import { EtapaHorizontal } from "./components/EtapaHorizontal.jsx";
import { EtapaHistorico } from "./components/EtapaHistorico.jsx";

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
  ["balanco", "Balanço"],
  ["horizontal", "Horizontal"],
  ["historico", "Histórico"],
];

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
        setAba("conferir");
      }
      setSessaoCarregada(true);
    });
    return () => { vivo = false; };
  }, []);

  /* Grava a sessão a cada mudança relevante, com um respiro para não
     gravar a cada tecla digitada em Empresa/CNPJ. */
  useEffect(() => {
    if (!sessaoCarregada || !linhas.length) return;
    const t = setTimeout(() => {
      salvarSessao({
        linhas, cols, map, arquivo, classif, tocadas, nomes, resultadoManual,
        empresa, cnpj, filtroMes, filtroCC, filtroCompetencia,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [sessaoCarregada, linhas, cols, map, arquivo, classif, tocadas, nomes,
      resultadoManual, empresa, cnpj, filtroMes, filtroCC, filtroCompetencia]);

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
    baixarPerfil(montarPerfil({ nome: empresa || arquivo || "Perfil", classif, nomes }));
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
  }

  async function limparTudo() {
    await limparSessao();
    setLinhas([]); setCols([]); setMap({}); setArquivo("");
    setClassif({}); setTocadas({}); setNomes({}); setResultadoManual({});
    setEmpresa(""); setCnpj("");
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

  const {
    contas, tDeb, tCre, meses, ccs, nLinhas, competencias, contasPorCompetencia,
    debSemConta, creSemConta,
  } = useMemo(
    () => agregarPorConta(linhas, map, filtroMes, filtroCC, filtroCompetencia),
    [linhas, map, filtroMes, filtroCC, filtroCompetencia]
  );

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
    () => (contasResultado.length ? sugerirClassificacao(contasResultado, nomes) : {}),
    [contasResultado, nomes]
  );
  const grupoDe = (conta) => classif[conta] ?? sugestao[conta] ?? "IGNORAR";

  const dre = useMemo(
    () => montarDRE(contasResultado, grupoDe),
    [contasResultado, classif, sugestao]
  );

  const balanco = useMemo(() => montarBalanco(contas), [contas]);

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
  const contasIgnoradas = contasResultado.filter((c) => grupoDe(c.conta) === "IGNORAR").length;

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
                  disabled={id !== "historico" && !temDados} onClick={() => setAba(id)}>
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

            {aba === "importar" && <EtapaImportar carregando={carregando} progresso={progresso} onImportar={importar} />}

            {aba === "conferir" && temDados && (
              <EtapaConferir
                arquivo={arquivo} nLinhas={nLinhas} contas={contas} dif={dif} tDeb={tDeb} tCre={tCre}
                meses={meses} ccs={ccs} filtroMes={filtroMes} filtroCC={filtroCC}
                competenciasDisponiveis={competenciasDisponiveis} filtroCompetencia={filtroCompetencia}
                onFiltroCompetencia={setFiltroCompetencia}
                empresa={empresa} cnpj={cnpj} map={map} cols={cols} nomes={nomes}
                avisosMap={avisosMap} debSemConta={debSemConta} creSemConta={creSemConta}
                onFiltroMes={setFiltroMes} onFiltroCC={setFiltroCC}
                onEmpresa={setEmpresa} onCnpj={setCnpj} onMap={setMap}
                onIrClassificar={() => setAba("classificar")}
              />
            )}

            {aba === "classificar" && temDados && (
              <EtapaClassificar
                grupos1={grupos1} digitosResultado={digitosResultado}
                resultadoManual={resultadoManual} onResultadoManual={setResultadoManual}
                contasResultado={contasResultado} grupoDe={grupoDe} tocadas={tocadas} nomes={nomes}
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
              />
            )}

            {aba === "dre" && temDados && (
              <EtapaDRE
                dre={dre} empresa={empresa} cnpj={cnpj} filtroMes={filtroMes} meses={meses}
                filtroCC={filtroCC} filtroCompetencia={filtroCompetencia} tDeb={tDeb} tCre={tCre} dif={dif} nomes={nomes}
                detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
                onBaixarCSV={() => baixarCSV({ dre, empresa, cnpj, filtroMes, meses, nomes })}
                contasIgnoradas={contasIgnoradas}
                onSalvarHistorico={() => {
                  const periodo = filtroCompetencia !== "todas"
                    ? competenciaLegivel(filtroCompetencia)
                    : (filtroMes === "todos" ? meses.join(", ") : filtroMes);
                  salvarNoHistorico({ empresa, cnpj, periodo, dre });
                  setHistorico(listarHistorico());
                }}
              />
            )}

            {aba === "balanco" && temDados && <EtapaBalanco balanco={balanco} filtroCompetencia={filtroCompetencia} />}

            {aba === "horizontal" && temDados && <EtapaHorizontal dresPorCompetencia={dresPorCompetencia} />}

            {aba === "historico" && (
              <EtapaHistorico
                historico={historico}
                onRemover={async (id) => { await removerDoHistorico(id); setHistorico(listarHistorico()); }}
                onSincronizado={() => setHistorico(listarHistorico())}
              />
            )}

            {!temDados && !["importar", "historico"].includes(aba) && (
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
