import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { baixarCSV, baixarExcel } from "./lib/exportacao.js";
import { baixarCSVDePara, baixarExcelCPC51, baixarNotaMPDA } from "./lib/exportacaoCPC51.js";
import { montarDePara, porGrupo, resumoDePara } from "./lib/depara.js";
import { baixarCSVDeParaCompleto, baixarExcelDePara } from "./lib/exportacaoDePara.js";
import { baixarExcelFiscal } from "./lib/exportacaoFiscal.js";
import { lerPlanoAcao, salvarPlanoAcao } from "./lib/planoAcao.js";
import { useTema } from "./lib/useTema.js";
import { salvarNoHistorico, salvarOuAtualizar, listarHistorico, removerDoHistorico, sincronizarHistorico } from "./lib/historico.js";
import { lerConfigGitHub } from "./lib/githubApi.js";
import { baixarPerfil, montarPerfil } from "./lib/perfil.js";

import { useSessao } from "./hooks/useSessao.js";
import { useFontes } from "./hooks/useFontes.js";
import { useClassificacao } from "./hooks/useClassificacao.js";
import { useCPC51 } from "./hooks/useCPC51.js";
import { useFiscal } from "./hooks/useFiscal.js";

import { EtapaImportar } from "./components/EtapaImportar.jsx";
import { EtapaConferir } from "./components/EtapaConferir.jsx";
import { EtapaClassificar } from "./components/EtapaClassificar.jsx";
import { EtapaDRE } from "./components/EtapaDRE.jsx";
import { EtapaComparativo } from "./components/EtapaComparativo.jsx";
import { EtapaHistorico } from "./components/EtapaHistorico.jsx";
import { EtapaCPC51 } from "./components/EtapaCPC51.jsx";
import { Cronograma51 } from "./components/Cronograma51.jsx";
import { DePara } from "./components/DePara.jsx";
import { EtapaFiscal } from "./components/EtapaFiscal.jsx";
import { Inicio } from "./components/Inicio.jsx";
import { Icone } from "./components/Icones.jsx";

/* A NAVEGAÇÃO É DADO, NÃO JSX.
 *
 * Cada seção agrupa as abas que respondem à MESMA pergunta. Início fica
 * solto acima delas porque não pertence a nenhuma: ele responde "o que eu
 * faço agora?", que é anterior a todas.
 *
 * Só "Fluxo" é numerado, porque só ele é sequencial de verdade. O número
 * pendura no canto do ícone em vez de substituí-lo, para o ícone continuar
 * sendo o que se reconhece de relance no trilho recolhido; as outras
 * seções não recebem número nenhum, para não fingirem ser passos 5, 6 e 7. */
