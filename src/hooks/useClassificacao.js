import { useMemo, useState } from "react";
import { agruparPorDigito, montarDRE, provaIntegridade, sugerirClassificacao } from "../lib/classify.js";
import { contasDeMovimento } from "../lib/balancete.js";

/* PARA ONDE VAI CADA CONTA — e a DRE que sai disso.
 *
 * `classif` são as escolhas manuais, `sugestao` é o que o app propõe, e
 * `grupoDe` é a resolução das duas: manual sempre vence. Importar um plano
 * de contas novo, ou trocar de balancete, nunca desfaz uma escolha manual.
 *
 * A DRE de CADA balancete carregado também sai daqui (`dresPorBalancete`),
 * porque é a mesma decisão aplicada a outro período — a Comparativa e a
 * coluna comparativa do CPC 51 leem dessa lista. Ela usa `grupoDe`, ou
 * seja, reclassificar uma conta corrige todas as colunas de uma vez.
 */
export function useClassificacao({ contas, nomesEfetivos, planos, balancetes }) {
  const [classif, setClassif] = useState({});
  const [tocadas, setTocadas] = useState({});
  const [resultadoManual, setResultadoManual] = useState({});

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

  const dre = useMemo(() => montarDRE(contasResultado, grupoDe), [contasResultado, grupoDe]);
  const prova = useMemo(() => provaIntegridade(contasResultado, grupoDe), [contasResultado, grupoDe]);

  /* A DRE de cada balancete, em ordem cronológica. `rotulo` é o que se
     imprime e `competencia` é a chave — as duas vêm do próprio arquivo,
     que declara o período que cobre. */
  const dresPorBalancete = useMemo(
    () => (balancetes || []).map((b) => {
      const cs = contasDeMovimento(b.bal).filter((c) => digitosResultado.includes(c.conta[0]));
      return { competencia: b.chave, rotulo: b.rotulo, contas: cs, dre: montarDRE(cs, grupoDe) };
    }),
    [balancetes, digitosResultado, grupoDe]
  );

  function classificar(conta, grupo) {
    setClassif((p) => ({ ...p, [conta]: grupo }));
    setTocadas((p) => ({ ...p, [conta]: true }));
  }

  /** O perfil sobrescreve a sugestão automática, e cada conta que ele traz
   *  passa a contar como decisão manual — porque é isso que ela é: alguém
   *  já decidiu, num mês anterior, para onde essa conta vai. */
  function aplicarPerfil(perfil) {
    setClassif((p) => ({ ...p, ...perfil.contas }));
    setTocadas((p) => {
      const novo = { ...p };
      Object.keys(perfil.contas).forEach((c) => { novo[c] = true; });
      return novo;
    });
  }

  const sessao = {
    dados: { classif, tocadas, resultadoManual },
    vazio: false, // quem decide se a sessão vale é a fonte, não a classificação
    restaurar: (s) => {
      setClassif(s.classif || {});
      setTocadas(s.tocadas || {});
      setResultadoManual(s.resultadoManual || {});
    },
    limpar: () => { setClassif({}); setTocadas({}); setResultadoManual({}); },
  };

  return {
    classif, tocadas, resultadoManual, setResultadoManual,
    grupos1, digitosResultado, contasResultado, sugestao, grupoDe, dre, prova,
    dresPorBalancete, classificar, aplicarPerfil,
    manuais: Object.values(tocadas).filter(Boolean).length,
    limparManuais: () => { setClassif({}); setTocadas({}); },
    sessao,
  };
}
