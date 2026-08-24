import { brl, pct } from "../lib/formato.js";
import { REGIMES, TRIBUTOS, regimeDe } from "../lib/fiscal.js";
import { Balanca } from "./Eixo.jsx";

/* APURAÇÃO — o imposto lançado está certo?
 *
 * Esta tela CONFERE, não apura para recolhimento. Ela recalcula PIS,
 * COFINS, IRPJ e CSLL a partir da mesma DRE que o app monta e confronta
 * com o que a contabilidade lançou. A entrega é a DIVERGÊNCIA, no mesmo
 * espírito da prova de integridade da DRE.
 *
 * A ordem dos três blocos é a ordem em que eles derrubam o trabalho de
 * quem confere: primeiro os parâmetros (sem o regime certo, todo o resto
 * está errado), depois PIS/COFINS (que depende só da receita), depois o
 * LALUR (que depende do resultado inteiro).
 *
 * Onde o app não sabe, ele escreve "a confirmar" — nunca um número. A
 * proporção do PROUNI é estimada, a dedutibilidade de cada provisão é
 * julgamento de quem assina, e as duas coisas aparecem dizendo isso.
 */

/** Uma linha da memória de cálculo. `subtotal` fica em negrito;
 *  `confirmar` ganha o selo âmbar de julgamento pendente. */
function LinhaMemoria({ l }) {
  return (
    <div className="fisc-linha" data-sub={l.subtotal ? "1" : "0"}>
      <div className="fisc-rot">
        {l.rotulo}
        {l.confirmar && <span className="selo-zerada">a confirmar</span>}
        {l.origem && <span className="fisc-origem">{l.origem}</span>}
      </div>
      <div className={"fisc-val " + (l.valor < 0 ? "neg" : "")}>{brl(l.valor)}</div>
    </div>
  );
}

/** O confronto entre o recalculado e o contabilizado, desenhado.
 *
 *  A `Balanca` é a primitiva certa aqui e não uma escolha estética: os
 *  dois braços são o mesmo imposto por caminhos diferentes, e o único
 *  trecho vermelho é o quanto um excede o outro — literalmente a
 *  divergência. É o mesmo elemento que a etapa Conferir usa para
 *  patrimonial × resultado. */
function Confronto({ titulo, devido, contabilizado, confiavel, aviso }) {
  const diferenca = devido - contabilizado;
  const fecha = Math.abs(diferenca) < 0.01;
  return (
    <div className="card">
      <h2>{titulo}</h2>
      {!confiavel ? (
        <div className="warn">{aviso}</div>
      ) : (
        <p className="hint">
          {fecha
            ? "Recalculado e contabilizado batem."
            : <>Divergência de <b>{brl(Math.abs(diferenca))}</b> — o app apurou{" "}
              {diferenca > 0 ? "mais" : "menos"} do que está lançado.</>}
        </p>
      )}
      <Balanca
        esquerda={Math.abs(devido)} direita={Math.abs(contabilizado)}
        rotuloEsq={`Recalculado ${brl(devido)}`}
        rotuloDir={`Contabilizado ${brl(contabilizado)}`}
      />
    </div>
  );
}

