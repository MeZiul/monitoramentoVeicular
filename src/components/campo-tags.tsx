"use client";

import { KeyboardEvent, useMemo, useState } from "react";

type Status = {
  id: string;
  nome: string;
  ativo: boolean;
};

type CampoTagsProps = {
  statusDisponiveis: Status[];
  valores: string[];
  onChange: (valores: string[]) => void;
  onEnter?: (textoAtual: string) => void;
};

export default function CampoTags({
  statusDisponiveis,
  valores,
  onChange,
  onEnter,
}: CampoTagsProps) {
  const [texto, setTexto] = useState("");
  const [focado, setFocado] = useState(false);

  const sugestoes = useMemo(() => {
    const busca = texto.trim().toUpperCase();

    if (!busca) {
      return statusDisponiveis;
    }

    return statusDisponiveis.filter((status) =>
      status.nome.includes(busca)
    );
  }, [texto, statusDisponiveis]);

  function adicionarTag(valor: string) {
    const tag = valor.trim().toUpperCase();

    if (!tag) {
      return;
    }

    if (!valores.includes(tag)) {
      onChange([...valores, tag]);
    }

    setTexto("");
  }

  function removerTag(tag: string) {
    onChange(valores.filter((valor) => valor !== tag));
  }

  function alterarTexto(valor: string) {
    if (valor.includes(";")) {
      const partes = valor.split(";");

      const completas = partes.slice(0, -1);
      const restante = partes[partes.length - 1];

      completas.forEach((parte) => {
        adicionarTag(parte);
      });

      setTexto(restante);

      return;
    }

    setTexto(valor);
  }

  function tratarTecla(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();

      onEnter?.(texto);
    }

    if (
      event.key === "Backspace" &&
      !texto &&
      valores.length > 0
    ) {
      removerTag(valores[valores.length - 1]);
    }
  }

  return (
    <div className="relative flex-1">
      <div
        className={`flex min-h-10 flex-wrap items-center gap-1 rounded-md border px-2 py-1 transition-colors ${
          focado
            ? "border-blue-500 bg-white ring-1 ring-blue-500"
            : "border-gray-300 bg-gray-100"
        }`}
      >
        {valores.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-sm text-gray-800"
          >
            {tag}

            <button
              type="button"
              onClick={() => removerTag(tag)}
              className="font-medium text-gray-500 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}

        <input
          type="text"
          value={texto}
          onChange={(event) => alterarTexto(event.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => {
            setTimeout(() => setFocado(false), 150);
          }}
          onKeyDown={tratarTecla}
          placeholder={
            valores.length === 0
              ? "Digite os status..."
              : "Adicionar..."
          }
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none text-gray-600"
        />
      </div>

      {focado && sugestoes.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
          {sugestoes.map((status) => (
            <button
              key={status.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                adicionarTag(status.nome);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-black"
            >
              {status.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}