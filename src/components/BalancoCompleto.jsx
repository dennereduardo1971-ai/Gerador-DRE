import { useMemo, useState } from "react";
import { brl, pct } from "../lib/parse.js";
import { achatar, gruposDe } from "../lib/balancete.js";
import { Balanca } from "./Eixo.jsx";

/* Balanço a partir do Balancete de Verificação completo.
 *
 * O desenho parte de um fato contábil, não de uma preferência estética:
 * um balancete só das contas 1 e 2 NÃO fecha, e não deveria fechar. A
 * diferença entre Ativo e Passivo + PL é o resultado do exercício, que
 * mora nas contas 3 a 7 e ainda não foi transportado ao Patrimônio
 * Líquido. Num software genérico isso aparece como "erro de R$ X"; aqui
 * vira a primeira coisa da tela, escrita como equação — e, quando há um
 * razão importado, confrontada com o Lucro Líquido da própria DRE.
 *
 * Duas visões, porque são duas perguntas diferentes:
 *   Estrutura — "como está o patrimônio?" Ativo de um lado, Passivo + PL
 *               do outro, dois níveis de profundidade. É leitura.
 *   Balancete — "de onde saiu esse número?" A árvore inteira com saldo
 *               anterior, débito, crédito, movimento e saldo atual. É
 *               conferência.
 *
 * Elas não são abas decorativas: quem lê um Balanço quer a primeira,
 * quem confere um fechamento quer a segunda, e misturar as duas numa
 * tabela só produz uma tabela boa para ninguém.
 */

const eZero = (n) => Math.abs(n) < 0.005;

function Cifra({ v, className = "" }) {
  if (v == null) return <span className="cifra">—</span>;
  if (eZero(v)) return <span className="cifra zerada">—</span>;
  return (
    <span className={"cifra " + (v < 0 ? "neg " : "") + className}>
      {v < 0 ? `(${brl(Math.abs(v))})` : brl(v)}
    </span>
  );
}

/* ---------- Visão 1: estrutura patrimonial ---------- */

