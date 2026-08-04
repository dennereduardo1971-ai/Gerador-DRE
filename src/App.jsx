import { useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

import { agregarPorConta, lerTexto, mapearColunas, parsearPlanoDeContas } from "./lib/parse.js";
import { agruparPorDigito, montarDRE, sugerirClassificacao } from "./lib/classify.js";
import { baixarCSV } from "./lib/exportCsv.js";

import { EtapaImportar } from "./components/EtapaImportar.jsx";
import { EtapaConferir } from "./components/EtapaConferir.jsx";
import { EtapaClassificar } from "./components/EtapaClassificar.jsx";
import { EtapaDRE } from "./components/EtapaDRE.jsx";

const ABAS = [
  ["importar", "1 · Importar"],
  ["conferir", "2 · Conferir"],
  ["classificar", "3 · Classificar"],
  ["dre", "4 · DRE"],
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
  const [busca, setBusca] = useState("");
  const [detalhado, setDetalhado] = useState(true);
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");

  async function importar(file) {
    if (!file) return;
    setCarregando(true);
    setErro("");
    try {
      const txt = await lerTexto(file);
      const r = Papa.parse(txt, { header: true, skipEmptyLines: true, delimiter: "" });
      const campos = (r.meta.fields || []).filter((f) => f && f.trim());
      if (!campos.length) throw new Error("Não encontrei cabeçalho no arquivo.");
      const m = mapearColunas(campos);
      if (!m.contaD && !m.contaC) throw new Error("Não identifiquei as colunas de conta. Ajuste o mapeamento abaixo.");
      setCols(campos);
      setMap(m);
      setLinhas(r.data);
      setArquivo(file.name);
      setClassif({});
      setTocadas({});
      setFiltroMes("todos");
      setFiltroCC("todos");
      setAba("conferir");
    } catch (e) {
      setErro(e.message || "Não consegui ler esse arquivo.");
    }
    setCarregando(false);
  }

  function importarPlano(file) {
    if (!file) return;
    lerTexto(file).then((txt) => {
      const r = Papa.parse(txt, { header: false, skipEmptyLines: true });
      setNomes((p) => ({ ...p, ...parsearPlanoDeContas(r.data) }));
    });
  }

  const { contas, tDeb, tCre, meses, ccs, nLinhas } = useMemo(
    () => agregarPorConta(linhas, map, filtroMes, filtroCC),
    [linhas, map, filtroMes, filtroCC]
  );

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
          <div className="stamp">Partidas dobradas · CPC 26</div>
        </header>

        <nav className="tabs">
          {ABAS.map(([id, nome]) => (
            <button key={id} className="tab" data-on={aba === id ? "1" : "0"}
              disabled={id !== "importar" && !temDados} onClick={() => setAba(id)}>
              {nome}
            </button>
          ))}
        </nav>

        {erro && <div className="err">{erro}</div>}

        {aba === "importar" && <EtapaImportar carregando={carregando} onImportar={importar} />}

        {aba === "conferir" && temDados && (
          <EtapaConferir
            arquivo={arquivo} nLinhas={nLinhas} contas={contas} dif={dif}
            meses={meses} ccs={ccs} filtroMes={filtroMes} filtroCC={filtroCC}
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
            contasResultado={contasResultado} grupoDe={grupoDe} tocadas={tocadas}
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
            filtroCC={filtroCC} tDeb={tDeb} tCre={tCre} dif={dif} nomes={nomes}
            detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
            onBaixarCSV={() => baixarCSV({ dre, empresa, cnpj, filtroMes, meses, nomes })}
            contasIgnoradas={contasIgnoradas}
          />
        )}

        {!temDados && aba !== "importar" && (
          <div className="empty"><b>Nenhum razão carregado</b>Importe um arquivo na etapa 1.</div>
        )}
      </div>
    </div>
  );
}
