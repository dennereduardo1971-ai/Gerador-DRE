import { useState } from "react";
import { GRUPOS } from "../lib/grupos.js";
import { CATEGORIAS } from "../lib/cpc51.js";
import { LINHAS_ESTRUTURAIS } from "../lib/linhasDRE.js";
import { LINHAS_ESTRUTURAIS_51 } from "../lib/linhasCPC51.js";
import { RESIDUAL, faixasVisiveis } from "../lib/modalidade.js";
import { nomeDaCategoria51, nomeDoGrupo, rotuloDaLinha } from "../lib/rotulos.js";

/* ONDE SE MUDA O NOME DE TUDO — menos o das contas, que se muda na linha
 * da própria conta, logo abaixo (é lá que se sabe de qual conta se fala).
 *
 * POR QUE AQUI, NO DE-PARA, E NÃO NA DRE: a DRE é a tela que se imprime e
 * se assina. Campo de texto no meio dela convida a editar enquanto se
 * confere, e um clique errado vira um rótulo trocado num documento que
 * saiu para fora. O De-Para já é a tela de cadastro — é onde se responde
 * "para onde vai" e, agora, "como isso se chama".
 *
 * O QUE ESTE PAINEL NÃO FAZ: mexer em valor. Nenhum campo aqui muda
 * número — o número vem do balancete e não se digita. É a fronteira que
 * separa apelidar uma linha de inventar uma demonstração.
 */

/** Um campo de nome com o padrão à mostra. O `placeholder` é sempre o
 *  nome original: é assim que se sabe o que se está substituindo e que
 *  apagar o campo devolve o de fábrica. */
function CampoNome({ id, rotulo, padrao, valor, onChange }) {
  return (
    <label className="ed-campo">
      <span className="ed-padrao">{rotulo ?? padrao}</span>
      <input
        type="text"
        value={valor}
        placeholder={padrao}
        aria-label={`Nome para "${padrao}"`}
        onChange={(e) => onChange(id, e.target.value)}
      />
    </label>
  );
}

