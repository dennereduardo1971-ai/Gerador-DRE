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
 * contas junto e monta DRE e Balanço de uma vez. Mas é um retrato de UM
 * período agregado: não tem competência mês a mês, centro de custo nem
 * lançamento individual.
 *
 * RAZÃO: tem tudo isso, e é o que alimenta Comparativa, Horizontal e o
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
          O balancete <b>{arquivoBalancete}</b> traz apenas as contas{" "}
          <b>{cobertura.digitos.join(" e ")}</b> — Ativo e Passivo. Ele monta o{" "}
          <b>Balanço Patrimonial</b> sozinho, mas a DRE precisa das contas de resultado (3 a 7),
          que não estão nesse arquivo. Por isso a DRE continua vindo do razão.
        </p>
        <p className="fonte-txt">
          Se o seu sistema permitir exportar o <b>mesmo relatório sem filtrar por conta</b>, o
          balancete passa a montar DRE e Balanço de uma vez — e o razão fica reservado ao que só
          ele faz: análise mês a mês, centro de custo e detalhe de lançamento.
        </p>
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
          <>
            A DRE e o Balanço estão sendo montados a partir de <b>{arquivoBalancete}</b>, que já
            vem somado e fechado pela contabilidade — e traz o plano de contas junto, então a
            classificação por código funciona sem importar plano nenhum.
            {temRazao
              ? " O razão importado continua disponível: troque de fonte acima quando precisar de análise mês a mês, centro de custo ou detalhe de lançamento, que o balancete não tem."
              : " Para análise mês a mês, centro de custo ou detalhe de lançamento, importe também o razão — o balancete é um retrato de um período agregado."}
          </>
        ) : (
          <>
            A DRE está sendo montada a partir do <b>razão</b>, somando lançamento a lançamento —
            é o que permite análise mês a mês, filtro por centro de custo e detalhe de cada
            lançamento. O balancete <b>{arquivoBalancete}</b> continua carregado e monta o
            Balanço Patrimonial.
          </>
        )}
      </p>
    </div>
  );
}
