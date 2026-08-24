/* Persistência da sessão de trabalho.
 *
 * Antes, um F5 apagava tudo: arquivo importado, classificações manuais,
 * empresa e CNPJ. Era a maior fonte de atrito do uso diário.
 *
 * Vai para o IndexedDB e não para localStorage porque localStorage é
 * síncrono, limitado a poucos MB e bloqueia a thread — e os balancetes
 * carregados (vários meses, milhares de contas cada) não cabem lá. Nada
 * é enviado para lugar nenhum: continua tudo no navegador do usuário.
 *
 * Cuidado deliberado: isto grava dados financeiros reais no disco da
 * máquina. Em PC de empresa isso é sensível, então `limparSessao()` é
 * exposto na interface como um botão de verdade, não escondido. */

const BANCO = "gerador-dre";
const LOJA = "sessao";
const CHAVE = "atual";
/* Versão 2: a sessão passou a guardar `balancetes` (uma lista, com o
   período de cada um) no lugar de `linhas`/`map`/`abertura`, que eram do
   razão contábil. Sessão versão 1 é DESCARTADA na leitura em vez de
   migrada: o que ela guarda de mais caro é o razão, que este app não lê
   mais, e tentar reaproveitar o pedaço do balancete de dentro dela
   traria de volta um formato que já não existe. O usuário reimporta um
   arquivo; ninguém fica com estado meio convertido. */
const VERSAO_FORMATO = 2;

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
    // Sessão sem nenhum balancete não tem o que restaurar.
    if (!Array.isArray(dados.balancetes) || !dados.balancetes.length) return null;
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
