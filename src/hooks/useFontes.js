import { useMemo, useRef, useState } from "react";
import { importarAbasSimples, importarLinhasSimples } from "../lib/importarArquivo.js";
import { parsearPlanoDeContas } from "../lib/formato.js";
import {
  coberturaBalancete, contasDeMovimento, detectarColunas, identidadeDoPeriodo,
  nomesDoBalancete, ordenarBalancetes, parsearBalancete, periodoDoBalancete,
} from "../lib/balancete.js";
import { escolherPlano } from "../lib/planoPerfil.js";
import { PLANOS_EMBUTIDOS } from "../lib/planos/iesb.js";

/* A FONTE DOS DADOS: um ou vários balancetes de verificação.
 *
 * O razão contábil saiu do app em 24/08/2026. O balancete já passou pelo
 * fechamento da contabilidade, monta a DRE sozinho e entrega o plano de
 * contas de graça — e o que o razão fazia de único (competência mês a mês)
 * se resolve carregando VÁRIOS balancetes, cada um declarando o próprio
 * período.
 *
 * Um deles fica "em foco" (`ativo`): é o que a DRE, o De-Para e o CPC 51
 * leem. Todos juntos, em ordem cronológica, alimentam a Comparativa e a
 * coluna comparativa do CPC 51.
 */

/* A mensagem que a tela mostra depois de ler um balancete.
 *
 * Ela responde três perguntas, nessa ordem, porque é a ordem em que elas
 * derrubam o trabalho de quem confere: o arquivo é consistente consigo
 * mesmo? ele cobre o que eu preciso? de que período ele é? */
export function avisoDoBalancete(bal, periodo) {
  const r = bal.resumo;
  const partes = [
    `Balancete carregado: ${r.nContas} contas (${r.nFolhas} analíticas)` +
      (periodo?.legivel ? `, período de ${periodo.legivel}` : "") + ".",
  ];

  partes.push(
    r.integro
      ? "Conferência interna do arquivo: anterior + movimento = atual em todas as linhas, e cada conta sintética bate com suas filhas."
      : `Atenção: ${r.inconsistentes} linha(s) e ${r.sinteticasErradas} sintética(s) não fecham dentro do próprio arquivo.`
  );

  // A hierarquia não é dedutível só do código quando a máscara do
  // relatório é ambígua; quando o app precisa remontar um ramo para a
  // sintética fechar, ele diz que remontou — não é silencioso.
  if (bal.reconciliadas.length) {
    partes.push(
      `A hierarquia de ${bal.reconciliadas.length} ramo(s) foi remontada pelos próprios totais do arquivo ` +
      `(${bal.reconciliadas.map((m) => `${m.de} → ${m.para}`).join(", ")}), porque a numeração das contas sozinha não fechava.`
    );
  }

  if (r.resultadoConfere === true) {
    partes.push(
      "O resultado do período apurado pelas contas patrimoniais bate com o apurado pelas contas de " +
      "resultado — dois caminhos independentes para o mesmo número. É a validação mais forte que este arquivo permite."
    );
  } else if (r.resultadoConfere === false) {
    partes.push(
      "ATENÇÃO: o resultado do período apurado pelas contas 1 e 2 NÃO bate com o apurado pelas contas " +
      "3 a 7. O arquivo tem problema antes de qualquer classificação."
    );
  }

  const cob = coberturaBalancete(bal);
  if (!cob.resultado) {
    partes.push(
      `Este arquivo traz só as contas ${cob.digitos.join(" e ")} — sem as contas de resultado (3 a 7) ` +
      "não há DRE a montar. Exporte o mesmo relatório sem filtrar por conta."
    );
  }

  return partes.join(" ");
}

const RECUSA =
  "Não reconheci um balancete de verificação nesse arquivo. Ele precisa trazer, por conta, o " +
  "saldo anterior, o débito e o crédito do período e o saldo atual — é o relatório que o sistema " +
  "contábil emite para o fechamento.";

