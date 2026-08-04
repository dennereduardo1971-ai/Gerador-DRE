import { useEffect, useState } from "react";

const CHAVE = "gerador-dre:tema";

function temaInicial() {
  if (typeof window === "undefined") return "light";
  const salvo = window.localStorage.getItem(CHAVE);
  if (salvo === "light" || salvo === "dark") return salvo;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Tema claro/escuro persistido em localStorage, com fallback para a
 *  preferência do sistema operacional na primeira visita. */
export function useTema() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.setAttribute("data-tema", tema);
    try { window.localStorage.setItem(CHAVE, tema); } catch { /* localStorage indisponível */ }
  }, [tema]);

  return [tema, setTema];
}
