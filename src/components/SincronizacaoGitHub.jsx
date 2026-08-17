import { useState } from "react";
import { lerConfigGitHub, salvarConfigGitHub, limparConfigGitHub } from "../lib/githubApi.js";
import { sincronizarHistorico } from "../lib/historico.js";

function formatarData(ts) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function SincronizacaoGitHub({ onSincronizado }) {
  const [cfg, setCfg] = useState(() => lerConfigGitHub() || { owner: "", repo: "", branch: "main", caminho: "data/historico.json", token: "" });
  const [aberto, setAberto] = useState(!lerConfigGitHub());
  const [status, setStatus] = useState(null); // { tipo: "ok"|"erro", texto, quando }
  const [sincronizando, setSincronizando] = useState(false);

  const configurado = Boolean(lerConfigGitHub());

  function salvar() {
    salvarConfigGitHub(cfg);
    setStatus({ tipo: "ok", texto: "Configuração salva neste navegador." });
  }

  async function sincronizar() {
    salvarConfigGitHub(cfg);
    setSincronizando(true);
    setStatus(null);
    try {
      const r = await sincronizarHistorico();
      if (!r.ok) {
        setStatus({ tipo: "erro", texto: "Preencha usuário, repositório e token antes de sincronizar." });
      } else {
        setStatus({ tipo: "ok", texto: `Sincronizado — ${r.quantidade} registro(s) no total.`, quando: r.quando });
        onSincronizado?.();
      }
    } catch (e) {
      setStatus({ tipo: "erro", texto: e.message || "Não consegui sincronizar." });
    }
    setSincronizando(false);
  }

  function desconectar() {
    limparConfigGitHub();
    setCfg({ owner: "", repo: "", branch: "main", caminho: "data/historico.json", token: "" });
    setStatus(null);
    setAberto(true);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Sincronização com GitHub</h2>
        <button className="btn ghost" onClick={() => setAberto(!aberto)}>{aberto ? "Ocultar" : "Configurar"}</button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Guarda o histórico num JSON dentro de um repositório seu. O token fica só neste navegador.
      </p>
      <p className="hint" style={{ marginTop: -8 }}>
        Use um <b>fine-grained token</b> restrito a este repositório, com "Contents" em leitura e
        escrita — <b>nunca um token clássico</b>, que dá acesso à conta inteira.
      </p>

      {aberto && (
        <div className="filters" style={{ marginBottom: 10 }}>
          <div>
            <label>Usuário/organização</label>
            <input type="text" value={cfg.owner} placeholder="dennereduardo1971-ai"
              onChange={(e) => setCfg({ ...cfg, owner: e.target.value.trim() })} />
          </div>
          <div>
            <label>Repositório</label>
            <input type="text" value={cfg.repo} placeholder="Gerador-DRE"
              onChange={(e) => setCfg({ ...cfg, repo: e.target.value.trim() })} />
          </div>
          <div>
            <label>Branch</label>
            <input type="text" value={cfg.branch} placeholder="main"
              onChange={(e) => setCfg({ ...cfg, branch: e.target.value.trim() })} />
          </div>
          <div>
            <label>Caminho do arquivo</label>
            <input type="text" value={cfg.caminho} placeholder="data/historico.json"
              onChange={(e) => setCfg({ ...cfg, caminho: e.target.value.trim() })} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Token (fine-grained, só Contents)</label>
            <input type="text" value={cfg.token} placeholder="github_pat_..."
              onChange={(e) => setCfg({ ...cfg, token: e.target.value.trim() })} />
          </div>
        </div>
      )}

      <div className="row">
        {aberto && <button className="btn ghost" onClick={salvar}>Salvar configuração</button>}
        <button className="btn" onClick={sincronizar} disabled={sincronizando}>
          {sincronizando ? "Sincronizando…" : "Sincronizar agora"}
        </button>
        {configurado && <button className="btn ghost" onClick={desconectar}>Desconectar</button>}
      </div>

      {status && (
        <div className={status.tipo === "erro" ? "err" : "ok"} style={{ marginTop: 12, marginBottom: 0 }}>
          {status.texto}{status.quando ? ` · ${formatarData(status.quando)}` : ""}
        </div>
      )}
    </div>
  );
}
