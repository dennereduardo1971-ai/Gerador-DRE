import { useMemo, useState } from "react";
import {
  ALCANCE_PADRAO, CATALOGO_PADRAO, FAIXA_PADRAO, RESIDUAL,
  normalizarAlcance, normalizarCatalogo, novoId,
} from "../lib/modalidade.js";
import { ROTULOS_VAZIOS, definirRotulo, normalizarRotulos, quantosRotulos } from "../lib/rotulos.js";

/* OS NOMES — os apelidos do usuário e o catálogo de modalidades.
 *
 * Assunto próprio, e não um pedaço de `useClassificacao`, porque são
 * decisões de natureza diferente: classificar responde "para onde esta
 * conta vai" e renomear responde "como isso se chama aqui". Misturar os
 * dois faria uma tela de cadastro mexer em número e uma tela de nome
 * mexer em destino.
 *
 * O CATÁLOGO MORA AQUI, e não junto da classificação, porque ele é
 * majoritariamente nome: o que a faixa se chama e quais termos do plano
 * de contas a identificam. Junto dele vieram as duas perguntas que
 * completam a regra — o ALCANCE (quais contas se dividem) e a FAIXA
 * PADRÃO (onde cai a conta do alcance que o plano não identifica) —,
 * porque são a mesma parametrização, editada na mesma tela e salva no
 * mesmo perfil. Quem RESOLVE a modalidade de cada conta continua sendo
 * `useClassificacao`, que recebe tudo isto pronto: uma decisão, um dono.
 *
 * O ESTADO GUARDA O QUE FOI DIGITADO; a normalização acontece na leitura
 * (`catalogo`, `alcance`). Normalizar a cada tecla é o que fazia a
 * vírgula sumir enquanto se escrevia o segundo termo de uma modalidade,
 * e o nome voltar ao id no instante em que o campo ficava vazio para ser
 * reescrito.
 *
 * Como todo hook deste projeto, ele sabe se salvar, se restaurar e se
 * zerar sozinho (`sessao`), e sabe aplicar um perfil.
 */
/** O catálogo como o EDITOR o mostra: os mesmos termos, separados por
 *  ", " em vez de ",". Roda só na semeadura — abrir o app, restaurar a
 *  sessão, aplicar um perfil, acrescentar ou mover uma faixa —, nunca
 *  enquanto alguém digita, porque é exatamente aí que reescrever o texto
 *  a cada tecla briga com quem escreve. */
const paraEdicao = (lista) =>
  normalizarCatalogo(lista).map((m) => ({ ...m, termos: m.termos.join(", ").split(",") }));

