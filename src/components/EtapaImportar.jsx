import { useRef, useState } from "react";

function formatarBytes(n) {
  if (!n) return "";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

export function EtapaImportar({ carregando, progresso, onImportar, onImportarBalancete, abertura }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);
  const balRef = useRef(null);

  return (
    <>
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
            <span>CSV ou Excel (.xlsx, .xls, .xlsm, .xlsb, .ods) · aceita acentuação ANSI</span>
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
      {/* O balancete é opcional e independente do razão: ele sozinho já
          desenha o Balanço inteiro, e há quem só queira olhar isso. Por
          isso entra aqui, e não escondido dentro da aba Balanço — que
          antes só existia depois de importar um razão. */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="bal-cab">
          <div>
            <h2>Balancete de verificação <span className="rotulo">opcional</span></h2>
            <p className="hint" style={{ margin: 0 }}>
              Traz o Balanço Patrimonial pronto, com saldo anterior, movimento e saldo atual de
              cada conta. Pode ser carregado sozinho, sem razão nenhum — e, se houver razão do
              mesmo período, o app confere o resultado do exercício contra o Lucro Líquido da DRE.
            </p>
          </div>
          <button className="btn ghost" onClick={() => balRef.current?.click()}>
            {abertura?.balancete ? "Trocar balancete" : "Carregar balancete"}
          </button>
        </div>
        <input ref={balRef} type="file" accept=".csv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods"
          style={{ display: "none" }}
          onChange={(e) => { onImportarBalancete(e.target.files[0]); e.target.value = ""; }} />
        {abertura?.aviso && <p className="hint" style={{ marginTop: 12 }}>{abertura.aviso}</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>O que o arquivo precisa ter</h2>
        <p className="hint">
          Uma linha por lançamento, com conta e valor de débito e de crédito em colunas
          separadas — o formato padrão de exportação de razão. As colunas são reconhecidas
          pelo nome; se o seu sistema usa outros títulos, dá para ajustar na etapa 2. Funciona
          tanto com CSV quanto com planilhas Excel — se o Excel tiver mais de uma aba, o app usa
          a primeira que tiver dados. Arquivos grandes (dezenas de milhares de linhas) são lidos
          em partes, sem travar a página.
        </p>
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
      </div>
    </>
  );
}
