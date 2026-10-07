"use client";

import { useEffect, useState } from "react";

type Sessao = {
  id: string;
  inicio: string;
  fim: string | null;
  ultimaAtividade: string | null;
  status: "EM_ANDAMENTO" | "ENCERRADA";
  createdAt: string;
};

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }

  return new Date(data).toLocaleString("pt-BR");
}

export default function SessoesPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarSessoes() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch("/api/sessoes");

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar as sessões.");
      }

      const dados = await resposta.json();

      setSessoes(dados);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as sessões."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarSessoes();
  }, []);

  async function criarSessao() {
    try {
      setCriando(true);
      setErro("");

      const resposta = await fetch("/api/sessoes", {
        method: "POST",
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível criar a sessão."
        );
      }

      await carregarSessoes();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a sessão."
      );
    } finally {
      setCriando(false);
    }
  }

  async function encerrarSessao(id: string) {
    try {
      setErro("");

      const resposta = await fetch(`/api/sessoes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "encerrar",
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível encerrar a sessão."
        );
      }

      await carregarSessoes();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão."
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sessões de monitoramento
            </h1>

            <p className="text-sm text-gray-600">
              Acompanhe os períodos de monitoramento realizados.
            </p>
          </div>

          <button
            type="button"
            onClick={criarSessao}
            disabled={criando}
            className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {criando ? "Criando..." : "+ Nova"}
          </button>
        </div>

        {erro && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="rounded-lg bg-white shadow">
          {carregando ? (
            <div className="p-5 text-sm text-gray-600">
              Carregando sessões...
            </div>
          ) : sessoes.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">
              Nenhuma sessão foi criada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
                    <th className="px-5 py-3">Início</th>
                    <th className="px-5 py-3">Última atividade</th>
                    <th className="px-5 py-3">Situação</th>
                    <th className="px-5 py-3">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {sessoes.map((sessao) => (
                    <tr
                      key={sessao.id}
                      className="border-b border-gray-100 last:border-0 text-black"
                    >
                      <td className="px-5 py-4">
                        {formatarData(sessao.inicio)}
                      </td>

                      <td className="px-5 py-4">
                        {formatarData(sessao.ultimaAtividade)}
                      </td>

                      <td className="px-5 py-4">
                        {sessao.status === "EM_ANDAMENTO" ? (
                          <span className="text-green-600">
                            Em andamento
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            Encerrada
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <a
                            href={`/sessoes/${sessao.id}`}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Abrir
                          </a>

                          {sessao.status === "EM_ANDAMENTO" ? (
                            <button
                              type="button"
                              onClick={() => encerrarSessao(sessao.id)}
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              Encerrar
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}