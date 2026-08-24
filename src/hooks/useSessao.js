import { useEffect, useState } from "react";
import { lerSessao, limparSessao, salvarSessao } from "../lib/sessao.js";

/* A sessão inteira em IndexedDB, orquestrada em um lugar só.
 *
 * Cada hook de domínio (`useFontes`, `useClassificacao`, `useCPC51`)
 * devolve uma "parte": o que ele quer gravar, como se restaurar e como se
 * zerar. Este hook só junta as partes — assim, um assunto novo (a
 * apuração fiscal, por exemplo) entra sem que ninguém precise lembrar de
 * mexer aqui e em mais três lugares.
 *
 * DUAS SUTILEZAS QUE NÃO DEVEM SER DESFEITAS:
 *
 * 1. A gravação só começa depois que a restauração termina
 *    (`carregada`). Sem essa trava, o estado vazio do primeiro render
 *    sobrescreve a sessão salva e o usuário perde tudo justamente ao
 *    abrir o app.
 *
 * 2. O efeito de gravar NÃO tem lista de dependências. Isso é
 *    deliberado: ele roda a cada render e reagenda o mesmo timeout de
 *    800 ms, então a gravação acontece 800 ms depois que os renders
 *    param — que é a semântica de "respiro" que se queria. A versão
 *    anterior listava dezessete dependências à mão, e a armadilha era
 *    óbvia em retrospecto: acrescentar um estado novo e esquecer de
 *    listá-lo produzia um campo que nunca era salvo, sem erro nenhum.
 */
export function useSessao(partes) {
  const [carregada, setCarregada] = useState(false);

  useEffect(() => {
    let vivo = true;
    lerSessao().then((s) => {
      if (!vivo) return;
      if (s) partes.forEach((p) => p.restaurar(s));
      setCarregada(true);
    });
    return () => { vivo = false; };
    // Uma vez só, na montagem: `partes` muda de identidade a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vazio = partes.every((p) => p.vazio);

  useEffect(() => {
    if (!carregada || vazio) return;
    const dados = Object.assign({}, ...partes.map((p) => p.dados));
    const t = setTimeout(() => { salvarSessao(dados); }, 800);
    return () => clearTimeout(t);
  });

  async function limpar() {
    await limparSessao();
    partes.forEach((p) => p.limpar());
  }

  return { carregada, limpar };
}
