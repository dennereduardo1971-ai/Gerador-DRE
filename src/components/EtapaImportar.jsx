import { useRef, useState } from "react";

/* A ÚNICA FONTE É O BALANCETE DE VERIFICAÇÃO.
 *
 * O razão contábil saiu do app em 24/08/2026. Ele existia para o que o
 * balancete não carregava — competência mês a mês num arquivo só, centro
 * de custo, lançamento individual —, mas custava caro: mapeamento de
 * colunas, agregação lançamento a lançamento, leitura em pedaços e uma
 * tela inteira de conferência de partidas dobradas, tudo para produzir
 * uma DRE que o balancete já entrega fechada pela contabilidade.
 *
 * A competência mês a mês, que era o argumento mais forte a favor do
 * razão, hoje se resolve carregando VÁRIOS balancetes: cada um declara o
 * próprio período e vira uma coluna da Comparativa.
 */
export function EtapaImportar({ balancetes = [], aviso, onImportar, onRemover }) {
  const [over, setOver] = useState(false);
  const balRef = useRef(null);

  function receber(lista) {
    // Aceita vários arquivos de uma vez: quem fecha o trimestre solta os
    // três meses juntos em vez de repetir o gesto três vezes.
    Array.from(lista || []).forEach((f) => onImportar(f));
  }

  return (
    <>
      <div
        className="drop"
        role="button"
        tabIndex={0}
        aria-label="Escolher os arquivos de balancete de verificação"
        data-over={over ? "1" : "0"}
        onClick={() => balRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); balRef.current?.click(); }
        }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); receber(e.dataTransfer.files); }}
      >
        <b>{balancetes.length ? "Adicionar outro balancete" : "Solte o balancete de verificação aqui"}</b>
        <span>CSV ou Excel (.xlsx, .xls, .xlsm, .xlsb, .ods) · o app acha a aba certa sozinho</span>
        <span>Pode soltar vários meses de uma vez</span>
        <input
          ref={balRef}
          type="file"
          multiple
          accept=".csv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods"
          style={{ display: "none" }}
          onChange={(e) => { receber(e.target.files); e.target.value = ""; }}
        />
      </div>
      {aviso && <p className="hint" style={{ marginTop: 12 }}>{aviso}</p>}

      {balancetes.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Balancetes carregados</h2>
          <p className="hint">
            A DRE, o De-Para e o CPC 51 leem o período em foco (escolhido na etapa Conferir).
            Com dois ou mais, a <b>Comparativa</b> põe um por coluna e o Excel do CPC 51 ganha a
            coluna comparativa.
          </p>
          <div className="scroll">
            <table className="tabela-cartao">
              <thead>
                <tr>
                  <th>Período</th><th>Arquivo</th><th className="num">Contas</th>
                  <th>Cobre</th><th></th>
                </tr>
              </thead>
              <tbody>
                {balancetes.map((b) => (
                  <tr key={b.chave}>
                    <td className="desc" data-rotulo="Período">{b.rotulo}</td>
                    <td className="desc" data-rotulo="Arquivo">{b.arquivo}</td>
                    <td className="num" data-rotulo="Contas">{b.bal?.resumo?.nContas ?? 0}</td>
                    <td data-rotulo="Cobre">
                      <span className="tag" data-s={b.cobertura?.resultado ? "auto" : "edit"}>
                        {b.cobertura?.resultado ? "DRE" : `só ${(b.cobertura?.digitos || []).join(" e ")}`}
                      </span>
                    </td>
                    <td data-rotulo="">
                      <button className="btn ghost" onClick={() => onRemover(b.chave)}
                        aria-label={`Remover o balancete de ${b.rotulo}`}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Por que o balancete basta</h2>
        <p className="hint">
          O balancete de verificação é o relatório que a contabilidade fecha todo mês. Ele traz,
          para cada conta, o saldo anterior, o movimento do período e o saldo atual — que é tudo
          o que a DRE precisa. Um arquivo só, sem mapear coluna nenhuma.
        </p>
        <table className="tabela-cartao">
          <thead>
            <tr><th>O que ele traz</th><th>Para que serve</th></tr>
          </thead>
          <tbody>
            {[
              ["Saldo anterior", "A posição de onde o período partiu"],
              ["Débito e crédito do período", "A DRE daquele mês"],
              ["Saldo atual", "O resultado acumulado do exercício"],
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

        <details className="explica">
          <summary>Como pedir o relatório certo</summary>
          <p>
            É o balancete de verificação <b>sem filtrar por conta</b> — com as contas 1 a 7, não
            só as patrimoniais. O relatório de fechamento costuma sair filtrado em 1 e 2, e
            nesse caso não há DRE a montar: o app avisa e diz exatamente o que pedir.
          </p>
          <p>
            Peça também <b>com as contas sem movimento</b>. Elas não mudam número nenhum da
            demonstração, mas aparecem em Classificar e no De-Para — é assim que uma conta já
            fica parametrizada antes do primeiro mês em que ela tiver saldo.
          </p>
        </details>
      </div>
    </>
  );
}