const SECOES = [
  {
    id: "fluxo",
    rotulo: "Fluxo",
    numerado: true,
    abas: [
      ["importar", "Importar", "importar"],
      ["conferir", "Conferir", "conferir"],
      ["classificar", "Classificar", "classificar"],
      ["dre", "DRE", "dre"],
    ],
  },
  {
    /* Parâmetros é seção própria, não um item no meio das outras: De-Para
       é cadastro, não leitura de resultado, e cadastro que se procura
       junto de análise é cadastro que ninguém acha. */
    id: "parametros",
    rotulo: "Parâmetros",
    abas: [["depara", "De-Para", "depara"]],
  },
  {
    /* Apuração é seção própria porque responde outra pergunta: não "para
       onde vai cada conta" (Parâmetros) nem "quanto deu" (DRE), mas "o
       que a contabilidade lançou de imposto está certo?". Dentro da DRE
       ela sumiria na rolagem; dentro de Parâmetros fingiria ser cadastro,
       e o resultado de uma apuração não é cadastro. */
    id: "fiscal",
    rotulo: "Fiscal",
    abas: [["fiscal", "Apuração", "fiscal"]],
  },
  {
    /* Comparativa e Histórico respondem à mesma pergunta em dois tempos:
       como a DRE se moveu nos períodos carregados, e o que já foi fechado
       antes deles. */
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

/* Abas que não dependem de arquivo nenhum: abrem sempre. O Histórico lê o
   que já foi salvo; o plano de ação é do escritório, não do arquivo
   aberto; Início mostra justamente o estado de "ainda vazio". */
const SEMPRE_ABERTAS = ["inicio", "importar", "historico", "plano"];

/* O menu recolhido é preferência de quem usa, não estado do arquivo:
   sobrevive ao F5 e à troca de arquivo, e não entra na sessão em
   IndexedDB, que é só para dado do cliente. */
const CHAVE_MENU = "dre.menu.recolhido";

export default function App() {
  const [aba, setAba] = useState("inicio");
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenuRef = useRef(null);
  const [recolhido, setRecolhido] = useState(() => {
    try { return localStorage.getItem(CHAVE_MENU) === "1"; } catch { return false; }
  });
  const [busca, setBusca] = useState("");
  const [detalhado, setDetalhado] = useState(true);
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tema, setTema] = useTema();
  const [historico, setHistorico] = useState(() => listarHistorico());
  const [avisoPerfil, setAvisoPerfil] = useState("");
  const [planoAcao, setPlanoAcao] = useState(() => lerPlanoAcao());

  /* O ESTADO MORA NOS HOOKS, não aqui. Este arquivo é o casco: navegação,
     topo de contexto, menu e distribuição de props. Cada hook é dono de um
     assunto e sabe se salvar e se restaurar sozinho — foi assim que este
     arquivo saiu de 945 para pouco mais de 400 linhas, e é o que faz mexer
     no CPC 51 não exigir ler a importação de arquivo. */
  const fontes = useFontes();
  const cls = useClassificacao({
    contas: fontes.contas, nomesEfetivos: fontes.nomesEfetivos,
    planos: fontes.planos, balancetes: fontes.balancetes,
  });
  const cpc = useCPC51({
    contasResultado: cls.contasResultado, grupoDe: cls.grupoDe, dre: cls.dre,
    nomesEfetivos: fontes.nomesEfetivos, aba,
    dresPorBalancete: cls.dresPorBalancete, periodoAtivo: fontes.emFoco?.chave,
    plano: fontes.planoAtivo,
  });
  /* A apuração lê a MESMA DRE que a aba Demonstração mostra. É por isso
     que reclassificar uma conta em Classificar refaz o imposto na hora —
     e é por isso que este módulo não decide para onde conta nenhuma vai. */
  const fisc = useFiscal({ dre: cls.dre, nomesEfetivos: fontes.nomesEfetivos });

  const identidade = {
    dados: { empresa, cnpj },
    vazio: false,
    restaurar: (s) => { setEmpresa(s.empresa || ""); setCnpj(s.cnpj || ""); },
    limpar: () => { setEmpresa(""); setCnpj(""); },
  };

  const sessao = useSessao([fontes.sessao, cls.sessao, cpc.sessao, fisc.sessao, identidade]);

  /* Volta sempre para o Início ao restaurar: é ele que diz, em uma linha,
     qual arquivo está aberto e o que ficou pendente da última vez. */
  useEffect(() => { if (sessao.carregada) setAba("inicio"); }, [sessao.carregada]);

  /* O andamento do plano de ação não é dado financeiro e não pertence ao
     arquivo aberto: fica em localStorage, sobrevive à troca de arquivo e
     não é apagado por "Limpar tudo". */
  useEffect(() => { salvarPlanoAcao(planoAcao); }, [planoAcao]);

  useEffect(() => {
    try { localStorage.setItem(CHAVE_MENU, recolhido ? "1" : "0"); } catch { /* modo privado */ }
  }, [recolhido]);

  useEffect(() => {
    if (lerConfigGitHub()) {
      sincronizarHistorico().then((r) => { if (r.ok) setHistorico(listarHistorico()); }).catch(() => {});
    }
  }, []);

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

  async function limparTudo() {
    await sessao.limpar();
    setAvisoPerfil("");
    setAba("inicio");
  }

  function salvarPerfil() {
    baixarPerfil(montarPerfil({
      nome: empresa || fontes.periodo || "Perfil", classif: cls.classif, nomes: fontes.nomesEfetivos,
      categorias: cpc.categoriaConta, politica: cpc.politica, medidas: cpc.medidas,
      // Só os PARÂMETROS fiscais — regime, alíquotas, mapa de tributos.
      // Prejuízo fiscal é valor de cliente e fica fora, para o perfil
      // continuar podendo ser versionado e compartilhado.
      fiscal: fisc.paraPerfil,
    }));
  }

  function aplicarPerfil(perfil) {
    cls.aplicarPerfil(perfil);
    cpc.aplicarPerfil(perfil);
    fisc.aplicarPerfil(perfil);
    if (perfil.nomes && Object.keys(perfil.nomes).length) fontes.aplicarNomes(perfil.nomes);
  }

  /* ---------- De-Para ----------
     A mesma decisão das etapas Classificar e CPC 51, vista conta a conta e
     nos dois eixos ao mesmo tempo. Não é um terceiro estado: lê `grupoDe`,
     `tocadas` e `categoriaConta`, e escreve de volta nos mesmos setters —
     por isso reclassificar aqui refaz a DRE na hora. */
  const deParaLinhas = useMemo(
    () => montarDePara(cls.contasResultado, {
      grupoDe: cls.grupoDe, tocadas: cls.tocadas, categoriaPorConta: cpc.categoriaConta,
      politica: cpc.politica, nomes: fontes.nomesEfetivos, plano: fontes.planoAtivo,
    }),
    [
      cls.contasResultado, cls.grupoDe, cls.tocadas, cpc.categoriaConta, cpc.politica,
      fontes.nomesEfetivos, fontes.planoAtivo,
    ]
  );
  const placarDePara = useMemo(() => resumoDePara(deParaLinhas), [deParaLinhas]);

  const periodo = fontes.periodo;
  const ctxArquivo = { empresa, cnpj, periodo, nomes: fontes.nomesEfetivos };
  const ctxExport51 = {
    ...ctxArquivo, dre: cls.dre, dre51: cpc.dre51, conciliacao: cpc.conciliacao,
    dePara: cpc.dePara, medidas: cpc.medidas, politica: cpc.politica,
    comparativo: cpc.comparativo,
  };

  /* HISTÓRICO SE ALIMENTA SOZINHO AO LER UM BALANCETE.
     O balancete declara o próprio período, então não há o que perguntar ao
     usuário. A chave é o período, não o clique: reimportar o mesmo mês
     atualiza a linha em vez de duplicar, e reclassificar uma conta depois
     corrige o retrato — senão o histórico guardaria para sempre a versão
     anterior à correção, que é justamente a errada. */
  useEffect(() => {
    if (!sessao.carregada || !fontes.emFoco) return;
    if (!periodo || !cls.contasResultado.length) return;
    const chave = `balancete|${empresa || "sem-empresa"}|${periodo}`;
    if (salvarOuAtualizar({ empresa, cnpj, periodo, dre: cls.dre, chave })) {
      setHistorico(listarHistorico());
    }
  }, [sessao.carregada, fontes.emFoco, periodo, cls.contasResultado, cls.dre, empresa, cnpj]);

  const temDados = fontes.temDados;

  /** Uma aba abre quando a fonte de que ela depende existe. Escrito uma
   *  vez, e não como expressão booleana repetida em cada ramo do `<main>`
   *  e do menu: eram duas cópias, e aba nova aberta no menu caía em tela
   *  branca quando alguém esquecia da segunda. */
  function abaDisponivel(id) {
    if (SEMPRE_ABERTAS.includes(id)) return true;
    return temDados;
  }

  /* O estado de cada aba, no próprio menu, como SELO. A pergunta é "onde
     tem trabalho me esperando?", e a resposta cabe num número: `3` contas a
     resolver diz o mesmo que "3 a resolver" e sobrevive ao menu recolhido,
     onde não há largura para texto nenhum. `alerta` pinta o selo de âmbar —
     nunca vermelho, que neste projeto pertence ao dado.

     `titulo` é o que o selo significa por extenso: vira `title` e
     `aria-label` do item, porque "3" sozinho não é acessível. */
  const estadoDaAba = useMemo(() => {
    const e = {};
    if (fontes.resumo && !fontes.resumo.integro) {
      e.conferir = { selo: "!", alerta: true, titulo: "o arquivo não fecha consigo mesmo" };
    } else if (fontes.resumo?.resultadoConfere === false) {
      e.conferir = { selo: "!", alerta: true, titulo: "patrimonial e resultado divergem" };
    }
    if (fontes.balancetes.length > 1) {
      e.comparativo = { selo: `${fontes.balancetes.length}`, titulo: `${fontes.balancetes.length} períodos carregados` };
    }
    if (cls.contasResultado.length) {
      e.classificar = { selo: `${cls.contasResultado.length}`, titulo: `${cls.contasResultado.length} contas de resultado` };
      e.depara = placarDePara.pendente
        ? { selo: `${placarDePara.pendente}`, alerta: true, titulo: `${placarDePara.pendente} contas a resolver` }
        : { selo: "✓", titulo: "mapeamento completo" };
    }
    if (temDados && !cpc.conciliacao.fecha) e.cpc51 = { selo: "!", alerta: true, titulo: "não concilia" };
    if (temDados) {
      e.fiscal = fisc.resumo.confere
        ? { selo: "✓", titulo: "imposto lançado confere" }
        : fisc.resumo.diverge
          ? { selo: "!", alerta: true, titulo: "imposto lançado diverge" }
          : { selo: `${fisc.resumo.pendencias}`, alerta: true, titulo: `${fisc.resumo.pendencias} julgamentos a confirmar` };
    }
    return e;
  }, [fontes.resumo, fontes.balancetes.length, cls.contasResultado.length, placarDePara, temDados, cpc.conciliacao.fecha, fisc.resumo]);

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
        title={livre ? (est?.titulo ? `${nome} — ${est.titulo}` : nome) : `${nome} — abre com um balancete importado`}>
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
          quantos períodos —, agora em selos clicáveis que levam à tela que
          muda cada um. */}
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
            {fontes.emFoco && (
              <button className="ctx-chip" onClick={() => irPara("importar")} title="Trocar o arquivo">
                <Icone nome="dre" tamanho={14} />
                <span className="ctx-chip-txt">{fontes.emFoco.arquivo}</span>
              </button>
            )}
            {/* O selo do período some quando ele é o NOME DO ARQUIVO —
                caso de um balancete que não declara "Data Inicial"/"Data
                Final" na aba de parâmetros. Dois selos lado a lado com a
                mesma palavra não informam nada e ainda sugerem que são
                coisas diferentes. */}
            {periodo && periodo !== fontes.emFoco?.arquivo && (
              <button className="ctx-chip" onClick={() => irPara("conferir")} disabled={!temDados} title="Trocar o período em foco">
                <Icone nome="historico" tamanho={14} />
                <span className="ctx-chip-txt">{periodo}</span>
              </button>
            )}
            {fontes.balancetes.length > 1 && (
              <button className="ctx-chip" data-forte="1" onClick={() => irPara("comparativo")} title="Comparar os períodos carregados">
                <Icone nome="comparativo" tamanho={14} />
                <span className="ctx-chip-txt">{fontes.balancetes.length} períodos</span>
              </button>
            )}
          </div>

          <div className="topo-acoes">
            {fontes.balancetes.length > 0 && (
              <button className="ico-btn" onClick={limparTudo}
                aria-label="Limpar tudo"
                title="Apaga os balancetes, as classificações e os dados da empresa deste navegador">
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
            {aba === "inicio" && (
              <Inicio
                arquivo={fontes.emFoco?.arquivo || ""} empresa={empresa} periodo={periodo}
                temDados={temDados} nBalancetes={fontes.balancetes.length}
                nContas={fontes.contas.length} nContasResultado={cls.contasResultado.length}
                resumo={fontes.resumo} placar={placarDePara}
                concilia={cpc.conciliacao.fecha} dre={cls.dre}
                onIr={irPara} disponivel={abaDisponivel}
              />
            )}

            {aba === "importar" && (
              <EtapaImportar
                balancetes={fontes.balancetes} aviso={fontes.aviso}
                onImportar={fontes.importar} onRemover={fontes.remover}
              />
            )}

            {aba === "conferir" && temDados && (
              <EtapaConferir
                contas={fontes.contas} resumo={fontes.resumo} cobertura={fontes.cobertura}
                periodo={periodo} balancetes={fontes.balancetes} ativo={fontes.emFoco?.chave}
                onAtivo={fontes.setAtivo}
                empresa={empresa} cnpj={cnpj} nomes={fontes.nomesEfetivos}
                onEmpresa={setEmpresa} onCnpj={setCnpj}
                onIrClassificar={() => irPara("classificar")}
              />
            )}

            {aba === "classificar" && temDados && (
              <EtapaClassificar
                grupos1={cls.grupos1} digitosResultado={cls.digitosResultado}
                resultadoManual={cls.resultadoManual} onResultadoManual={cls.setResultadoManual}
                contasResultado={cls.contasResultado} grupoDe={cls.grupoDe} tocadas={cls.tocadas}
                nomes={fontes.nomesEfetivos} manuais={cls.manuais}
                busca={busca} onBusca={setBusca}
                onClassificar={cls.classificar}
                onImportarPlano={fontes.importarPlano}
                onGerarDRE={() => irPara("dre")}
                onLimparManuais={cls.limparManuais}
                avisoPerfil={avisoPerfil || fontes.avisoPlano} onAvisoPerfil={setAvisoPerfil}
                onSalvarPerfil={salvarPerfil} onAplicarPerfil={aplicarPerfil}
                onAplicarPlano={fontes.aplicarPlano} planoAtivo={fontes.planoAtivo}
              />
            )}

            {aba === "dre" && temDados && (
              <EtapaDRE
                dre={cls.dre} empresa={empresa} cnpj={cnpj} periodo={periodo}
                nomes={fontes.nomesEfetivos} resumo={fontes.resumo}
                detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
                onBaixarCSV={() => baixarCSV({ ...ctxArquivo, dre: cls.dre })}
                onBaixarExcel={() => baixarExcel({ ...ctxArquivo, dre: cls.dre, dresPorCompetencia: cls.dresPorBalancete })}
                prova={cls.prova}
                onSalvarHistorico={() => {
                  salvarNoHistorico({ empresa, cnpj, periodo, dre: cls.dre });
                  setHistorico(listarHistorico());
                }}
              />
            )}

            {aba === "depara" && temDados && (
              <DePara
                linhas={deParaLinhas} empresa={empresa} cnpj={cnpj}
                onClassificar={cls.classificar}
                onCategoriaConta={cpc.definirCategoria}
                onLimparCategorias={cpc.limparCategorias}
                onBaixarCSV={() => baixarCSVDeParaCompleto(deParaLinhas, ctxArquivo)}
                onBaixarExcel={() => baixarExcelDePara(deParaLinhas, placarDePara, porGrupo(deParaLinhas), ctxArquivo)}
              />
            )}

            {aba === "fiscal" && temDados && (
              <EtapaFiscal
                params={fisc.params} onParams={fisc.setParams}
                prejuizo={fisc.prejuizo} onPrejuizo={fisc.setPrejuizo}
                baseInformada={fisc.basePisCofins} onBaseInformada={fisc.setBasePisCofins}
                linhasTributo={fisc.linhasTributo} onTributo={fisc.definirTributo}
                ajustes={fisc.ajustes} onAjuste={fisc.alterarAjuste}
                onAcrescentarAjuste={fisc.acrescentarAjuste} onRemoverAjuste={fisc.removerAjuste}
                pisCofins={fisc.pisCofins} lalur={fisc.lalur} resumo={fisc.resumo}
                empresa={empresa} periodo={periodo}
                onBaixarExcel={() => baixarExcelFiscal({
                  params: fisc.params, pisCofins: fisc.pisCofins, lalur: fisc.lalur,
                  ajustes: fisc.ajustes, linhasTributo: fisc.linhasTributo,
                  empresa, cnpj, periodo,
                })}
              />
            )}

            {aba === "comparativo" && temDados && (
              <EtapaComparativo dresPorCompetencia={cls.dresPorBalancete} />
            )}

            {aba === "cpc51" && temDados && (
              <EtapaCPC51
                dre={cls.dre} dre51={cpc.dre51} conciliacao={cpc.conciliacao} mistas={cpc.mistas}
                cobertura={cpc.cobertura} politica={cpc.politica} categoriaPorConta={cpc.categoriaConta}
                contasResultado={cls.contasResultado} grupoDe={cls.grupoDe} categoriaDe={cpc.categoriaDe}
                nomes={fontes.nomesEfetivos} empresa={empresa} cnpj={cnpj} periodo={periodo}
                detalhado={detalhado} onToggleDetalhado={() => setDetalhado(!detalhado)}
                medidas={cpc.medidas}
                onPolitica={cpc.setPolitica}
                onCategoriaConta={cpc.definirCategoria}
                onLimparCategorias={cpc.limparCategorias}
                onAdicionarMedida={(modelo) => cpc.setMedidas((ms) => [...ms, { ...modelo }])}
                onRemoverMedida={(id) => cpc.setMedidas((ms) => ms.filter((m) => m.id !== id))}
                onAjusteMedida={cpc.ajustarMedida}
                onRemoverAjuste={(id, grupo) =>
                  cpc.setMedidas((ms) => ms.map((m) =>
                    m.id === id ? { ...m, ajustes: (m.ajustes || []).filter((a) => a.id !== grupo) } : m))}
                onBaixarExcel={() => baixarExcelCPC51(ctxExport51)}
                onBaixarDePara={() => baixarCSVDePara(cpc.dePara, ctxExport51)}
                onBaixarNota={() => baixarNotaMPDA(cpc.medidas, cpc.dre51, ctxExport51)}
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
                <b>Nenhum balancete carregado</b>
                <button className="btn" onClick={() => irPara("importar")}>Importar balancete</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
