/* Seletor de fonte da DRE.
 *
 * As duas fontes descrevem o mesmo fato por caminhos diferentes: o razão
 * soma lançamento a lançamento até chegar no movimento de cada conta; o
 * balancete já traz esse movimento somado e fechado pela contabilidade.
 * Não são redundantes — cada uma entrega algo que a outra não tem, e é
 * isso que este componente precisa deixar explícito antes que alguém
 * troque de fonte sem entender o que perde.
 *
 * BALANCETE: mais confiável (passou pelo fechamento), traz o plano de
 * contas junto e monta a DRE de uma vez. Mas é um retrato de UM
 * período agregado: não tem competência mês a mês, centro de custo nem
 * lançamento individual.
 *
 * RAZÃO: tem tudo isso, e é o que alimenta a Comparativa e o
 * filtro por centro de custo. Em compensação, a soma é feita pelo app.
 */

export function FonteDados({
  fonteEfetiva, cobertura, temRazao, temBalancete, arquivoBalancete, onFonte,
}) {
  if (!temBalancete && !temRazao) return null;

  // Balancete carregado mas sem contas de resultado: é o caso do
  // relatório filtrado só em Ativo e Passivo. Não dá para escolher, e o
  // usuário precisa saber exatamente o que pedir ao sistema contábil.
  if (temBalancete && !cobertura.resultado) {
    return (
      <div className="fonte">
        <div className="fonte-cab">
          <span className="rotulo">Fonte dos dados</span>
        </div>
        <p className="fonte-txt">
          DRE pelo <b>razão</b>. O balancete carregado só traz as contas{" "}
          <b>{cobertura.digitos.join(" e ")}</b>.
        </p>
        <details className="explica">
          <summary>Como usar o balancete também na DRE</summary>
          <p>
            A DRE precisa das contas de resultado (3 a 7), que não estão em{" "}
            <b>{arquivoBalancete}</b>. Exporte o <b>mesmo relatório sem filtrar por conta</b> e o
            balancete passa a montar a DRE de uma vez — o razão fica reservado ao que só
            ele faz: análise mês a mês, centro de custo e detalhe de lançamento.
          </p>
        </details>
      </div>
    );
  }

  if (!temBalancete) return null;

  const noBalancete = fonteEfetiva === "balancete";

  return (
    <div className="fonte" data-fonte={fonteEfetiva}>
      <div className="fonte-cab">
        <span className="rotulo">Fonte dos dados</span>
        <div className="segmentado" role="radiogroup" aria-label="Fonte dos dados da DRE">
          <button role="radio" aria-checked={noBalancete} data-on={noBalancete ? "1" : "0"}
            onClick={() => onFonte("balancete")}>
            Balancete
          </button>
          <button role="radio" aria-checked={!noBalancete} data-on={!noBalancete ? "1" : "0"}
            disabled={!temRazao} onClick={() => onFonte("razao")}>
            Razão
          </button>
        </div>
      </div>

      <p className="fonte-txt">
        {noBalancete ? (
          <>DRE vinda de <b>{arquivoBalancete}</b>, já fechado pela contabilidade.</>
        ) : (
          <>DRE somada do <b>razão</b>, lançamento a lançamento. Balancete carregado: <b>{arquivoBalancete}</b>.</>
        )}
      </p>

      {/* As duas fontes não são redundantes, e a diferença entre elas é o
          que alguém precisa saber ANTES de trocar — mas não a cada vez
          que abre a tela. Aberto por quem tem a dúvida. */}
      <details className="explica">
        <summary>O que muda ao trocar de fonte</summary>
        <p>
          O <b>balancete</b> é mais confiável (passou pelo fechamento) e traz o plano de contas
          junto, então a classificação por código funciona sem importar plano nenhum. Mas é um
          retrato de um período agregado: não tem competência mês a mês, centro de custo nem
          lançamento individual.
        </p>
        <p>
          O <b>razão</b> tem tudo isso — é ele que alimenta a Comparativa e o filtro
          por centro de custo. Em compensação, a soma é feita pelo app.
          {!temRazao && " Nenhum razão foi importado ainda."}
        </p>
      </details>
    </div>
  );
}
