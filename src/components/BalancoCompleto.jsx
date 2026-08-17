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
        Devedor em preto, credor entre parênteses. As sintéticas já vêm somadas do sistema.
        {visiveis.length !== bal.contas.length && ` Mostrando ${visiveis.length} de ${bal.contas.length} contas.`}
      </p>
    </div>
  );
}

/* ---------- Tela ---------- */

export function BalancoCompleto({ bal, arquivo, lucroLiquido, onTrocar }) {
  const [visao, setVisao] = useState("estrutura");
  const r = bal.resumo;

  const ativo = gruposDe(bal, "1");
  const passivo = gruposDe(bal, "2");
  const base = r.totalAtivo || 1;

  /* A prova cruzada só existe se houver DRE na mão — e ela se faz contra
     o resultado do PERÍODO, não contra o desequilíbrio do saldo.
     São dois números diferentes: o saldo das contas de resultado é
     acumulado no exercício, o movimento é só o período pedido no
     relatório. A DRE (montada de débito e crédito do período) reproduz o
     segundo. Comparar com o primeiro acusava divergência de período
     dentro de um arquivo só. */
  const temDRE = typeof lucroLiquido === "number" && !eZero(lucroLiquido);
  const periodo = typeof r.resultadoPeriodo === "number" ? r.resultadoPeriodo : null;
  const bateComPeriodo = temDRE && periodo != null && Math.abs(lucroLiquido - periodo) < 0.01;
  // Um razão que cobre o exercício inteiro bate com o acumulado; dizer
  // isso é mais útil que apontar uma diferença sem explicação.
  const bateComAcumulado = temDRE && !bateComPeriodo
    && Math.abs(lucroLiquido - r.resultadoExercicio) < 0.01;
  const alvo = bateComAcumulado ? r.resultadoExercicio : periodo;

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
          dois lados é o resultado <b>acumulado</b> do exercício, que vive nas contas 3 a 7 e só
          vai para o Patrimônio Líquido no encerramento.
          {periodo != null && Math.abs(periodo - r.resultadoExercicio) > 0.01 && (
            <> No período deste relatório o resultado foi <b>{brl(periodo)}</b> — o restante vem
              dos meses anteriores do mesmo exercício.</>
          )}
          {temDRE ? (
            bateComPeriodo ? (
              <> A DRE apurou <b>{brl(lucroLiquido)}</b> de lucro líquido: <b>bate</b> com o
                resultado do período.</>
            ) : bateComAcumulado ? (
              <> A DRE apurou <b>{brl(lucroLiquido)}</b>: <b>bate</b> com o resultado acumulado do
                exercício — o razão cobre o exercício inteiro, não só o período do balancete.</>
            ) : (
              <> A DRE apurou <b>{brl(lucroLiquido)}</b>, uma diferença de{" "}
                <b>{brl(Math.abs(lucroLiquido - (alvo ?? r.resultadoExercicio)))}</b> — os dois
                arquivos podem não cobrir o mesmo período.</>
            )
          ) : (
            <> Importe o razão do mesmo período para o app conferir esse valor contra o Lucro
              Líquido da DRE.</>
          )}
          {r.resultadoConfere === true && (
            <> Conferência interna: as contas patrimoniais e as de resultado apuram o mesmo
              resultado de período por caminhos independentes.</>
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
              ? "anterior + movimento = atual, e cada sintética bate com suas filhas"
              : `${r.inconsistentes} linha(s) e ${r.sinteticasErradas} sintética(s) não fecham`}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="bal-cab">
          <div>
            <h2>Balanço Patrimonial</h2>
            <p className="hint">De <b>{arquivo}</b>, já fechado pela contabilidade.</p>
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
              Percentual sobre o Ativo. Contas redutoras aparecem entre parênteses.
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
