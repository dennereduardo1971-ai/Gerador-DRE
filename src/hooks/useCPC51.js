import { useMemo, useState } from "react";
import { sugerirClassificacao } from "../lib/classify.js";
import {
  POLITICA_PADRAO, coberturaCPC51, conciliar, contasMistas, deParaCPC51,
  fazerCategoriaDe, montarDRE51,
} from "../lib/cpc51.js";
import { comparativo51 } from "../lib/linhasCPC51.js";

/* A ESTRUTURA QUE ENTRA EM 2027.
 *
 * A categoria do CPC 51 é um eixo PARALELO ao grupo da DRE, não um grupo
 * novo: a mesma conta tem os dois. As duas demonstrações leem exatamente
 * as mesmas contas, e é isso que faz o lucro líquido ser idêntico nelas —
 * `conciliar` mede essa igualdade a cada render em vez de confiar nela.
 *
 * `politica`, `categoriaConta` e `medidas` são DECISÃO, não dado
 * importado: viajam na sessão e no perfil, junto da classificação manual.
 */
export function useCPC51({ contasResultado, grupoDe, dre, nomesEfetivos, aba, dresPorBalancete, periodoAtivo }) {
  const [politica, setPolitica] = useState(POLITICA_PADRAO);
  const [categoriaConta, setCategoriaConta] = useState({});
  const [medidas, setMedidas] = useState([]);

  const categoriaDe = useMemo(
    () => fazerCategoriaDe({ grupoDe, categoriaPorConta: categoriaConta, politica }),
    [grupoDe, categoriaConta, politica]
  );

  const dre51 = useMemo(
    () => montarDRE51(contasResultado, grupoDe, categoriaDe),
    [contasResultado, grupoDe, categoriaDe]
  );

  const conciliacao = useMemo(
    () => conciliar(dre, dre51, contasResultado, grupoDe, categoriaDe),
    [dre, dre51, contasResultado, grupoDe, categoriaDe]
  );

  /* A leitura por TEXTO (sem perfil de plano de contas) serve só ao
     detector de contas mistas: ela é a segunda opinião que se confronta
     com a categoria efetiva. Roda apenas com a aba aberta, porque é uma
     passada de regex por todas as contas e nenhuma outra tela precisa. */
  const sugestaoTexto = useMemo(
    () => (aba === "cpc51" && contasResultado.length ? sugerirClassificacao(contasResultado, nomesEfetivos, []) : {}),
    [aba, contasResultado, nomesEfetivos]
  );

  const mistas = useMemo(
    () => contasMistas(contasResultado, { grupoDe, categoriaDe, sugestaoTexto, politica }),
    [contasResultado, grupoDe, categoriaDe, sugestaoTexto, politica]
  );

  const cobertura = useMemo(
    () => coberturaCPC51(contasResultado, { grupoDe, categoriaPorConta: categoriaConta, politica }),
    [contasResultado, grupoDe, categoriaConta, politica]
  );

  const dePara = useMemo(
    () => deParaCPC51(contasResultado, { grupoDe, categoriaPorConta: categoriaConta, politica, nomes: nomesEfetivos }),
    [contasResultado, grupoDe, categoriaConta, politica, nomesEfetivos]
  );

  /* A demonstração do CPC 51 de cada balancete carregado, para a coluna
     comparativa do Excel. `comparativo51` decide sozinho se existe período
     anterior de verdade; quando não existe, a coluna sai em branco em vez
     de comparar coisas diferentes. */
  const dres51PorPeriodo = useMemo(
    () => (dresPorBalancete || []).map((d) => ({
      competencia: d.competencia, rotulo: d.rotulo,
      dre51: montarDRE51(d.contas, grupoDe, categoriaDe),
    })),
    [dresPorBalancete, grupoDe, categoriaDe]
  );

  const comparativo = useMemo(
    () => comparativo51(dres51PorPeriodo, periodoAtivo),
    [dres51PorPeriodo, periodoAtivo]
  );

  function definirCategoria(conta, categoria) {
    setCategoriaConta((p) => {
      const novo = { ...p };
      if (categoria) novo[conta] = categoria;
      else delete novo[conta]; // volta ao padrão do grupo
      return novo;
    });
  }

  /* Um ajuste por grupo, no máximo: pedir "excluir Depreciação" numa
     medida que já a inclui é trocar de intenção, não empilhar duas linhas
     que se anulam na conciliação. */
  function ajustarMedida(id, grupo, modo) {
    setMedidas((ms) =>
      ms.map((m) =>
        m.id === id
          ? { ...m, ajustes: [...(m.ajustes || []).filter((a) => a.id !== grupo), { tipo: "grupo", id: grupo, modo }] }
          : m
      )
    );
  }

  function aplicarPerfil(perfil) {
    // As decisões do CPC 51 andam junto com as de classificação: quem
    // separou juros de mora de rendimento de aplicação em janeiro não deve
    // refazer isso em fevereiro.
    if (perfil.categorias && Object.keys(perfil.categorias).length) {
      setCategoriaConta((p) => ({ ...p, ...perfil.categorias }));
    }
    if (perfil.politica) setPolitica((p) => ({ ...p, ...perfil.politica }));
    if (perfil.medidas?.length) setMedidas(perfil.medidas);
  }

  const sessao = {
    dados: { politica51: politica, categoriaConta, medidas51: medidas },
    vazio: false,
    restaurar: (s) => {
      setPolitica({ ...POLITICA_PADRAO, ...s.politica51 });
      setCategoriaConta(s.categoriaConta || {});
      setMedidas(s.medidas51 || []);
    },
    // Categorias, política e MPDA são decisões sobre ESTE cliente: saem
    // junto com o resto no "Limpar tudo".
    limpar: () => { setPolitica(POLITICA_PADRAO); setCategoriaConta({}); setMedidas([]); },
  };

  return {
    politica, setPolitica, categoriaConta, medidas, setMedidas,
    categoriaDe, dre51, conciliacao, mistas, cobertura, dePara, comparativo,
    definirCategoria, ajustarMedida, aplicarPerfil,
    limparCategorias: () => setCategoriaConta({}),
    sessao,
  };
}