function Coluna({ titulo, grupos, total, base }) {
  return (
    <div className="bp-coluna">
      <div className="bp-titulo">
        <span>{titulo}</span>
        <Cifra v={total} className="forte" />
      </div>
      {grupos.map((g) => (
        <div className="bp-grupo" key={g.codigo}>
          <div className="bp-grupo-cab">
            <span className="bp-nome">{g.descricao}</span>
            <span className="bp-num">
              <Cifra v={Math.abs(g.atual)} />
              <i className="bp-av">{pct(Math.abs(g.atual) / base)}</i>
            </span>
          </div>
          {g.itens.map((it) => (
            <div className="bp-item" key={it.codigo}>
              <span className="bp-nome">
                <span className="code">{it.exibicao}</span> {it.descricao}
              </span>
              <span className="bp-num">
                <Cifra v={Math.abs(it.atual) * (it.atual < 0 === g.atual < 0 ? 1 : -1)} />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Visão 2: balancete completo ---------- */

function Balancete({ bal }) {
  // Abre até o nível 2 por padrão: mostra a estrutura sem despejar as 192
  // contas analíticas de uma vez. Quem quiser a folha abre o galho.
  const [abertos, setAbertos] = useState(
    () => new Set(bal.contas.filter((c) => c.nivel <= 1).map((c) => c.codigo))
  );
  const [ocultarParadas, setOcultarParadas] = useState(false);
  const [busca, setBusca] = useState("");

  const alternar = (codigo) =>
    setAbertos((p) => {
      const n = new Set(p);
      if (n.has(codigo)) n.delete(codigo);
      else n.add(codigo);
      return n;
    });

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo) {
      // Busca ignora a hierarquia de propósito: quem digita "fies" quer a
      // conta, não o caminho até ela.
      return bal.contas.filter(
        (c) => c.descricao.toLowerCase().includes(termo) || c.codigo.includes(termo.replace(/\D/g, ""))
      );
    }
    return achatar(bal, abertos, { ocultarSemMovimento: ocultarParadas });
  }, [bal, abertos, ocultarParadas, busca]);

  return (
    <div className="card">
      <div className="bal-barra">
        <input
          className="busca" type="search" placeholder="Buscar conta ou código…"
          value={busca} onChange={(e) => setBusca(e.target.value)}
        />
        <label className="bal-check">
          <input type="checkbox" checked={ocultarParadas}
            onChange={(e) => setOcultarParadas(e.target.checked)} />
          Ocultar contas sem saldo e sem movimento
        </label>
        <button className="btn ghost" onClick={() => setAbertos(new Set(bal.contas.map((c) => c.codigo)))}>
          Abrir tudo
        </button>
        <button className="btn ghost" onClick={() => setAbertos(new Set(bal.raizes))}>
          Fechar tudo
        </button>
      </div>

      <div className="scroll">
        <table className="tabela-larga balancete">
          <thead>
            <tr>
              <th>Conta</th>
              <th className="num">Saldo anterior</th>
              <th className="num">Débito</th>
              <th className="num">Crédito</th>
              <th className="num">Movimento</th>
              <th className="num">Saldo atual</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => {
              const sintetica = c.filhos.length > 0;
              return (
                <tr key={c.codigo} data-nivel={Math.min(c.nivel, 4)} data-tipo={sintetica ? "s" : "a"}>
                  <td className="bal-conta">
                    <span style={{ paddingLeft: busca ? 0 : c.nivel * 16 }}>
                      {sintetica && !busca ? (
                        <button className="bal-toggle" onClick={() => alternar(c.codigo)}
                          aria-expanded={abertos.has(c.codigo)}
                          aria-label={abertos.has(c.codigo) ? "Recolher" : "Expandir"}>
                          {abertos.has(c.codigo) ? "−" : "+"}
                        </button>
                      ) : (
                        <span className="bal-toggle vazio" />
                      )}
                      <span className="code">{c.exibicao}</span> {c.descricao}
                    </span>
                  </td>
                  <td className="num"><Cifra v={c.anterior} /></td>
                  <td className="num"><Cifra v={c.debito} /></td>
                  <td className="num"><Cifra v={c.credito} /></td>
                  <td className="num"><Cifra v={c.movimento} /></td>
                  <td className="num destaque"><Cifra v={c.atual} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="hint">
        Saldo devedor em preto, credor entre parênteses. As contas sintéticas já vêm somadas do
        sistema contábil — o app confere, mas não recalcula por cima.
        {visiveis.length !== bal.contas.length && ` Mostrando ${visiveis.length} de ${bal.contas.length} contas.`}
      </p>
    </div>
  );
}

/* ---------- Tela ---------- */

export function BalancoCompleto({ bal, arquivo, lucroLiquido, lucroLiquidoDoMes, onTrocar }) {
  const [visao, setVisao] = useState("estrutura");
  const r = bal.resumo;

  const ativo = gruposDe(bal, "1");
  const passivo = gruposDe(bal, "2");
  const base = r.totalAtivo || 1;

  /* A prova cruzada só existe se houver DRE na mão — e ela tem que ser a
     DRE ACUMULADA do exercício. O desequilíbrio do balancete (Ativo −
     Passivo) é o resultado acumulado desde janeiro, porque as contas 3 a
     7 chegam somadas no saldo atual. Confrontar esse número com a DRE do
     MÊS acusa divergência todos os meses sem que exista erro nenhum. */
  const temDRE = typeof lucroLiquido === "number" && !eZero(lucroLiquido);
  const bateComDRE = temDRE && Math.abs(lucroLiquido - r.resultadoExercicio) < 0.01;
  const temMes = typeof lucroLiquidoDoMes === "number" && !eZero(lucroLiquidoDoMes);

  return (
    <>
      <div className="equacao" data-integro={r.integro ? "1" : "0"}>
        <div className="equacao-linha">
          <div className="equacao-termo">
            <span className="k">Ativo</span>
            <span className="v">{brl(r.totalAtivo)}</span>
          </div>
          <span className="equacao-op">=</span>
          <div className="equacao-termo">
            <span className="k">Passivo + Patrimônio Líquido</span>
            <span className="v">{brl(r.totalPassivo)}</span>
          </div>
          <span className="equacao-op">+</span>
          <div className="equacao-termo destaque">
            <span className="k">Resultado do exercício</span>
            <span className="v">{brl(r.resultadoExercicio)}</span>
          </div>
        </div>
        <p className="equacao-nota">
          Um balancete só das contas 1 e 2 não fecha — e não deve fechar. A diferença entre os
          dois lados é o resultado do período, que vive nas contas 3 a 7 e só vai para o
          Patrimônio Líquido no encerramento do exercício.
          {temDRE ? (
            bateComDRE ? (
              <> A DRE acumulada do exercício apurou <b>{brl(lucroLiquido)}</b>: <b>bate</b> com a
                diferença do balancete.
                {temMes && <> No período deste arquivo, isoladamente, o resultado foi{" "}
                  <b>{brl(lucroLiquidoDoMes)}</b>.</>}
              </>
            ) : (
              <> A DRE acumulada apurou <b>{brl(lucroLiquido)}</b>, uma diferença de{" "}
                <b>{brl(Math.abs(lucroLiquido - r.resultadoExercicio))}</b> em relação ao balancete —
                vale conferir se alguma conta de resultado ficou fora da classificação.</>
            )
          ) : (
            <> Carregue um balancete que inclua as contas de resultado, ou o razão do mesmo
              período, para o app conferir esse valor.</>
          )}
        </p>
      </div>

      <div className="checks">
        <div className="check">
          <div className="k">Contas no balancete</div>
          <div className="v">{r.nContas}</div>
          <div className="sub">{r.nFolhas} analíticas · {r.nContas - r.nFolhas} sintéticas</div>
        </div>
        <div className="check">
          <div className="k">Movimento do período</div>
          <div className="v">{brl(r.debitoPeriodo)}</div>
          <div className="sub">débitos · créditos {brl(r.creditoPeriodo)}</div>
        </div>
        <div className="check" data-tone={r.integro ? "ok" : "bad"}>
          <div className="k">Consistência interna</div>
          <div className="v">{r.integro ? "Confere" : "Divergente"}</div>
          <div className="sub">
            {r.integro
              ? "anterior + movimento = atual em cada linha, e as folhas somam o total de cada grupo raiz"
              : `${r.inconsistentes} linha(s) não fecham e ${r.raizesErradas} grupo(s) raiz divergem das suas folhas`}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="bal-cab">
          <div>
            <h2>Balanço Patrimonial</h2>
            <p className="hint">
              De <b>{arquivo}</b>. Este arquivo já traz o Balanço fechado pela contabilidade —
              o app o exibe e confere, sem recalcular por cima.
            </p>
          </div>
          <div className="segmentado" role="tablist">
            <button role="tab" aria-selected={visao === "estrutura"} data-on={visao === "estrutura" ? "1" : "0"}
              onClick={() => setVisao("estrutura")}>Estrutura</button>
            <button role="tab" aria-selected={visao === "balancete"} data-on={visao === "balancete" ? "1" : "0"}
              onClick={() => setVisao("balancete")}>Balancete completo</button>
          </div>
        </div>

        {visao === "estrutura" && (
          <>
            <Balanca
              esquerda={r.totalAtivo} direita={r.totalPassivo}
              rotuloEsq={`Ativo ${brl(r.totalAtivo)}`}
              rotuloDir={`Passivo + PL ${brl(r.totalPassivo)}`}
            />
            <div className="bp">
              <Coluna titulo="Ativo" grupos={ativo} total={r.totalAtivo} base={base} />
              <Coluna titulo="Passivo + Patrimônio Líquido" grupos={passivo} total={r.totalPassivo} base={base} />
            </div>
            <p className="hint">
              Percentual sobre o total do Ativo. Contas redutoras (depreciação, amortização,
              perdas estimadas) aparecem entre parênteses, deduzindo do grupo onde estão.
            </p>
          </>
        )}
      </div>

      {visao === "balancete" && <Balancete bal={bal} />}

      <div className="card">
        <p className="hint" style={{ margin: 0 }}>
          Carregou o balancete errado, ou quer trocar de período?{" "}
          <button className="btn ghost" onClick={onTrocar}>Trocar balancete</button>
        </p>
      </div>
    </>
  );
}
