import { useMemo, useState } from "react";
import { agruparPorDigito, montarDRE, provaIntegridade, sugerirClassificacao } from "../lib/classify.js";
import { contasDeMovimento } from "../lib/balancete.js";
import { fazerModalidadeDe, sugerirModalidades } from "../lib/modalidade.js";

/* PARA ONDE VAI CADA CONTA — e a DRE que sai disso.
 *
 * `classif` são as escolhas manuais, `sugestao` é o que o app propõe, e
 * `grupoDe` é a resolução das duas: manual sempre vence. Importar um plano
 * de contas novo, ou trocar de balancete, nunca desfaz uma escolha manual.
 *
 * A MODALIDADE (Presencial / EAD / Médio) é o terceiro eixo e mora aqui
 * pela mesma razão que o grupo: é decisão sobre a conta, não dado
 * importado. `modalidade` são as escolhas manuais e `sugestaoModalidade`
 * é o que o nome da conta no plano declara — `modalidadeDe` resolve as
 * duas, manual primeiro, exatamente como `grupoDe`.
 *
 * A DRE de CADA balancete carregado também sai daqui (`dresPorBalancete`),
 * porque é a mesma decisão aplicada a outro período — a Comparativa e a
 * coluna comparativa do CPC 51 leem dessa lista. Ela usa `grupoDe`, ou
 * seja, reclassificar uma conta corrige todas as colunas de uma vez.
 */
export function useClassificacao({
  contas, nomesEfetivos, planos, balancetes,
  catalogoModalidades, alcanceModalidade, faixaPadraoModalidade,
}) {
  const [classif, setClassif] = useState({});
  const [tocadas, setTocadas] = useState({});
  const [resultadoManual, setResultadoManual] = useState({});
  const [modalidade, setModalidade] = useState({});

  const grupos1 = useMemo(() => agruparPorDigito(contas), [contas]);

  const digitosResultado = useMemo(() => {
    const auto = grupos1.filter((g) => g.digito >= "3" && g.digito <= "9").map((g) => g.digito);
    return grupos1.map((g) => g.digito).filter((d) => resultadoManual[d] ?? auto.includes(d));
  }, [grupos1, resultadoManual]);

  const contasResultado = useMemo(
    () => contas.filter((c) => digitosResultado.includes(c.conta[0])),
    [contas, digitosResultado]
  );

  const sugestao = useMemo(
    () => (contasResultado.length ? sugerirClassificacao(contasResultado, nomesEfetivos, planos) : {}),
    [contasResultado, nomesEfetivos, planos]
  );

  const grupoDe = useMemo(
    () => (conta) => classif[conta] ?? sugestao[conta] ?? "IGNORAR",
    [classif, sugestao]
  );

  /* A sugestão relê o plano a cada mudança do catálogo — é o que faz
     criar a modalidade "Técnico" com o termo certo reclassificar as
     contas na hora, sem clicar em conta nenhuma. E lê o nome ORIGINAL do
     plano, nunca o apelido: renomear é aparência (ver `rotulos.js`). */
  const sugestaoModalidade = useMemo(
    () => (contasResultado.length
      ? sugerirModalidades(contasResultado, nomesEfetivos, catalogoModalidades, alcanceModalidade)
      : {}),
    [contasResultado, nomesEfetivos, catalogoModalidades, alcanceModalidade]
  );

  const modalidadeDe = useMemo(
    () => fazerModalidadeDe({
      modalidadePorConta: modalidade,
      sugestao: sugestaoModalidade,
      catalogo: catalogoModalidades,
      alcance: alcanceModalidade,
      faixaPadrao: faixaPadraoModalidade,
    }),
    [modalidade, sugestaoModalidade, catalogoModalidades, alcanceModalidade, faixaPadraoModalidade]
  );

  const dre = useMemo(
    () => montarDRE(contasResultado, grupoDe, modalidadeDe),
    [contasResultado, grupoDe, modalidadeDe]
  );
  const prova = useMemo(() => provaIntegridade(contasResultado, grupoDe), [contasResultado, grupoDe]);

  /* A DRE de cada balancete, em ordem cronológica. `rotulo` é o que se
     imprime e `competencia` é a chave — as duas vêm do próprio arquivo,
     que declara o período que cobre. */
  const dresPorBalancete = useMemo(
    () => (balancetes || []).map((b) => {
      const cs = contasDeMovimento(b.bal).filter((c) => digitosResultado.includes(c.conta[0]));
      return { competencia: b.chave, rotulo: b.rotulo, contas: cs, dre: montarDRE(cs, grupoDe, modalidadeDe) };
    }),
    [balancetes, digitosResultado, grupoDe, modalidadeDe]
  );

  function classificar(conta, grupo) {
    setClassif((p) => ({ ...p, [conta]: grupo }));
    setTocadas((p) => ({ ...p, [conta]: true }));
  }

  /** A modalidade decidida à mão. `""` volta a conta para a sugestão
   *  automática — sem isso, corrigir um erro do padrão seria irreversível
   *  sem "Limpar tudo", que é o que aconteceu com a categoria do CPC 51
   *  antes de ela ganhar a mesma saída. */
  function definirModalidade(conta, valor) {
    setModalidade((p) => {
      const novo = { ...p };
      if (valor) novo[conta] = valor;
      else delete novo[conta];
      return novo;
    });
  }

  /** O perfil sobrescreve a sugestão automática, e cada conta que ele traz
   *  passa a contar como decisão manual — porque é isso que ela é: alguém
   *  já decidiu, num mês anterior, para onde essa conta vai. */
  function aplicarPerfil(perfil) {
    setClassif((p) => ({ ...p, ...perfil.contas }));
    if (perfil.modalidades) setModalidade((p) => ({ ...p, ...perfil.modalidades }));
    setTocadas((p) => {
      const novo = { ...p };
      Object.keys(perfil.contas).forEach((c) => { novo[c] = true; });
      return novo;
    });
  }

  const sessao = {
    dados: { classif, tocadas, resultadoManual, modalidade },
    vazio: false, // quem decide se a sessão vale é a fonte, não a classificação
    restaurar: (s) => {
      setClassif(s.classif || {});
      setTocadas(s.tocadas || {});
      setResultadoManual(s.resultadoManual || {});
      setModalidade(s.modalidade || {});
    },
    limpar: () => { setClassif({}); setTocadas({}); setResultadoManual({}); setModalidade({}); },
  };

  return {
    classif, tocadas, resultadoManual, setResultadoManual,
    grupos1, digitosResultado, contasResultado, sugestao, grupoDe, dre, prova,
    modalidade, sugestaoModalidade, modalidadeDe, definirModalidade,
    dresPorBalancete, classificar, aplicarPerfil,
    manuais: Object.values(tocadas).filter(Boolean).length,
    limparManuais: () => { setClassif({}); setTocadas({}); },
    sessao,
  };
}
