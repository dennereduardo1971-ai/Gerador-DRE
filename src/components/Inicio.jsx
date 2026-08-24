/* Início — a tela que responde "o que eu faço agora?".
 *
 * Não é leitura de resultado: aqui há estado do arquivo, um único
 * próximo passo em destaque, a lista do que está pendente e os atalhos.
 * Os números do topo situam ("é este arquivo, é este período"), não
 * analisam — quem quer o resultado abre a DRE, e quem quer saber como
 * ele fica em 2027 abre o CPC 51.
 *
 * Regra de escrita desta tela: nenhum texto passa de uma linha. Quem
 * abre um ERP quer saber onde clicar, não ler um manual. O que precisa
 * de explicação mora num `<details class="explica">`, fechado por
 * padrão, dentro da tela que executa a tarefa.
 */

import { brl, pct } from "../lib/formato.js";
import { Icone } from "./Icones.jsx";

/* Um passo por vez. A ordem é a do fluxo real, e a primeira condição que
   bate vence — é o que impede a tela de sugerir "gere a DRE" enquanto as
   partidas não fecham. */
function proximoPasso({ temDados, resumo, placar, nContasResultado }) {
  if (!temDados) {
    return { aba: "importar", ico: "importar", titulo: "Importar o balancete", sub: "CSV ou Excel do seu sistema contábil", cta: "Escolher arquivo" };
  }
  if (resumo && !resumo.integro) {
    return { aba: "conferir", ico: "conferir", titulo: "Conferir o balancete", sub: "O arquivo não fecha consigo mesmo", cta: "Conferir", alerta: true };
  }
  if (resumo?.resultadoConfere === false) {
    return { aba: "conferir", ico: "conferir", titulo: "Conferir o balancete", sub: "Patrimonial e resultado apuram números diferentes", cta: "Conferir", alerta: true };
  }
  if (nContasResultado && placar?.semGrupo) {
    return { aba: "classificar", ico: "classificar", titulo: "Classificar as contas", sub: `${placar.semGrupo} conta(s) ainda sem grupo na DRE`, cta: "Classificar", alerta: true };
  }
  if (placar?.aRevisar) {
    return { aba: "depara", ico: "depara", titulo: "Revisar o De-Para", sub: `${placar.aRevisar} categoria(s) do CPC 51 a confirmar`, cta: "Abrir De-Para", alerta: true };
  }
  return { aba: "dre", ico: "dre", titulo: "A DRE está pronta", sub: "Confira, exporte ou salve no histórico", cta: "Ver a DRE" };
}

function Atalho({ ico, nome, valor, alerta, onClick, disabled }) {
  return (
    <button className="atalho" onClick={onClick} disabled={disabled} data-alerta={alerta ? "1" : "0"}>
      <span className="atalho-ico"><Icone nome={ico} tamanho={20} /></span>
      <span className="atalho-txt">
        <span className="atalho-nome">{nome}</span>
        {valor && <span className="atalho-val">{valor}</span>}
      </span>
      <Icone nome="seta" tamanho={16} className="atalho-seta" />
    </button>
  );
}

