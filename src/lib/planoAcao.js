/* Onde mora o andamento do plano de ação do CPC 51.
 *
 * Em localStorage, e não na sessão do IndexedDB, por dois motivos:
 *
 * 1. Não é dado financeiro. O mapa guarda só "fase 2, passo 8: feito" —
 *    nenhum valor, nenhuma conta, nenhum nome de cliente. Por isso ele
 *    também NÃO é apagado pelo botão "Limpar tudo": esse botão existe
 *    para tirar movimentação financeira real do disco de um PC de
 *    empresa, e perder o andamento do projeto junto seria um efeito
 *    colateral sem contrapartida.
 * 2. O plano é do escritório, não do arquivo aberto. Ele precisa
 *    sobreviver a trocar de arquivo, de empresa e de mês — que é
 *    exatamente o que a sessão faz sumir.
 */

const CHAVE = "gerador-dre:plano-acao-cpc51";

export function lerPlanoAcao() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return {};
    const dados = JSON.parse(bruto);
    return dados && typeof dados === "object" ? dados : {};
  } catch {
    return {};
  }
}

export function salvarPlanoAcao(status) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(status || {}));
    return true;
  } catch {
    // Cota estourada ou storage bloqueado: o plano de ação é o último
    // dado que justifica derrubar a tela do usuário.
    return false;
  }
}
