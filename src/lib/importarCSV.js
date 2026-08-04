import Papa from "papaparse";

/** Detecta o encoding espiando os primeiros bytes do arquivo — evita ter
 *  que ler o arquivo inteiro em memória só para escolher UTF-8 ou
 *  Windows-1252 (padrão de exportação da maioria dos sistemas contábeis). */
async function detectarEncoding(file) {
  const amostra = await file.slice(0, 65536).arrayBuffer();
  const txt = new TextDecoder("utf-8").decode(amostra);
  return txt.includes("\uFFFD") ? "windows-1252" : "utf-8";
}

/** Importa um CSV grande em pedaços (chunks), sem worker — o modo worker
 *  do Papaparse depende de carregar um script separado por URL, o que
 *  quebra quando o app está empacotado (Vite) e publicado num subcaminho
 *  (como GitHub Pages: /Gerador-DRE/). Processar em chunks no thread
 *  principal, cedendo o loop de eventos a cada pedaço com um pequeno
 *  await, ainda evita travar a interface — só não é 100% paralelo.
 *  Reporta progresso real (bytes lidos / tamanho do arquivo) via onProgress. */
export function importarCSV(file, onProgress) {
  return new Promise((resolve, reject) => {
    detectarEncoding(file).then((encoding) => {
      const linhas = [];
      let campos = [];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        encoding,
        chunkSize: 1024 * 1024, // 1 MB por pedaço
        chunk: (results, parser) => {
          if (!campos.length) campos = (results.meta.fields || []).filter((f) => f && f.trim());
          linhas.push(...results.data);
          if (onProgress) {
            const pct = file.size ? Math.min(99, Math.round((results.meta.cursor / file.size) * 100)) : null;
            onProgress({ linhas: linhas.length, pct });
          }
          // cede o loop de eventos entre pedaços para a barra de progresso
          // e o resto da página continuarem respondendo
          parser.pause();
          setTimeout(() => parser.resume(), 0);
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