export function Inicio({
  arquivo, empresa, periodo, temDados, nBalancetes = 0, resumo,
  nContas, nContasResultado, placar, concilia, dre, onIr, disponivel,
}) {
  const passo = proximoPasso({ temDados, resumo, placar, nContasResultado });

  /* Só entra na lista o que pede AÇÃO. Um "tudo certo" para cada
     verificação encheria a tela de verde e esconderia o que importa. */
  const pendencias = [];
  if (resumo && !resumo.integro) {
    pendencias.push({ aba: "conferir", txt: "O balancete não fecha", val: `${resumo.inconsistentes + resumo.sinteticasErradas}` });
  }
  if (resumo?.resultadoConfere === false) {
    pendencias.push({ aba: "conferir", txt: "Patrimonial x resultado", val: "diverge" });
  }
  if (placar?.semGrupo) {
    pendencias.push({ aba: "classificar", txt: "Contas fora da DRE", val: `${placar.semGrupo}` });
  }
  if (placar?.aRevisar) {
    pendencias.push({ aba: "depara", txt: "Categorias a revisar", val: `${placar.aRevisar}` });
  }
  if (temDados && concilia === false) {
    pendencias.push({ aba: "cpc51", txt: "CPC 51 não concilia", val: "conferir" });
  }

  return (
    <>
      <div className="inicio-topo">
        <div>
          {/* Sem empresa cadastrada não há eyebrow: "Sem empresa
              informada" ocupa uma linha para não dizer nada. */}
          {empresa && <div className="rotulo">{empresa}</div>}
          <h2 className="inicio-tit">
            {arquivo || "Nenhum arquivo carregado"}
          </h2>
          <div className="inicio-meta">
            {temDados && <span>{nContas} contas</span>}
            {periodo && <span>{periodo}</span>}
            {nBalancetes > 1 && <span>{nBalancetes} períodos carregados</span>}
          </div>
        </div>
        {temDados && (
          <div className="inicio-nums">
            <div className="mini">
              <div className="mini-k">Receita líquida</div>
              <div className="mini-v">{brl(dre.receitaLiq)}</div>
            </div>
            <div className="mini">
              <div className="mini-k">Lucro líquido</div>
              <div className={"mini-v " + (dre.liquido < 0 ? "neg" : "pos")}>{brl(dre.liquido)}</div>
            </div>
            <div className="mini">
              <div className="mini-k">Margem líquida</div>
              {/* Sem receita líquida não há margem — e "0,0%" ali pareceria
                  diagnóstico ("a empresa não ganha nada") quando na verdade
                  é ausência de denominador. */}
              <div className="mini-v">{dre.receitaLiq ? pct(dre.liquido / dre.receitaLiq) : "—"}</div>
            </div>
          </div>
        )}
      </div>

      <button className="passo" data-alerta={passo.alerta ? "1" : "0"} onClick={() => onIr(passo.aba)}>
        <span className="passo-ico"><Icone nome={passo.ico} tamanho={22} /></span>
        <span className="passo-txt">
          <span className="rotulo">Próximo passo</span>
          <span className="passo-tit">{passo.titulo}</span>
          <span className="passo-sub">{passo.sub}</span>
        </span>
        <span className="passo-cta">{passo.cta}<Icone nome="seta" tamanho={16} /></span>
      </button>

      {pendencias.length > 0 && (
        <div className="pend">
          <div className="rotulo">Pendências</div>
          <ul>
            {pendencias.map((p) => (
              <li key={p.aba + p.txt}>
                <button onClick={() => onIr(p.aba)}>
                  <Icone nome="aviso" tamanho={15} />
                  <span>{p.txt}</span>
                  <b className="num">{p.val}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rotulo secao-rot">Ir para</div>
      <div className="atalhos">
        <Atalho ico="dre" nome="DRE" valor={temDados ? brl(dre.liquido) : ""} disabled={!disponivel("dre")} onClick={() => onIr("dre")} />
        <Atalho ico="comparativo" nome="Comparativa" valor={nBalancetes > 1 ? `${nBalancetes} períodos` : ""} disabled={!disponivel("comparativo")} onClick={() => onIr("comparativo")} />
        <Atalho ico="depara" nome="De-Para" valor={placar?.total ? pct(placar.completude) : ""} alerta={!!placar?.pendente} disabled={!disponivel("depara")} onClick={() => onIr("depara")} />
        <Atalho ico="cpc51" nome="CPC 51" valor={temDados ? (concilia ? "concilia" : "conferir") : ""} alerta={temDados && !concilia} disabled={!disponivel("cpc51")} onClick={() => onIr("cpc51")} />
        <Atalho ico="historico" nome="Histórico" onClick={() => onIr("historico")} />
      </div>
    </>
  );
}
