import { useMemo, useState } from "react";
import { CATALOGO_PADRAO, RESIDUAL, normalizarCatalogo, novoId } from "../lib/modalidade.js";
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
 * de contas a identificam. Quem RESOLVE a modalidade de cada conta
 * continua sendo `useClassificacao`, que recebe este catálogo pronto —
 * uma decisão, um dono.
 *
 * Como todo hook deste projeto, ele sabe se salvar, se restaurar e se
 * zerar sozinho (`sessao`), e sabe aplicar um perfil.
 */
export function useRotulos() {
  const [rotulos, setRotulos] = useState(ROTULOS_VAZIOS);
  const [catalogo, setCatalogo] = useState(CATALOGO_PADRAO);

  /** Renomeia qualquer coisa: conta, grupo da DRE, linha estrutural ou
   *  categoria do CPC 51. Texto vazio devolve o nome original. */
  const renomear = (eixo, chave, valor) => setRotulos((r) => definirRotulo(r, eixo, chave, valor));

  const restaurarNomes = () => setRotulos(ROTULOS_VAZIOS);

  /* ---------------- O catálogo de modalidades ---------------- */

  /** Modalidade nova entra ANTES da residual, sempre. A residual é a
   *  última faixa de toda linha dividida: empurrá-la para o meio faria a
   *  DRE mostrar "Comum" antes de uma modalidade de verdade. */
  function adicionarModalidade(nome) {
    setCatalogo((c) => {
      const lista = normalizarCatalogo(c);
      const limpo = String(nome || "").trim();
      if (!limpo) return lista;
      const nova = { id: novoId(limpo, lista), nome: limpo, termos: [limpo] };
      const residual = lista[lista.length - 1];
      return [...lista.slice(0, -1), nova, residual];
    });
  }

  /** O nome muda, o id NÃO. O id é a chave que as contas decididas à mão
   *  guardam — regerá-lo no rename apagaria todas de uma vez. */
  function renomearModalidade(id, nome) {
    setCatalogo((c) => normalizarCatalogo(c).map((m) => (m.id === id ? { ...m, nome: String(nome || "").trim() || m.id } : m)));
  }

  /** Os termos que identificam a modalidade no nome da conta, escritos
   *  como o usuário fala: separados por vírgula. */
  function definirTermos(id, texto) {
    const termos = String(texto || "").split(",").map((t) => t.trim()).filter(Boolean);
    setCatalogo((c) => normalizarCatalogo(c).map((m) => (m.id === id ? { ...m, termos } : m)));
  }

  /** Remover uma modalidade não perde conta nenhuma: quem estava nela cai
   *  na faixa residual, porque `fazerModalidadeDe` valida contra o
   *  catálogo. A residual não se remove — ver `modalidade.js`. */
  function removerModalidade(id) {
    if (id === RESIDUAL) return;
    setCatalogo((c) => normalizarCatalogo(c).filter((m) => m.id !== id));
  }

  /** Sobe ou desce uma modalidade. Muda a ORDEM DAS FAIXAS na
   *  demonstração e nada mais: a classificação desempata por termo mais
   *  longo, de propósito, para a ordem da lista não virar uma regra
   *  escondida (ver `modalidadeDoTexto`). */
  function moverModalidade(id, delta) {
    setCatalogo((c) => {
      const lista = normalizarCatalogo(c);
      const i = lista.findIndex((m) => m.id === id);
      const j = i + delta;
      // a residual fica sempre no fim: nem ela se move, nem outra passa por ela
      if (i < 0 || j < 0 || j >= lista.length - 1 || lista[i].residual) return lista;
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
  }

  const restaurarCatalogo = () => setCatalogo(CATALOGO_PADRAO);

  const catalogoValido = useMemo(() => normalizarCatalogo(catalogo), [catalogo]);
  const quantos = useMemo(() => quantosRotulos(rotulos), [rotulos]);

  const sessao = {
    dados: { rotulos, catalogoModalidades: catalogoValido },
    vazio: false, // quem decide se a sessão vale é a fonte, não os nomes
    restaurar: (s) => {
      setRotulos(normalizarRotulos(s.rotulos));
      setCatalogo(normalizarCatalogo(s.catalogoModalidades?.length ? s.catalogoModalidades : CATALOGO_PADRAO));
    },
    limpar: () => { setRotulos(ROTULOS_VAZIOS); setCatalogo(CATALOGO_PADRAO); },
  };

  /** Apelidos e catálogo viajam no perfil como qualquer outra decisão —
   *  é o que transforma renomear 200 contas num ativo em vez de um
   *  trabalho a refazer todo mês. */
  function aplicarPerfil(perfil) {
    if (perfil.catalogoModalidades?.length) setCatalogo(normalizarCatalogo(perfil.catalogoModalidades));
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
    rotulos, catalogo: catalogoValido, quantosRotulos: quantos,
    renomear, restaurarNomes,
    adicionarModalidade, renomearModalidade, definirTermos, removerModalidade,
    moverModalidade, restaurarCatalogo,
    aplicarPerfil, sessao,
  };
}
