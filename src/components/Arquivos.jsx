import { useEffect, useRef, useState } from "react";
import { lerConfigGitHub, listarPasta, enviarArquivo, excluirArquivo } from "../lib/githubApi.js";

/* Galeria de arquivos — imagens e outros documentos do projeto, guardados
 * no mesmo repositório e pelo mesmo caminho de autenticação que já
 * sincroniza o histórico de DREs.
 *
 * Decisão deliberada: reaproveitar `lerConfigGitHub`/`salvarConfigGitHub`
 * em vez de criar uma segunda credencial. É o mesmo repositório, e pedir
 * um token novo só para arquivos criaria dois lugares de configuração
 * fazendo a mesma coisa.
 *
 * O AVISO DE REPOSITÓRIO PÚBLICO não é rodapé — é a primeira coisa da
 * tela, antes de qualquer envio. Um projeto publicado no GitHub Pages
 * quase sempre tem repositório público, e todo arquivo enviado aqui fica
 * acessível a qualquer pessoa, sem login, para sempre (mesmo apagado
 * depois, sobrevive no histórico do Git). Isso é especialmente relevante
 * porque a imagem do painel carrega valores financeiros reais.
 */

const PASTA = "data/arquivos";
const EXT_IMAGEM = /\.(png|jpe?g|gif|webp|svg)$/i;

function formatarBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function Arquivos() {
  const [cfg] = useState(() => lerConfigGitHub());
  const [arquivos, setArquivos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [cienteAviso, setCienteAviso] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const configurado = Boolean(cfg?.owner && cfg?.repo && cfg?.token);

  async function carregar() {
    if (!configurado) return;
    setCarregando(true);
    setErro("");
    try {
      const lista = await listarPasta(cfg, PASTA);
      setArquivos(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (e) {
      setErro(e.message || "Não consegui listar os arquivos.");
    }
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [configurado]); // eslint-disable-line

  async function enviar(files) {
    if (!files?.length) return;
    setEnviando(true);
    setErro("");
    try {
      for (const file of files) {
        // 1 MB é o teto prático da API de Conteúdo em base64 num único
        // request; acima disso a API do GitHub exige o fluxo de blobs
        // (Git Data API), que este app não implementa por não ser
        // necessário para os arquivos que ele mesmo gera.
        if (file.size > 1024 * 1024) {
          setErro(`"${file.name}" tem ${formatarBytes(file.size)} — o limite aqui é 1 MB por arquivo.`);
          continue;
        }
        await enviarArquivo(cfg, `${PASTA}/${file.name}`, file, `Adiciona ${file.name}`);
      }
      await carregar();
    } catch (e) {
      setErro(e.message || "Não consegui enviar o arquivo.");
    }
    setEnviando(false);
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir "${item.nome}" do repositório? Isso não pode ser desfeito pela interface (mas o arquivo continua no histórico do Git).`)) return;
    setErro("");
    try {
      await excluirArquivo(cfg, item.caminho, item.sha, `Remove ${item.nome}`);
      await carregar();
    } catch (e) {
      setErro(e.message || "Não consegui excluir o arquivo.");
    }
  }

  if (!configurado) {
    return (
      <div className="empty">
        <b>Configure a sincronização com o GitHub primeiro</b>
        A galeria de arquivos usa a mesma conexão da aba Histórico. Abra o Histórico, configure
        usuário, repositório e token, e volte aqui.
      </div>
    );
  }

  if (!cienteAviso) {
    return (
      <div className="card">
        <h2>Arquivos do projeto</h2>
        <div className="warn">
          <b>Este repositório é público.</b> Qualquer arquivo enviado aqui fica acessível a
          qualquer pessoa pela internet, sem login — e continua acessível pelo histórico do Git
          mesmo depois de excluído pela interface. Isso vale para imagens do painel, que trazem
          valores financeiros reais da instituição. Só envie o que pode ser público, do mesmo
          jeito que já vale para o histórico de DREs sincronizado hoje.
        </div>
        <button className="btn" onClick={() => setCienteAviso(true)}>Entendi, continuar</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="bal-cab">
        <div>
          <h2>Arquivos do projeto</h2>
          <p className="hint" style={{ margin: 0 }}>
            Guardados em <code>{PASTA}/</code> no repositório — acessíveis de qualquer
            computador que abra este link, não só de onde foram enviados.
          </p>
        </div>
        <button className="btn ghost" onClick={carregar} disabled={carregando}>
          {carregando ? "Atualizando…" : "Atualizar lista"}
        </button>
      </div>

      <div
        className="drop compacto" role="button" tabIndex={0}
        data-over={over ? "1" : "0"}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); enviar([...e.dataTransfer.files]); }}
      >
        <b>{enviando ? "Enviando…" : "Solte arquivos aqui ou clique para escolher"}</b>
        <span>Imagens, PDFs, planilhas — até 1 MB cada</span>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { enviar([...e.target.files]); e.target.value = ""; }} />
      </div>

      {erro && <div className="err" style={{ marginTop: 12 }}>{erro}</div>}

      {arquivos.length === 0 && !carregando ? (
        <p className="hint" style={{ marginTop: 16 }}>Nenhum arquivo enviado ainda.</p>
      ) : (
        <div className="galeria">
          {arquivos.map((a) => (
            <div className="galeria-item" key={a.caminho}>
              {EXT_IMAGEM.test(a.nome) ? (
                <a href={a.url} target="_blank" rel="noreferrer" className="galeria-imagem">
                  <img src={a.url} alt={a.nome} loading="lazy" />
                </a>
              ) : (
                <a href={a.url} target="_blank" rel="noreferrer" className="galeria-arquivo">
                  <span className="galeria-ext">{a.nome.split(".").pop()?.toUpperCase() || "?"}</span>
                </a>
              )}
              <div className="galeria-legenda">
                <span title={a.nome}>{a.nome}</span>
                <span className="galeria-tam">{formatarBytes(a.tamanho)}</span>
              </div>
              <button className="btn ghost" onClick={() => excluir(a)}>Excluir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Envia um Blob diretamente (usado pelo botão "Salvar no GitHub" do
 *  painel) sem passar pela UI de arquivos — devolve { ok, erro }. */
export async function enviarBlobParaGaleria(nomeArquivo, blob) {
  const cfg = lerConfigGitHub();
  if (!cfg?.owner || !cfg?.repo || !cfg?.token) {
    return { ok: false, erro: "Configure a sincronização com o GitHub na aba Histórico primeiro." };
  }
  if (blob.size > 1024 * 1024) {
    return { ok: false, erro: `A imagem tem ${formatarBytes(blob.size)} — o limite é 1 MB.` };
  }
  try {
    await enviarArquivo(cfg, `${PASTA}/${nomeArquivo}`, blob, `Adiciona ${nomeArquivo}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message || "Não consegui enviar." };
  }
}
