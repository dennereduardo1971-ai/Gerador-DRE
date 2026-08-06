/* Persistência da sessão de trabalho.
 *
 * Antes, um F5 apagava tudo: razão importado, mapeamento de colunas,
 * classificações manuais, empresa e CNPJ — depois de o usuário ter
 * esperado um minuto importando dezenas de milhares de linhas. Era a
 * maior fonte de atrito do uso diário.
 *
 * O razão inteiro não cabe em localStorage (que é síncrono, limitado a
 * poucos MB e bloqueia a thread), então vai para o IndexedDB, que é
 * assíncrono e aguenta o volume. Só o razão fica lá; nada é enviado para
 * lugar nenhum — continua tudo no navegador do usuário.
 *
 * Cuidado deliberado: isto grava dados financeiros reais no disco da
 * máquina. Em PC de empresa isso é sensível, então `limparSessao()` é
 * exposto na interface como um botão de verdade, não escondido. */

const BANCO = "gerador-dre";
const LOJA = "sessao";
const CHAVE = "atual";
const VERSAO_FORMATO = 1;

function abrir() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB indisponível")); return; }
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(LOJA)) req.result.createObjectStore(LOJA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transacao(db, modo, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOJA, modo);
    const req = fn(tx.objectStore(LOJA));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Grava a sessão inteira. Silencioso em caso de falha: perder a
 *  persistência é chato, mas não pode derrubar o app no meio do trabalho
 *  (navegação privada, cota estourada, IndexedDB bloqueado por política). */
export async function salvarSessao(estado) {
  try {
    const db = await abrir();
    await transacao(db, "readwrite", (loja) =>
      loja.put({ ...estado, versaoFormato: VERSAO_FORMATO, salvoEm: Date.now() }, CHAVE)
    );
    db.close();
    return true;
  } catch {
    return false;
  }
}

/** Devolve a sessão gravada, ou null se não houver / for de um formato
 *  antigo que este código não sabe ler. */
export async function lerSessao() {
  try {
    const db = await abrir();
    const dados = await transacao(db, "readonly", (loja) => loja.get(CHAVE));
    db.close();
    if (!dados || dados.versaoFormato !== VERSAO_FORMATO) return null;
    /* Uma sessão vale se tiver QUALQUER uma das duas fontes. Exigir razão
       aqui descartaria silenciosamente a sessão de quem trabalha só com
       balancete — que é o fluxo principal desde que o balancete passou a
       montar a DRE sozinho. */
    const temRazao = Array.isArray(dados.linhas) && dados.linhas.length > 0;
    const temBalancete = !!dados.abertura?.balancete;
    if (!temRazao && !temBalancete) return null;
    return dados;
  } catch {
    return null;
  }
}

export async function limparSessao() {
  try {
    const db = await abrir();
    await transacao(db, "readwrite", (loja) => loja.delete(CHAVE));
    db.close();
    return true;
  } catch {
    return false;
  }
}