export function EtapaFiscal({
  params, onParams, prejuizo, onPrejuizo, baseInformada, onBaseInformada,
  linhasTributo, onTributo,
  ajustes, onAjuste, onAcrescentarAjuste, onRemoverAjuste,
  pisCofins, lalur, resumo, empresa, periodo, onBaixarExcel,
}) {
  const regime = regimeDe(params.regime);
  const aliq = (k, v) => onParams({ ...params, aliquotas: { ...params.aliquotas, [k]: v } });

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={onBaixarExcel}>Baixar Excel</button>
      </div>

      {/* O limite do bloco, dito na tela e não só na documentação. Quem
          abre esta aba precisa saber, antes de ler qualquer número, que
          ele não substitui a apuração oficial. */}
      <div className="warn">
        <b>Este bloco confere, não apura para recolhimento.</b> Ele recalcula o imposto a partir
        da DRE deste período e mostra a diferença para o que está lançado. Guia, saldo a
        compensar e obrigação acessória continuam sendo do sistema fiscal.
      </div>

      <div className="checks">
        <div className="check" data-tone={resumo.confere ? "ok" : resumo.diverge ? "bad" : undefined}>
          <div className="k">Confronto</div>
          <div className="v">{resumo.confere ? "Confere" : resumo.diverge ? "Diverge" : "Incompleto"}</div>
          {/* O subtexto tem que dizer a MESMA coisa que o selo. Dizer
              "Diverge" e logo abaixo "batem nos dois tributos" — porque o
              subtexto só olhava as pendências — é o tipo de contradição
              que ensina a ignorar o painel inteiro. */}
          <div className="sub">
            {[
              resumo.divergePis ? "PIS/COFINS diverge" : null,
              resumo.divergeLalur ? "IRPJ/CSLL diverge" : null,
              pisCofins.informada ? null : "base de PIS/COFINS a informar",
              resumo.pendencias > 0 ? `${resumo.pendencias} julgamento(s) a confirmar` : null,
            ].filter(Boolean).join(" · ") || "Recalculado e contabilizado batem nos dois tributos."}
          </div>
        </div>
        <div className="check">
          <div className="k">PIS + COFINS</div>
          <div className="v">{brl(pisCofins.devido)}</div>
          <div className="sub">Contabilizado {brl(pisCofins.contabilizado)}.</div>
        </div>
        <div className="check">
          <div className="k">IRPJ + CSLL</div>
          <div className="v">{brl(lalur.devido)}</div>
          <div className="sub">Contabilizado {brl(lalur.contabilizado)}.</div>
        </div>
        {pisCofins.prouni.proporcao > 0 && (
          <div className="check">
            <div className="k">Proporção isenta (PROUNI)</div>
            <div className="v">{pct(pisCofins.prouni.proporcao)}</div>
            <div className="sub">ESTIMADA pelas bolsas sobre a receita bruta — confirmar com o
              termo de adesão.</div>
          </div>
        )}
      </div>

      {/* 1. Parâmetros. Sem o regime certo, todo o resto está errado. */}
      <div className="card">
        <h2>Parâmetros da apuração</h2>
        <p className="hint">{regime.nota}</p>
        <div className="filters">
          <div>
            <label htmlFor="fisc-regime">Regime tributário</label>
            <select id="fisc-regime" value={params.regime}
              onChange={(e) => onParams({ ...params, regime: e.target.value })}>
              {REGIMES.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fisc-periodo">Período de apuração</label>
            <select id="fisc-periodo" value={params.periodicidade}
              onChange={(e) => onParams({ ...params, periodicidade: e.target.value })}>
              <option value="MENSAL">Mensal (estimativa / suspensão)</option>
              <option value="TRIMESTRAL">Trimestral</option>
              <option value="ANUAL">Anual (ajuste)</option>
            </select>
          </div>
          <div>
            <label>Adesão ao PROUNI</label>
            <label className="linha-check">
              <input type="checkbox" checked={!!params.prouni?.aderente}
                aria-label="A instituição é aderente ao PROUNI"
                onChange={(e) => onParams({ ...params, prouni: { aderente: e.target.checked } })} />
              <span>Isenção proporcional</span>
            </label>
          </div>
          <div>
            <label htmlFor="fisc-prej">Prejuízo fiscal acumulado (R$)</label>
            <input id="fisc-prej" type="number" min="0" step="0.01" value={prejuizo.fiscal || ""}
              placeholder="0,00"
              onChange={(e) => onPrejuizo({ ...prejuizo, fiscal: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label htmlFor="fisc-baseneg">Base negativa de CSLL (R$)</label>
            <input id="fisc-baseneg" type="number" min="0" step="0.01" value={prejuizo.baseNegativa || ""}
              placeholder="0,00"
              onChange={(e) => onPrejuizo({ ...prejuizo, baseNegativa: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <details className="explica">
          <summary>Alíquotas</summary>
          <div className="filters">
            {[
              ["pis", "PIS"], ["cofins", "COFINS"], ["irpj", "IRPJ"],
              ["adicional", "Adicional de IRPJ"], ["csll", "CSLL"],
            ].map(([k, nome]) => (
              <div key={k}>
                <label htmlFor={`fisc-al-${k}`}>{nome} (%)</label>
                <input id={`fisc-al-${k}`} type="number" step="0.01"
                  value={(params.aliquotas[k] * 100).toFixed(2)}
                  onChange={(e) => aliq(k, (Number(e.target.value) || 0) / 100)} />
              </div>
            ))}
            <div>
              <label htmlFor="fisc-al-lim">Limite mensal do adicional (R$)</label>
              <input id="fisc-al-lim" type="number" step="0.01"
                value={params.aliquotas.limiteAdicionalMensal}
                onChange={(e) => aliq("limiteAdicionalMensal", Number(e.target.value) || 0)} />
            </div>
          </div>
          <p>
            Trocar o regime repõe as alíquotas de PIS e COFINS dele. As demais ficam como você
            deixou — edite só quando houver motivo, e registre o motivo fora do app.
          </p>
        </details>

        <details className="explica">
          <summary>Por que o prejuízo fiscal não vai para o perfil</summary>
          <p>
            O perfil guarda <b>decisões</b> (regime, alíquotas, qual conta é PIS) e por isso pode
            ser versionado ou levado para outro computador sem carregar número de cliente nenhum.
            Prejuízo fiscal e base negativa são <b>valores</b> de uma empresa identificada: ficam
            só neste navegador e saem no "Limpar tudo".
          </p>
        </details>
      </div>

      {/* 2. PIS/COFINS — depende só da receita. */}
      <div className="card">
        <h2>Memória de cálculo — PIS e COFINS</h2>
        <p className="hint">Cada linha diz de onde o número veio.</p>

        {/* A base é CAMPO, não conclusão. A estimativa da DRE existe para
            dar um ponto de partida e para ser comparada — não para virar
            o número que o app confronta como se soubesse. */}
        <div className="filters">
          <div>
            <label htmlFor="fisc-base">Base de PIS/COFINS apurada (R$)</label>
            <input id="fisc-base" type="number" min="0" step="0.01"
              value={baseInformada ?? ""}
              placeholder={pisCofins.baseEstimada.toFixed(2)}
              onChange={(e) => onBaseInformada(e.target.value === "" ? null : Number(e.target.value) || 0)} />
          </div>
          <div className="linha-check">
            <button className="btn ghost" type="button"
              onClick={() => onBaseInformada(pisCofins.baseEstimada)}>
              Usar a estimativa da DRE
            </button>
          </div>
        </div>
        {!pisCofins.informada && (
          <div className="warn">
            <b>A base ainda não foi informada.</b> Abaixo está a estimativa da DRE — receita bruta
            menos devoluções e descontos. Ela não conhece regime de caixa, isenção de entidade
            beneficente nem exclusão específica de receita, então o app mostra a conta mas{" "}
            <b>não chama a diferença de divergência</b>. Digite a base da apuração para o
            confronto valer.
          </div>
        )}

        <div className="fisc-mem">
          {pisCofins.memoria.map((l, i) => <LinhaMemoria key={i} l={l} />)}
        </div>

        <details className="explica">
          <summary>Por que as bolsas não reduzem a base</summary>
          <p>
            Devoluções e descontos incondicionais são <b>exclusão de base</b>: aquela receita não
            existiu. Bolsas e PROUNI são outra coisa — definem a <b>proporção isenta</b> da
            receita da mantida. Tratá-las como exclusão reduziria a base duas vezes.
          </p>
        </details>
      </div>

      <div className="card">
        <h2>Qual conta é qual tributo</h2>
        <p className="hint">
          A DRE tem uma linha só, "PIS / COFINS / ISS". Confrontar o grupo inteiro com PIS mais
          COFINS daria divergência sempre, porque o ISS está lá dentro.
        </p>
        <div className="scroll">
          <table className="tabela-cartao">
            <thead>
              <tr>
                <th>Conta</th><th>Descrição</th><th className="num">Lançado</th>
                <th style={{ minWidth: 180 }}>Tributo</th><th>Origem da decisão</th>
              </tr>
            </thead>
            <tbody>
              {linhasTributo.map((l) => (
                <tr key={l.conta} data-pendente={l.tributo ? "0" : "1"}>
                  <td className="code" data-rotulo="Conta">{l.conta}</td>
                  <td className="desc" data-rotulo="Descrição">{l.descricao}</td>
                  <td className="num destaque" data-rotulo="Lançado">{brl(l.valor)}</td>
                  <td data-rotulo="Tributo">
                    <select value={l.manual ? l.tributo : ""}
                      aria-label={`Tributo da conta ${l.conta}`}
                      onChange={(e) => onTributo(l.conta, e.target.value)}>
                      <option value="">
                        {l.sugerido ? `Sugerido: ${l.sugerido}` : "A confirmar"}
                      </option>
                      {TRIBUTOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </td>
                  <td data-rotulo="Origem da decisão">
                    <span className="tag" data-s={l.manual ? "edit" : "auto"}>{l.origem}</span>
                  </td>
                </tr>
              ))}
              {linhasTributo.length === 0 && (
                <tr><td colSpan={5} className="desc">Nenhuma conta no grupo PIS / COFINS / ISS.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Confronto
        titulo="PIS e COFINS — recalculado x contabilizado"
        devido={pisCofins.devido} contabilizado={pisCofins.contabilizado}
        confiavel={pisCofins.confiavel}
        aviso={pisCofins.indefinido >= 0.005
          ? `${brl(pisCofins.indefinido)} em contas de tributo ainda sem classificar. Enquanto houver conta "a confirmar" acima, o confronto não vale: esse valor pode ser PIS, COFINS ou ISS, e cada hipótese dá uma divergência diferente.`
          : "A base de PIS/COFINS ainda não foi informada. O recalculado abaixo sai da estimativa da DRE, que não é a base da apuração — informe a base para o confronto valer."}
      />

      {/* 3. LALUR — depende do resultado inteiro. */}
      <div className="card">
        <h2>{regime.lalur ? "LALUR Parte A — apuração do lucro real" : "Base presumida"}</h2>
        <p className="hint">
          {regime.lalur
            ? "Do lucro antes do IR ao lucro real, e daí ao imposto devido."
            : "No Lucro Presumido o resultado contábil não entra: a base sai da receita bruta."}
        </p>
        <div className="fisc-mem">
          {lalur.memoria.map((l, i) => <LinhaMemoria key={i} l={l} />)}
          <LinhaMemoria l={{ rotulo: `IRPJ (${pct(params.aliquotas.irpj)})`, valor: lalur.irpj }} />
          <LinhaMemoria l={{
            rotulo: `Adicional de IRPJ (${pct(params.aliquotas.adicional)} sobre o que exceder ${brl(lalur.limite)})`,
            valor: lalur.adicional,
          }} />
          <LinhaMemoria l={{ rotulo: `CSLL (${pct(params.aliquotas.csll)})`, valor: lalur.csll }} />
          <LinhaMemoria l={{ rotulo: "( = ) Total bruto", valor: lalur.bruto, subtotal: true }} />
          {lalur.prouni.proporcao > 0 && (
            <LinhaMemoria l={{
              rotulo: `( – ) Isenção proporcional PROUNI (${pct(lalur.prouni.proporcao)})`,
              valor: -lalur.isento,
              origem: "ESTIMADA — confirmar com o termo de adesão",
              confirmar: true,
            }} />
          )}
          <LinhaMemoria l={{ rotulo: "( = ) Devido no período", valor: lalur.devido, subtotal: true }} />
        </div>
      </div>

      {regime.lalur && (
        <div className="card">
          <h2>Adições e exclusões</h2>
          <p className="hint">
            O app aponta onde olhar, a partir dos grupos que a DRE já tem. <b>Sugestão não entra
            na conta até ser confirmada</b> — somar por padrão produziria um lucro real que
            parece calculado e é um chute sobre a dedutibilidade de cada provisão.
          </p>
          <div className="scroll">
            <table className="tabela-cartao">
              <thead>
                <tr>
                  <th>Descrição</th><th style={{ minWidth: 130 }}>Tipo</th>
                  <th className="num">Valor</th><th>Confirmado</th><th>Origem</th><th></th>
                </tr>
              </thead>
              <tbody>
                {ajustes.map((a) => (
                  <tr key={a.id} data-pendente={a.aceito ? "0" : "1"}>
                    <td className="desc" data-rotulo="Descrição">
                      <input type="text" value={a.descricao} placeholder="Descrição do ajuste"
                        aria-label={`Descrição do ajuste ${a.id}`}
                        onChange={(e) => onAjuste(a.id, { descricao: e.target.value })} />
                      {a.motivo && <span className="fisc-motivo">{a.motivo}</span>}
                    </td>
                    <td data-rotulo="Tipo">
                      <select value={a.tipo} aria-label={`Tipo do ajuste ${a.id}`}
                        onChange={(e) => onAjuste(a.id, { tipo: e.target.value })}>
                        <option value="adicao">Adição</option>
                        <option value="exclusao">Exclusão</option>
                      </select>
                    </td>
                    <td className="num" data-rotulo="Valor">
                      <input type="number" step="0.01" value={a.valor}
                        aria-label={`Valor do ajuste ${a.id}`}
                        onChange={(e) => onAjuste(a.id, { valor: Number(e.target.value) || 0 })} />
                    </td>
                    <td data-rotulo="Confirmado">
                      <input type="checkbox" checked={!!a.aceito}
                        aria-label={`Confirmar o ajuste ${a.descricao || a.id}`}
                        onChange={(e) => onAjuste(a.id, { aceito: e.target.checked })} />
                    </td>
                    <td data-rotulo="Origem">
                      <span className="tag" data-s={a.origem === "manual" ? "edit" : "auto"}>{a.origem}</span>
                    </td>
                    <td data-rotulo="">
                      {a.id.startsWith("man:") && (
                        <button className="btn ghost" onClick={() => onRemoverAjuste(a.id)}
                          aria-label={`Remover o ajuste ${a.descricao || a.id}`}>Remover</button>
                      )}
                    </td>
                  </tr>
                ))}
                {ajustes.length === 0 && (
                  <tr><td colSpan={6} className="desc">Nenhum ajuste — o lucro real é o lucro contábil.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn ghost" onClick={onAcrescentarAjuste}>Acrescentar ajuste</button>
          </div>
          {lalur.ajustesPendentes.length > 0 && (
            <div className="warn" style={{ marginTop: 14 }}>
              <b>{lalur.ajustesPendentes.length} ajuste(s) ainda não confirmados.</b> Enquanto
              houver um, a apuração está incompleta por definição — a diferença entre "ainda não
              olhei" e "olhei e decidi que não se aplica" precisa estar na tela antes de alguém
              assinar.
            </div>
          )}
        </div>
      )}

      <Confronto
        titulo="IRPJ e CSLL — recalculado x contabilizado"
        devido={lalur.devido} contabilizado={lalur.contabilizado}
        confiavel={lalur.confiavel}
        aviso="Há ajuste sugerido e ainda não confirmado. O confronto só vale depois que cada um for aceito ou recusado."
      />

      <div className="foot">
        {empresa || "Empresa"} · {periodo || "período do arquivo"} · valores em R$.<br />
        A base de PIS/COFINS e o lucro antes do IR vêm da MESMA DRE que a aba Demonstração
        mostra — reclassificar uma conta lá refaz esta apuração na hora.
      </div>
    </>
  );
}
