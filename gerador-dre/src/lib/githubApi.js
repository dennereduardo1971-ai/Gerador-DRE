/* Usa a API de Conteúdo do GitHub como um "banco de dados" simples:
 * lê e grava um arquivo JSON dentro do próprio repositório. Não precisa de
 * servidor — o navegador fala direto com api.github.com (que permite CORS
 * para esse tipo de chamada autenticada).
 *
 * Isso é uma solução rápida, não uma prática recomendada para produção:
 * o token fica salvo no localStorage do navegador. Para uso pessoal, tudo
 * bem — mas use um token "fine-grained", restrito só a este repositório e
 * só com permissão de "Contents" (leitura e escrita), nunca um token
 * clássico com acesso amplo à conta. */

const CHAVE_CONFIG = "gerador-dre:github-config";

export function lerConfigGitHub() {
  try {
    const raw = window.localStorage.getItem(CHAVE_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function salvarConfigGitHub(cfg) {
  try { window.localStorage.setItem(CHAVE_CONFIG, JSON.stringify(cfg)); } catch { /* indisponível */ }
}

export function limparConfigGitHub() {
  try { window.localStorage.removeItem(CHAVE_CONFIG); } catch { /* indisponível */ }
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binario = "";
  bytes.forEach((b) => { binario += String.fromCharCode(b); });
  return btoa(binario);
}

function base64ToUtf8(b64) {
  const binario = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function urlConteudo({ owner, repo, caminho, branch }) {
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${caminho}`;
  return branch ? `${base}?ref=${encodeURIComponent(branch)}` : base;
}

function cabecalhos(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Busca o conteúdo atual do arquivo no repositório.
 *  Retorna { dados, sha } — dados já parseado de JSON — ou null se o
 *  arquivo ainda não existir (repositório novo, primeiro salvamento). */
export async function buscarArquivo(cfg) {
  const r = await fetch(urlConteudo(cfg), { headers: cabecalhos(cfg.token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await mensagemDeErro(r));
  const json = await r.json();
  const texto = base64ToUtf8(json.content);
  return { dados: JSON.parse(texto), sha: json.sha };
}

/** Cria ou atualiza o arquivo no repositório com o objeto dado.
 *  Precisa do `sha` atual quando o arquivo já existe (a API do GitHub usa
 *  isso para evitar sobrescrever uma versão mais nova sem querer). */
export async function gravarArquivo(cfg, dados, sha, mensagem) {
  const body = {
    message: mensagem || "Atualiza histórico de DREs",
    content: utf8ToBase64(JSON.stringify(dados, null, 2)),
    branch: cfg.branch || "main",
  };
  if (sha) body.sha = sha;
  const r = await fetch(urlConteudo(cfg), {
    method: "PUT",
    headers: { ...cabecalhos(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await mensagemDeErro(r));
  const json = await r.json();
  return { sha: json.content.sha };
}

async function mensagemDeErro(r) {
  try {
    const j = await r.json();
    if (r.status === 401) return "Token inválido ou sem permissão nesse repositório.";
    if (r.status === 404) return "Repositório não encontrado — confira usuário/repositório e se o token tem acesso a ele.";
    if (r.status === 409) return "O arquivo mudou no GitHub entre a leitura e a gravação — tente sincronizar de novo.";
    return j.message || `Erro ${r.status} na API do GitHub.`;
  } catch {
    return `Erro ${r.status} na API do GitHub.`;
  }
}
