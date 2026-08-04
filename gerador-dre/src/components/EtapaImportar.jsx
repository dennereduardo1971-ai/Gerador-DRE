import { useRef, useState } from "react";

function formatarBytes(n) {
  if (!n) return "";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

export function EtapaImportar({ carregando, progresso, onImportar }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  return (
    <>
      <div
        className="drop"
        data-over={over ? "1" : "0"}
        onClick={() => inputRef.current?.click()}
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
            <span>CSV separado por ponto e vírgula ou vírgula · aceita acentuação ANSI</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          style={{ display: "none" }}
          onChange={(e) => onImportar(e.target.files[0])}
        />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>O que o arquivo precisa ter</h2>
        <p className="hint">
          Uma linha por lançamento, com conta e valor de débito e de crédito em colunas
          separadas — o formato padrão de exportação de razão. As colunas são reconhecidas
          pelo nome; se o seu sistema usa outros títulos, dá para ajustar na etapa 2. Arquivos
          grandes (dezenas de milhares de linhas) são lidos em partes, sem travar a página.
        </p>
        <table>
          <thead>
            <tr><th>Coluna</th><th>Serve para</th><th>Obrigatória</th></tr>
          </thead>
          <tbody>
            <tr><td className="code">Cta. Debito / Cta. Credito</td><td>Identificar a conta de cada lado</td><td>Sim</td></tr>
            <tr><td className="code">Valor Debito / Valor Credito</td><td>Somar o saldo da conta</td><td>Sim</td></tr>
            <tr><td className="code">Historico</td><td>Sugerir a classificação e nomear a conta</td><td>Não</td></tr>
            <tr><td className="code">Dia/Mes + Ano</td><td>Filtrar o período e montar a análise horizontal</td><td>Não</td></tr>
            <tr><td className="code">C.Custo</td><td>Filtrar por centro de custo</td><td>Não</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