export function EditorNomes({ catalogo, rotulos, editor }) {
  const [nova, setNova] = useState("");

  /* A LISTA QUE SE EDITA É A CRUA (`catalogoEdicao`), não a normalizada:
     é ela que guarda a vírgula recém-teclada e o campo de nome vazio que
     está prestes a ser reescrito. A normalizada é a que o app consome. */
  const lista = faixasVisiveis(editor.catalogoEdicao || catalogo);
  const padroes = faixasVisiveis(catalogo);

  const renomear = (eixo) => (chave, valor) => editor.renomear(eixo, chave, valor);

  function acrescentar(e) {
    e.preventDefault();
    const nome = nova.trim();
    if (!nome) return;
    editor.adicionarModalidade(nome);
    setNova("");
  }

  return (
    <div className="card">
      <h2>Nomes</h2>
      <p className="hint">
        Tudo que aparece escrito na DRE, no CPC 51 e nos arquivos exportados pode ser
        renomeado aqui. Campo vazio volta ao nome original. <b>Valor não se edita</b> — ele
        vem do balancete.
        {editor.quantosRotulos > 0 && <> Hoje há <b>{editor.quantosRotulos}</b> nome(s) trocado(s).</>}
      </p>

      <details className="explica" open>
        <summary>Modalidades — as faixas dentro de cada tópico</summary>
        <p className="hint">
          Cada faixa tem um nome e os <b>termos</b> que a identificam no nome da conta do
          plano (separados por vírgula). Quem decide a faixa é o nome no plano de contas,
          não a ordem desta lista.
        </p>
        <div className="ed-lista">
          {lista.map((m, i) => (
            <div className="ed-modalidade" key={m.id}>
              <input
                type="text"
                className="ed-nome"
                value={m.nome}
                placeholder={m.id}
                aria-label={`Nome da modalidade ${m.nome || m.id}`}
                onChange={(e) => editor.renomearModalidade(m.id, e.target.value)}
              />
              <input
                type="text"
                className="ed-termos"
                value={m.termos.join(",")}
                placeholder="termos no plano de contas"
                aria-label={`Termos que identificam ${m.nome || m.id}`}
                onChange={(e) => editor.definirTermos(m.id, e.target.value)}
              />
              <div className="ed-acoes">
                <button className="btn ghost" type="button" disabled={i === 0}
                  aria-label={`Subir ${m.nome}`} onClick={() => editor.moverModalidade(m.id, -1)}>↑</button>
                <button className="btn ghost" type="button" disabled={i >= lista.length - 1}
                  aria-label={`Descer ${m.nome}`} onClick={() => editor.moverModalidade(m.id, 1)}>↓</button>
                <button className="btn ghost" type="button" disabled={lista.length <= 1}
                  aria-label={`Remover ${m.nome}`} onClick={() => editor.removerModalidade(m.id)}>Remover</button>
              </div>
            </div>
          ))}
        </div>
        <form className="row" onSubmit={acrescentar}>
          <input
            type="text"
            value={nova}
            placeholder="Nova modalidade (ex.: Técnico)"
            aria-label="Nome da modalidade nova"
            onChange={(e) => setNova(e.target.value)}
          />
          <button className="btn" type="submit">Acrescentar</button>
          <button className="btn ghost" type="button" onClick={editor.restaurarCatalogo}>
            Voltar às modalidades padrão
          </button>
        </form>

        {/* AS DUAS PERGUNTAS QUE COMPLETAM A REGRA. Elas ficam aqui, e
            não escondidas num padrão do código, porque a resposta muda
            de instituição para instituição — e porque a versão anterior,
            que dividia tudo e jogava o não identificado numa faixa
            "Comum", enchia a demonstração de faixa que ninguém queria
            ler. */}
        <h3 className="ed-sub">Quem se divide</h3>
        <div className="ed-regra">
          <label className="ed-campo">
            <span className="ed-padrao">Dividir só as contas que começam com</span>
            <input
              type="text"
              value={editor.alcanceTexto}
              placeholder="3"
              aria-label="Códigos de conta que se dividem em modalidades"
              onChange={(e) => editor.definirAlcance(e.target.value)}
            />
          </label>
          <label className="ed-campo">
            <span className="ed-padrao">Conta desse alcance sem modalidade no plano entra em</span>
            <select
              value={editor.faixaPadrao}
              aria-label="Faixa que recebe a conta não identificada"
              onChange={(e) => editor.definirFaixaPadrao(e.target.value)}
            >
              {padroes.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              <option value={RESIDUAL}>Nenhuma — deixar fora da divisão</option>
            </select>
          </label>
        </div>
        <p className="hint">
          Separe vários por vírgula; em branco divide todas as contas de resultado. Conta
          fora do alcance não entra em faixa nenhuma — o tópico dela continua sendo uma
          linha só, como antes. Um tópico também não se abre quando todas as contas dele
          caem na mesma faixa: a faixa sozinha repetiria o valor da linha de cima.
        </p>
      </details>

      <details className="explica">
        <summary>Linhas da DRE</summary>
        <p className="hint">
          O nome do grupo vale ao mesmo tempo na demonstração, na coluna "Grupo na DRE"
          abaixo e nos arquivos exportados. Os sinais <code>( + )</code> e <code>( – ) </code>
          não se editam: eles dizem o que a linha faz na conta, não como ela se chama.
        </p>
        <div className="ed-grade">
          {GRUPOS.filter((g) => g.id !== "IGNORAR").map((g) => (
            <CampoNome key={g.id} id={g.id} padrao={g.nome}
              rotulo={nomeDoGrupo(g.id, rotulos)}
              valor={rotulos?.grupos?.[g.id] || ""} onChange={renomear("grupos")} />
          ))}
        </div>
        <h3 className="ed-sub">Seções e subtotais</h3>
        <div className="ed-grade">
          {LINHAS_ESTRUTURAIS.map((l) => (
            <CampoNome key={l.id} id={l.id} padrao={l.padrao}
              rotulo={rotuloDaLinha(l.id, l.padrao, rotulos)}
              valor={rotulos?.linhas?.[l.id] || ""} onChange={renomear("linhas")} />
          ))}
        </div>
      </details>

      <details className="explica">
        <summary>CPC 51 — categorias e subtotais</summary>
        <p className="hint">
          Estes nomes vêm da norma, e a auditoria procura por eles. Dá para mudar — quem
          assina decide —, mas pense duas vezes antes de trocar "Resultado Operacional" e
          "Resultado antes do financiamento e dos tributos sobre o lucro", que são os dois
          subtotais obrigatórios.
        </p>
        <div className="ed-grade">
          {CATEGORIAS.map((c) => (
            <CampoNome key={c.id} id={c.id} padrao={c.nome}
              rotulo={nomeDaCategoria51(c.id, rotulos)}
              valor={rotulos?.categorias51?.[c.id] || ""} onChange={renomear("categorias51")} />
          ))}
          {LINHAS_ESTRUTURAIS_51.map((l) => (
            <CampoNome key={l.id} id={l.id} padrao={l.padrao}
              rotulo={rotuloDaLinha(l.id, l.padrao, rotulos)}
              valor={rotulos?.linhas?.[l.id] || ""} onChange={renomear("linhas")} />
          ))}
        </div>
      </details>

      <div className="row">
        {/* O download fica AQUI, e não só na etapa Classificar: quem
            acabou de renomear cinquenta contas está nesta tela, e o
            arquivo é o único jeito de esse trabalho sobreviver ao
            próximo balancete. */}
        <button className="btn" type="button" onClick={editor.onSalvarPerfil}
          disabled={!editor.decisoes}>
          Baixar perfil{editor.decisoes ? ` (${editor.decisoes} decisões)` : ""}
        </button>
        <button className="btn ghost" type="button" onClick={editor.restaurarNomes}>
          Voltar todos os nomes ao padrão
        </button>
      </div>
      <p className="hint">
        O perfil é um arquivo JSON com os nomes, o catálogo de modalidades e as decisões de
        classificação — <b>sem nenhum valor dentro</b>. É ele que leva este trabalho para o
        mês que vem, para outro computador ou para outra pessoa. O mesmo arquivo se carrega
        de volta na etapa <b>Classificar</b>.
      </p>
    </div>
  );
}