export function useFontes() {
  const [balancetes, setBalancetes] = useState([]);
  const [ativo, setAtivo] = useState("");
  /* A `ordem` (AAAAMMDD) do período em foco.
     Soltar cinco meses de uma vez dispara CINCO importações assíncronas em
     paralelo — `EtapaImportar` faz `forEach(f => onImportar(f))`. Quem
     terminar de ler por último ganhava o foco, e a tela abria num mês
     qualquer do meio, diferente a cada carga, sem nada na interface
     explicando por quê. Comparar a ordem torna o resultado o mesmo
     independentemente de quem resolve primeiro: o mês mais novo fica em
     foco. Um ref, e não estado, porque o valor precisa valer JÁ na
     importação seguinte, sem esperar o próximo render. */
  const foco = useRef("");
  const [aviso, setAviso] = useState("");
  // Nomes de conta importados à mão continuam existindo: o balancete
  // resolve o caso comum, mas quem tem o plano num arquivo à parte não
  // deve perder a possibilidade de carregá-lo.
  const [nomes, setNomes] = useState({});
  const [avisoPlano, setAvisoPlano] = useState("");
  // Perfis carregados pelo usuário entram na frente dos embutidos, para
  // dar para corrigir um perfil embutido sem precisar de novo build.
  const [planosExtras, setPlanosExtras] = useState([]);

  async function importar(file) {
    if (!file) return;
    try {
      /* Lê TODAS as abas: a dos dados é a que tem cabeçalho de balancete
         (não a primeira, porque o relatório vem com uma aba "Parametros"
         na frente), e é justamente essa aba de parâmetros que declara o
         período coberto pelo arquivo. */
      const abas = await importarAbasSimples(file);
      const daAba = abas.find((a) => detectarColunas(a.linhas)) || abas[0];
      const bal = parsearBalancete(daAba ? daAba.linhas : []);
      if (!bal) { setAviso(RECUSA); return; }

      const periodo = periodoDoBalancete(abas);
      const { chave, rotulo, ordem } = identidadeDoPeriodo(periodo, file.name);
      const entrada = {
        chave, rotulo, ordem, periodo, bal,
        arquivo: file.name,
        cobertura: coberturaBalancete(bal),
      };
      // Reimportar o mesmo período SUBSTITUI em vez de duplicar: é a
      // correção de um mês, não um mês novo.
      setBalancetes((ps) => ordenarBalancetes([...ps.filter((p) => p.chave !== chave), entrada]));
      /* Reimportar a correção de um mês antigo não rouba o foco do mês
         novo: o arquivo é substituído do mesmo jeito, mas a tela fica
         onde estava. */
      if (String(entrada.ordem) >= foco.current) {
        foco.current = String(entrada.ordem);
        setAtivo(chave);
      }
      setAviso(avisoDoBalancete(bal, periodo));
    } catch {
      setAviso("Não consegui ler esse arquivo de balancete.");
    }
  }

  function remover(chave) {
    setBalancetes((ps) => {
      const resto = ps.filter((p) => p.chave !== chave);
      setAtivo((a) => {
        if (a !== chave) return a;
        const proximo = resto[resto.length - 1];
        foco.current = String(proximo?.ordem || "");
        return proximo?.chave || "";
      });
      if (!resto.length) setAviso("");
      return resto;
    });
  }

  function importarPlano(file) {
    if (!file) return;
    setAvisoPlano("");
    importarLinhasSimples(file)
      .then((linhas) => {
        const novos = parsearPlanoDeContas(linhas);
        const quantos = Object.keys(novos).length;
        if (!quantos) {
          setAvisoPlano("Não achei nenhum par código/descrição nesse arquivo. O plano de contas precisa ter o código na primeira coluna e a descrição na segunda.");
          return;
        }
        setNomes((p) => ({ ...p, ...novos }));
        setAvisoPlano(`Plano de contas importado: ${quantos} contas nomeadas.`);
      })
      .catch(() => setAvisoPlano("Não consegui ler esse arquivo de plano de contas."));
  }

  /** Trocar o mês em foco pela tela. Mantém `foco` em dia para que a
   *  próxima importação compare com o que está de fato na tela. */
  function escolher(chave) {
    foco.current = String(balancetes.find((b) => b.chave === chave)?.ordem || "");
    setAtivo(chave);
  }

  const emFoco = useMemo(
    () => balancetes.find((b) => b.chave === ativo) || balancetes[balancetes.length - 1] || null,
    [balancetes, ativo]
  );

  /* AS CONTAS DA DEMONSTRAÇÃO.
     `contasDeMovimento` converte as folhas do balancete para o formato que
     o resto do app usa. Atenção ao sinal: aqui saldo = crédito − débito
     (natureza credora positiva, que é o que `montarDRE` espera para
     receitas), enquanto o balancete guarda movimento = débito − crédito.
     Um é o negativo do outro, e trocar isso inverteria a DRE inteira sem
     quebrar mais nada visivelmente. Há teste guardando esse ponto. */
  const contas = useMemo(() => contasDeMovimento(emFoco?.bal), [emFoco]);

  /* O balancete traz o plano de contas junto — código e descrição de
     todas as contas, sintéticas inclusive. Como a classificação por
     código reconhece o plano pela ASSINATURA (o nome das contas-síntese
     de topo), carregar o balancete dispensa o arquivo separado de plano
     de contas. Entram por baixo do que o usuário importou à mão, que
     continua tendo a última palavra.

     A união é de TODOS os balancetes, não só o em foco: um mês pode não
     trazer uma conta que outro traz, e o plano mais completo classifica
     melhor. */
  const nomesEfetivos = useMemo(() => {
    const doArquivo = {};
    balancetes.forEach((b) => Object.assign(doArquivo, nomesDoBalancete(b.bal)));
    return { ...doArquivo, ...nomes };
  }, [balancetes, nomes]);

  const planos = useMemo(() => [...planosExtras, ...PLANOS_EMBUTIDOS], [planosExtras]);
  const planoAtivo = useMemo(() => escolherPlano(planos, nomesEfetivos), [planos, nomesEfetivos]);

  const sessao = {
    dados: { balancetes, ativo, aviso, nomes },
    vazio: balancetes.length === 0,
    restaurar: (s) => {
      const lista = ordenarBalancetes(s.balancetes || []);
      setBalancetes(lista);
      setAtivo(s.ativo || "");
      // Sessão restaurada também acerta o marcador: sem isso, o primeiro
      // balancete importado depois de reabrir o app roubaria o foco.
      foco.current = String(lista.find((b) => b.chave === s.ativo)?.ordem || "");
      setAviso(s.aviso || "");
      setNomes(s.nomes || {});
    },
    limpar: () => {
      setBalancetes([]); setAtivo(""); foco.current = "";
      setAviso(""); setNomes({}); setAvisoPlano("");
    },
  };

  return {
    balancetes, ativo, aviso, emFoco, contas, nomesEfetivos, planos, planoAtivo,
    avisoPlano, setAvisoPlano, aplicarPlano: (p) => setPlanosExtras((ps) => [p, ...ps]),
    aplicarNomes: (novos) => setNomes((p) => ({ ...novos, ...p })),
    resumo: emFoco?.bal?.resumo || null,
    cobertura: emFoco?.cobertura || { patrimonial: false, resultado: false, digitos: [] },
    periodo: emFoco?.rotulo || "",
    temDados: contas.length > 0,
    importar, remover, setAtivo: escolher, importarPlano, sessao,
  };
}