export function useRotulos() {
  const [rotulos, setRotulos] = useState(ROTULOS_VAZIOS);
  const [catalogo, setCatalogo] = useState(() => paraEdicao(CATALOGO_PADRAO));
  const [alcanceTexto, setAlcanceTexto] = useState(ALCANCE_PADRAO.join(", "));
  const [faixaPadrao, setFaixaPadrao] = useState(FAIXA_PADRAO);

  /** Renomeia qualquer coisa: conta, grupo da DRE, linha estrutural ou
   *  categoria do CPC 51. Texto vazio devolve o nome original. */
  const renomear = (eixo, chave, valor) => setRotulos((r) => definirRotulo(r, eixo, chave, valor));

  const restaurarNomes = () => setRotulos(ROTULOS_VAZIOS);

  /* ---------------- O catálogo de modalidades ---------------- */

  /** Modalidade nova entra ANTES da residual, sempre. A residual é o
   *  balde de quem está fora do alcance e fecha a lista: empurrá-la para
   *  o meio faria a DRE mostrar o não dividido antes de uma modalidade
   *  de verdade. */
  function adicionarModalidade(nome) {
    setCatalogo((c) => {
      const lista = paraEdicao(c);
      const limpo = String(nome || "").trim();
      if (!limpo) return lista;
      const nova = { id: novoId(limpo, lista), nome: limpo, termos: [limpo] };
      const residual = lista[lista.length - 1];
      return [...lista.slice(0, -1), nova, residual];
    });
  }

  /** O nome muda, o id NÃO. O id é a chave que as contas decididas à mão
   *  guardam — regerá-lo no rename apagaria todas de uma vez.
   *
   *  Guarda o texto cru, inclusive vazio: quem apaga o campo para
   *  reescrever precisa ver o campo vazio. Quem transforma vazio no id de
   *  volta é `normalizarCatalogo`, na leitura. */
  function renomearModalidade(id, nome) {
    setCatalogo((c) => c.map((m) => (m.id === id ? { ...m, nome: String(nome ?? "") } : m)));
  }

  /** Os termos que identificam a modalidade no nome da conta, escritos
   *  como o usuário fala: separados por vírgula.
   *
   *  A quebra guarda os pedaços CRUS — sem aparar e sem descartar o
   *  pedaço vazio —, e a tela os junta com `join(",")`. É isso que faz o
   *  texto voltar exatamente como foi digitado enquanto se digita:
   *  aparando aqui, a vírgula recém-teclada desaparecia antes da primeira
   *  letra do segundo termo. Quem apara e descarta vazio é
   *  `normalizarCatalogo`, na leitura. */
  function definirTermos(id, texto) {
    const termos = String(texto ?? "").split(",");
    setCatalogo((c) => c.map((m) => (m.id === id ? { ...m, termos } : m)));
  }

  /** Remover uma modalidade não perde conta nenhuma: quem estava nela cai
   *  na faixa padrão, porque `fazerModalidadeDe` valida contra o
   *  catálogo. A residual não se remove — ver `modalidade.js`. */
  function removerModalidade(id) {
    if (id === RESIDUAL) return;
    const lista = paraEdicao(catalogo).filter((m) => m.id !== id);
    setCatalogo(lista);
    /* Removeu justamente a faixa que recebia o não identificado: o padrão
       anda para a primeira que sobrou, senão toda conta do alcance cairia
       num id que não existe mais. */
    if (id === faixaPadrao) setFaixaPadrao(lista.find((m) => !m.residual)?.id || RESIDUAL);
  }

  /** Sobe ou desce uma modalidade. Muda a ORDEM DAS FAIXAS na
   *  demonstração e nada mais: a classificação desempata por termo mais
   *  longo, de propósito, para a ordem da lista não virar uma regra
   *  escondida (ver `modalidadeDoTexto`). */
  function moverModalidade(id, delta) {
    setCatalogo((c) => {
      const lista = paraEdicao(c);
      const i = lista.findIndex((m) => m.id === id);
      const j = i + delta;
      // a residual fica sempre no fim: nem ela se move, nem outra passa por ela
      if (i < 0 || j < 0 || j >= lista.length - 1 || lista[i].residual) return lista;
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
  }

  /* ------------- Quem se divide, e onde cai o resto ------------- */

  /** Os prefixos de código que participam da divisão, como o usuário
   *  escreve: "3" ou "3, 5". Vazio divide todas as contas. */
  const definirAlcance = (texto) => setAlcanceTexto(String(texto ?? ""));

  /** A faixa que recebe a conta do alcance que o plano não identifica.
   *  `RESIDUAL` aqui significa "nenhuma" — ela fica de fora da divisão. */
  const definirFaixaPadrao = (id) => setFaixaPadrao(id || RESIDUAL);

  function restaurarCatalogo() {
    setCatalogo(paraEdicao(CATALOGO_PADRAO));
    setAlcanceTexto(ALCANCE_PADRAO.join(", "));
    setFaixaPadrao(FAIXA_PADRAO);
  }

  const catalogoValido = useMemo(() => normalizarCatalogo(catalogo), [catalogo]);
  const alcance = useMemo(() => normalizarAlcance(alcanceTexto), [alcanceTexto]);
  const quantos = useMemo(() => quantosRotulos(rotulos), [rotulos]);

  const sessao = {
    dados: {
      rotulos, catalogoModalidades: catalogoValido,
      alcanceModalidade: alcance, faixaPadraoModalidade: faixaPadrao,
    },
    vazio: false, // quem decide se a sessão vale é a fonte, não os nomes
    restaurar: (s) => {
      setRotulos(normalizarRotulos(s.rotulos));
      setCatalogo(paraEdicao(s.catalogoModalidades?.length ? s.catalogoModalidades : CATALOGO_PADRAO));
      setAlcanceTexto(normalizarAlcance(s.alcanceModalidade ?? ALCANCE_PADRAO).join(", "));
      setFaixaPadrao(s.faixaPadraoModalidade || FAIXA_PADRAO);
    },
    limpar: () => { setRotulos(ROTULOS_VAZIOS); restaurarCatalogo(); },
  };

  /** Apelidos, catálogo, alcance e faixa padrão viajam no perfil como
   *  qualquer outra decisão — é o que transforma renomear 200 contas num
   *  ativo em vez de um trabalho a refazer todo mês. */
  function aplicarPerfil(perfil) {
    if (perfil.catalogoModalidades?.length) setCatalogo(paraEdicao(perfil.catalogoModalidades));
    if (perfil.alcanceModalidade) setAlcanceTexto(normalizarAlcance(perfil.alcanceModalidade).join(", "));
    if (perfil.faixaPadraoModalidade) setFaixaPadrao(perfil.faixaPadraoModalidade);
    if (perfil.rotulos) setRotulos((r) => {
      const vindo = normalizarRotulos(perfil.rotulos);
      return {
        contas: { ...r.contas, ...vindo.contas },
        grupos: { ...r.grupos, ...vindo.grupos },
        linhas: { ...r.linhas, ...vindo.linhas },
        categorias51: { ...r.categorias51, ...vindo.categorias51 },
      };
    });
  }

  return {
    rotulos, quantosRotulos: quantos,
    /* `catalogo` é o normalizado — o que o app inteiro consome.
       `catalogoEdicao` é o cru, e só o editor de nomes o vê: é ele que
       preserva a vírgula e o campo vazio enquanto se digita. */
    catalogo: catalogoValido, catalogoEdicao: catalogo,
    alcance, alcanceTexto, faixaPadrao,
    renomear, restaurarNomes,
    adicionarModalidade, renomearModalidade, definirTermos, removerModalidade,
    moverModalidade, restaurarCatalogo, definirAlcance, definirFaixaPadrao,
    aplicarPerfil, sessao,
  };
}
