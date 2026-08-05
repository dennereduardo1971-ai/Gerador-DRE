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

/* ---------------------------------------------------------------------
 * Armazenamento genérico de arquivos (imagens e outros).
 *
 * A API de Conteúdo aceita qualquer byte em base64, então o mesmo
 * mecanismo que guarda o historico.json guarda uma imagem PNG ou
 * qualquer outro arquivo — só muda a codificação: texto vira base64 via
 * TextEncoder, binário vira base64 direto dos bytes.
 *
 * ATENÇÃO — REPOSITÓRIO PÚBLICO: se o repositório for público (o padrão
 * de um projeto publicado no GitHub Pages, como este), todo arquivo
 * salvo aqui fica acessível a qualquer pessoa, sem login, e permanece no
 * histórico do Git mesmo depois de apagado da pasta. Isso já vale para o
 * historico.json (que guarda totais de DRE reais). A interface que usa
 * estas funções deve deixar isso claro ANTES do envio, não depois.
 * ------------------------------------------------------------------- */

function bytesToBase64(bytes) {
  // btoa não aceita array grande de uma vez em alguns motores; processa
  // em blocos para não estourar o limite de argumentos de uma chamada.
  const BLOCO = 0x8000;
  let binario = "";
  for (let i = 0; i < bytes.length; i += BLOCO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + BLOCO));
  }
  return btoa(binario);
}

async function blobParaBase64(blob) {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

function urlListagem({ owner, repo, pasta, branch }) {
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${pasta}`;
  return branch ? `${base}?ref=${encodeURIComponent(branch)}` : base;
}

/** Lista os arquivos dentro de uma pasta do repositório.
 *  Devolve [] se a pasta ainda não existir (repositório novo, primeiro
 *  envio) — não é erro, é "vazio". */
export async function listarPasta(cfg, pasta) {
  const r = await fetch(urlListagem({ ...cfg, pasta }), { headers: cabecalhos(cfg.token) });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(await mensagemDeErro(r));
  const json = await r.json();
  // A API devolve um objeto único (não array) se o "path" apontar para um
  // arquivo em vez de uma pasta — normaliza para lista em ambos os casos.
  const itens = Array.isArray(json) ? json : [json];
  return itens
    .filter((it) => it.type === "file")
    .map((it) => ({ nome: it.name, caminho: it.path, tamanho: it.size, sha: it.sha, url: it.download_url }));
}

/** Envia (cria ou substitui) um arquivo binário. Busca o `sha` atual
 *  sozinho quando não é informado — a API do GitHub exige o sha da
 *  versão anterior para saber que não está sobrescrevendo sem querer. */
export async function enviarArquivo(cfg, caminho, blob, mensagem, shaConhecido) {
  let sha = shaConhecido;
  if (sha === undefined) {
    const r0 = await fetch(urlConteudo({ ...cfg, caminho }), { headers: cabecalhos(cfg.token) });
    if (r0.ok) sha = (await r0.json()).sha;
    else if (r0.status !== 404) throw new Error(await mensagemDeErro(r0));
  }
  const body = {
    message: mensagem || `Adiciona ${caminho}`,
    content: await blobParaBase64(blob),
    branch: cfg.branch || "main",
  };
  if (sha) body.sha = sha;
  const r = await fetch(urlConteudo({ ...cfg, caminho }), {
    method: "PUT",
    headers: { ...cabecalhos(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await mensagemDeErro(r));
  const json = await r.json();
  return { sha: json.content.sha, url: json.content.download_url };
}

/** Apaga um arquivo do repositório. Precisa do `sha` atual (devolvido por
 *  `listarPasta`) pelo mesmo motivo de `enviarArquivo`. */
export async function excluirArquivo(cfg, caminho, sha, mensagem) {
  const r = await fetch(urlConteudo({ ...cfg, caminho }), {
    method: "DELETE",
    headers: { ...cabecalhos(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({ message: mensagem || `Remove ${caminho}`, sha, branch: cfg.branch || "main" }),
  });
  if (!r.ok) throw new Error(await mensagemDeErro(r));
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
