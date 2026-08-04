import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { agregarPorConta, competenciaLegivel, listarCompetencias, mapearColunas, parsearPlanoDeContas } from "./lib/parse.js";
import { importarArquivo, importarLinhasSimples } from "./lib/importarArquivo.js";
import { agruparPorDigito, montarDRE, sugerirClassificacao } from "./lib/classify.js";
import { montarBalanco } from "./lib/balanco.js";
import { baixarCSV } from "./lib/exportCsv.js";
import { useTema } from "./lib/useTema.js";
import { salvarNoHistorico, listarHistorico, removerDoHistorico, sincronizarHistorico } from "./lib/historico.js";
import { lerConfigGitHub } from "./lib/githubApi.js";

import { EtapaImportar } from "./components/EtapaImportar.jsx";
import { EtapaConferir } from "./components/EtapaConferir.jsx";
import { EtapaClassificar } from "./components/EtapaClassificar.jsx";
import { EtapaDRE } from "./components/EtapaDRE.jsx";
import { EtapaBalanco } from "./components/EtapaBalanco.jsx";
import { EtapaHorizontal } from "./components/EtapaHorizontal.jsx";
import { EtapaHistorico } from "./components/EtapaHistorico.jsx";

const ABAS = [
  ["importar", "1 · Importar"],
  ["conferir", "2 · Conferir"],
  ["classificar", "3 · Classificar"],
  ["dre", "4 · DRE"],
  ["balanco", "5 · Balanço"],
  ["horizontal", "6 · Horizontal"],
  ["historico", "7 · Histórico"],
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

  function importarPlano(file) {
    if (!file) return;
    importarLinhasSimples(file).then((linhasBrutas) => {
      setNomes((p) => ({ ...p, ...parsearPlanoDeContas(linhasBrutas) }));
    });
  }

  const { contas, tDeb, tCre, meses, ccs, nLinhas, competencias, contasPorCompetencia } = useMemo(
    () => agregarPorConta(linhas, map, filtroMes, filtroCC, filtroCompetencia),
    [linhas, map, filtroMes, filtroCC, filtroCompetencia]
  );

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
    () => (contasResultado.length ? sugerirClassificacao(contasResultado) : {}),
    [contasResultado]
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
            <div className="stamp">Partidas dobradas · CPC 26</div>
          </div>
        </header>

        <nav className="tabs">
          {ABAS.map(([id, nome]) => (
            <button key={id} className="tab" data-on={aba === id ? "1" : "0"}
              disabled={!["importar", "historico"].includes(id) && !temDados} onClick={() => setAba(id)}>
              {nome}
            </button>
          ))}
        </nav>

        {erro && <div className="err">{erro}</div>}

        {aba === "importar" && <EtapaImportar carregando={carregando} progresso={progresso} onImportar={importar} />}

        {aba === "conferir" && temDados && (
          <EtapaConferir
            arquivo={arquivo} nLinhas={nLinhas} contas={contas} dif={dif}
            meses={meses} ccs={ccs} filtroMes={filtroMes} filtroCC={filtroCC}
            competenciasDisponiveis={competenciasDisponiveis} filtroCompetencia={filtroCompetencia}
            onFiltroCompetencia={setFiltroCompetencia}
            empresa={empresa} cnpj={cnpj} map={map} cols={cols} nomes={nomes}
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
          <div className="empty"><b>Nenhum razão carregado</b>Importe um arquivo na etapa 1.</div>
        )}
      </div>
    </div>
  );
}
