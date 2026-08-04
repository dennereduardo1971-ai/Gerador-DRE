import Papa from "papaparse";

/** Detecta o encoding espiando os primeiros bytes do arquivo — evita ter
 *  que ler o arquivo inteiro em memória só para escolher UTF-8 ou
 *  Windows-1252 (padrão de exportação da maioria dos sistemas contábeis). */
async function detectarEncoding(file) {
  const amostra = await file.slice(0, 65536).arrayBuffer();
  const txt = new TextDecoder("utf-8").decode(amostra);
  return txt.includes("\uFFFD") ? "windows-1252" : "utf-8";
}

/** Importa um CSV grande em streaming, sem bloquear a interface.
 *  Reporta progresso real (bytes lidos / tamanho do arquivo) via onProgress,
 *  ao contrário de ler o arquivo inteiro de uma vez e só então parsear. */
export function importarCSV(file, onProgress) {
  return new Promise((resolve, reject) => {
    detectarEncoding(file).then((encoding) => {
      const linhas = [];
      let campos = [];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: true,
        encoding,
        chunk: (results) => {
          if (!campos.length) campos = (results.meta.fields || []).filter((f) => f && f.trim());
          linhas.push(...results.data);
          if (onProgress) {
            const pct = file.size ? Math.min(99, Math.round((results.meta.cursor / file.size) * 100)) : null;
            onProgress({ linhas: linhas.length, pct });
          }
        },
        complete: () => {
          if (!campos.length) { reject(new Error("Não encontrei cabeçalho no arquivo.")); return; }
          if (onProgress) onProgress({ linhas: linhas.length, pct: 100 });
          resolve({ campos, linhas });
        },
        error: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      });
    });
  });
}
