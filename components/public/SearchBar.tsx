"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { searchActiveEmployees } from "@/services/employees";
import type { Employee } from "@/types";

export function SearchBar() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const found = await searchActiveEmployees(trimmed);
      setResults(found);
      setOpen(true);
    }, 200);
    return () => clearTimeout(handle);
  }, [term]);

  function goTo(nick: string) {
    setOpen(false);
    router.push(`/funcionario/${encodeURIComponent(nick)}`);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) goTo(results[0].nick);
        }}
        className="flex items-center gap-2 rounded border border-base-border bg-base-900 px-4 py-3 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/25"
      >
        <Search className="h-4 w-4 shrink-0 text-ink-faint" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar funcionário pelo nickname…"
          aria-label="Buscar funcionário pelo nickname"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          className="hidden shrink-0 items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-bright sm:inline-flex"
        >
          Pesquisar
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {open && term.trim() && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded border border-base-border bg-base-800 shadow-none">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-ink-faint">Nenhum funcionário ativo encontrado.</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => goTo(r.nick)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink hover:bg-base-700"
                  >
                    <span>{r.nick}</span>
                    <span className="text-xs text-ink-faint">{r.cargo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
