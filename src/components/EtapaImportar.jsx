import { useRef, useState } from "react";

function formatarBytes(n) {
  if (!n) return "";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

/* ORDEM DA TELA: o balancete vem primeiro, e o razão foi para trás de
 * "opções avançadas".
 *
 * Não é preferência estética. O balancete de verificação já passou pelo
 * fechamento da contabilidade e, sozinho, monta a DRE e o Balanço
 * inteiros — traz saldo anterior, movimento e saldo atual de cada conta,
 * e ainda entrega o plano de contas de graça. O razão exige mapear
 * colunas e some com o saldo de abertura.
 *
 * O razão continua existindo porque responde o que o balancete não
 * responde: competência mês a mês num único arquivo, centro de custo e
 * lançamento individual. Quem precisa disso sabe que precisa; quem não
 * precisa não deveria tropeçar nessa escolha logo na primeira tela. */
export function EtapaImportar({ carregando, progresso, onImportar, onImportarBalancete, abertura }) {
  const [over, setOver] = useState(false);
  const [avancado, setAvancado] = useState(false);
  const inputRef = useRef(null);
  const balRef = useRef(null);

  return (
    <>
      <div
        className="drop"
        role="button"
        tabIndex={0}
        aria-label="Escolher o arquivo do balancete de verificação"
        data-over={over ? "1" : "0"}
        onClick={() => balRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); balRef.current?.click(); }
        }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onImportarBalancete(e.dataTransfer.files[0]); }}
      >
        <b>{abertura?.balancete ? "Trocar o balancete" : "Solte o balancete de verificação aqui"}</b>
        <span>CSV ou Excel (.xlsx, .xls, .xlsm, .xlsb, .ods) · o app acha a aba certa sozinho</span>
        <input
          ref={balRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods"
          style={{ display: "none" }}
          onChange={(e) => { onImportarBalancete(e.target.files[0]); e.target.value = ""; }}
        />
      </div>
      {abertura?.aviso && <p className="hint" style={{ marginTop: 12 }}>{abertura.aviso}</p>}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Por que o balancete basta</h2>
        <p className="hint">
          O balancete de verificação é o relatório que a contabilidade fecha todo mês. Ele traz,
          para cada conta, o saldo anterior, o movimento do período e o saldo atual — que é tudo
          o que a DRE e o Balanço precisam. Um arquivo só, sem mapear coluna nenhuma.
        </p>
        <table className="tabela-cartao">
          <thead>
            <tr><th>O que ele traz</th><th>Para que serve</th></tr>
          </thead>
          <tbody>
            {[
              ["Saldo anterior", "Abertura do período — o Balanço deixa de ser só movimentação"],
              ["Débito e crédito do período", "A DRE daquele mês"],
              ["Saldo atual", "O resultado acumulado do exercício e o Balanço na data"],
              ["Descrição de cada conta", "O plano de contas, sem precisar de arquivo separado"],
              ["Aba de parâmetros", "O período coberto, lido sozinho pelo app"],
            ].map(([traz, serve]) => (
              <tr key={traz}>
                <td className="desc" data-rotulo="O que ele traz">{traz}</td>
                <td className="desc" data-rotulo="Para que serve">{serve}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <button
          className="btn ghost"
          aria-expanded={avancado}
          onClick={() => setAvancado((v) => !v)}
        >
          {avancado ? "Ocultar opções avançadas" : "Opções avançadas — importar o razão"}
        </button>

        {avancado && (
          <div style={{ marginTop: 16 }}>
            <p className="hint">
              O razão só é necessário para o que o balancete não carrega: <b>competência mês a mês
              num único arquivo</b>, <b>centro de custo</b> e <b>lançamento individual</b>. É dele que
              dependem as abas Comparativa e Horizontal e o filtro de centro de custo. Para
              conferir a DRE e o Balanço de um período, o balancete basta e é mais confiável,
              porque já passou pelo fechamento.
            </p>

            <div
              className="drop"
              role="button"
              tabIndex={0}
              aria-label="Escolher o arquivo do razão contábil"
              data-over={over ? "1" : "0"}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); }
              }}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); onImportar(e.dataTransfer.files[0]); }}
            >
              {carregando ? (
                <>
                  <b>Lendo o arquivo…</b>
                  <div className="progresso">
                    <div className="progresso-barra" style={{ width: `${progresso?.pct ?? 0}%` }} />
                  </div>
                  <span>
                    {progresso?.linhas ? `${progresso.linhas.toLocaleString("pt-BR")} lançamentos lidos` : "começando…"}
                    {progresso?.pct != null ? ` · ${progresso.pct}%` : ""}
                    {progresso?.tamanho ? ` de ${formatarBytes(progresso.tamanho)}` : ""}
                  </span>
                </>
              ) : (
                <>
                  <b>Solte o razão aqui</b>
                  <span>CSV ou Excel · aceita acentuação ANSI</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods"
                style={{ display: "none" }}
                onChange={(e) => onImportar(e.target.files[0])}
              />
            </div>

            <p className="hint" style={{ marginTop: 12 }}>Uma linha por lançamento, débito e crédito em colunas separadas.</p>
            <table className="tabela-cartao">
              <thead>
                <tr><th>Coluna</th><th>Serve para</th><th>Obrigatória</th></tr>
              </thead>
              <tbody>
                {[
                  ["Cta. Debito / Cta. Credito", "Identificar a conta de cada lado", "Sim"],
                  ["Valor Debito / Valor Credito", "Somar o saldo da conta", "Sim"],
                  ["Historico", "Sugerir a classificação e nomear a conta", "Não"],
                  ["Dia/Mes + Ano", "Filtrar o período e montar a análise horizontal", "Não"],
                  ["C.Custo", "Filtrar por centro de custo", "Não"],
                ].map(([coluna, serve, obrig]) => (
                  <tr key={coluna}>
                    <td className="code" data-rotulo="Coluna">{coluna}</td>
                    <td className="desc" data-rotulo="Serve para">{serve}</td>
                    <td data-rotulo="Obrigatória">{obrig}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <details className="explica">
              <summary>Se o meu arquivo for diferente</summary>
              <p>
                As colunas são reconhecidas pelo nome; se o seu sistema usa outros títulos, dá para
                ajustar na etapa Conferir. Funciona com CSV e com planilhas Excel — se a planilha
                tiver mais de uma aba, o app usa a que tiver mais linhas com cara de conta. Arquivos
                com dezenas de milhares de linhas são lidos em partes, sem travar a página.
              </p>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
