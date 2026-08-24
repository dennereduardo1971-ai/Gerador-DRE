import { useMemo, useState } from "react";
import {
  PARAMS_FISCAIS_PADRAO, ajustesEfetivos, apurarLalur, apurarPisCofins,
  deParaTributos, resumoFiscal,
} from "../lib/fiscal.js";

/* A APURAÇÃO FISCAL — parâmetros, ajustes do LALUR e o confronto.
 *
 * A divisão entre o que viaja no perfil e o que não viaja é contábil, não
 * técnica:
 *
 * - `params` e `mapaTributos` são DECISÃO sobre o cliente (regime,
 *   alíquotas, adesão ao PROUNI, qual conta é PIS e qual é COFINS). Vão
 *   para o perfil, que é compartilhável justamente por não carregar
 *   número de ninguém.
 * - `prejuizo` são VALORES — saldo de prejuízo fiscal e de base negativa
 *   de CSLL de uma empresa identificada. Ficam só na sessão (IndexedDB) e
 *   saem no "Limpar tudo". O perfil continua podendo ser versionado.
 * - `ajustes` ficam na sessão também: cada um carrega um valor.
 */
export function useFiscal({ dre, nomesEfetivos }) {
  const [params, setParams] = useState(PARAMS_FISCAIS_PADRAO);
  const [mapaTributos, setMapaTributos] = useState({});
  const [ajustesManuais, setAjustesManuais] = useState([]);
  const [prejuizo, setPrejuizo] = useState({ fiscal: 0, baseNegativa: 0 });

  const linhasTributo = useMemo(
    () => deParaTributos(dre, { mapaTributos, nomes: nomesEfetivos }),
    [dre, mapaTributos, nomesEfetivos]
  );

  const ajustes = useMemo(() => ajustesEfetivos(dre, ajustesManuais), [dre, ajustesManuais]);

  const pisCofins = useMemo(
    () => apurarPisCofins({ dre, params, linhasTributo }),
    [dre, params, linhasTributo]
  );

  const lalur = useMemo(
    () => apurarLalur({ dre, params, ajustes, prejuizo }),
    [dre, params, ajustes, prejuizo]
  );

  const resumo = useMemo(() => resumoFiscal(pisCofins, lalur), [pisCofins, lalur]);

  function definirTributo(conta, tributo) {
    setMapaTributos((p) => {
      const novo = { ...p };
      if (tributo) novo[conta] = tributo;
      else delete novo[conta]; // volta à sugestão pelo nome
      return novo;
    });
  }

  /** Aceitar, recusar ou editar um ajuste. Editar uma sugestão a
   *  transforma em decisão manual — não empilha as duas. */
  function alterarAjuste(id, mudanca) {
    setAjustesManuais((ms) => {
      const atual = ajustes.find((a) => a.id === id);
      if (!atual) return ms;
      const novo = { ...atual, ...mudanca, origem: "manual" };
      return [...ms.filter((m) => m.id !== id), novo];
    });
  }

  function acrescentarAjuste() {
    const id = `man:${Date.now()}`;
    setAjustesManuais((ms) => [...ms, {
      id, descricao: "", tipo: "adicao", valor: 0,
      motivo: "", origem: "manual", aceito: true,
    }]);
  }

  const removerAjuste = (id) => setAjustesManuais((ms) => ms.filter((m) => m.id !== id));

  function aplicarPerfil(perfil) {
    if (perfil.fiscal?.params) setParams((p) => ({ ...p, ...perfil.fiscal.params }));
    if (perfil.fiscal?.mapaTributos) setMapaTributos((p) => ({ ...p, ...perfil.fiscal.mapaTributos }));
  }

  const sessao = {
    // `prejuizo` está aqui e NÃO em `paraPerfil`: é valor de cliente.
    dados: { paramsFiscais: params, mapaTributos, ajustesFiscais: ajustesManuais, prejuizoFiscal: prejuizo },
    vazio: false,
    restaurar: (s) => {
      setParams({ ...PARAMS_FISCAIS_PADRAO, ...s.paramsFiscais });
      setMapaTributos(s.mapaTributos || {});
      setAjustesManuais(s.ajustesFiscais || []);
      setPrejuizo({ fiscal: 0, baseNegativa: 0, ...s.prejuizoFiscal });
    },
    limpar: () => {
      setParams(PARAMS_FISCAIS_PADRAO);
      setMapaTributos({});
      setAjustesManuais([]);
      setPrejuizo({ fiscal: 0, baseNegativa: 0 });
    },
  };

  return {
    params, setParams, mapaTributos, prejuizo, setPrejuizo,
    linhasTributo, ajustes, pisCofins, lalur, resumo,
    definirTributo, alterarAjuste, acrescentarAjuste, removerAjuste,
    aplicarPerfil,
    // Só decisão, nunca valor — é o que entra no arquivo de perfil.
    paraPerfil: { params, mapaTributos },
    sessao,
  };
}
