"use client";

import { FormEvent, useEffect, useState } from "react";

type Veiculo = {
  id: string;
  placa: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [placa, setPlaca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarVeiculos() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch("/api/veiculos");

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar os veículos.");
      }

      const dados = await resposta.json();

      setVeiculos(dados);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os veículos."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarVeiculos();
  }, []);

  async function cadastrarVeiculo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!placa.trim()) {
      setErro("Informe a placa do veículo.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const resposta = await fetch("/api/veiculos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placa,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível cadastrar o veículo.");
      }

      setPlaca("");

      await carregarVeiculos();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o veículo."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(veiculo: Veiculo) {
    try {
      setErro("");

      const resposta = await fetch(`/api/veiculos/${veiculo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo: !veiculo.ativo,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível alterar o status do veículo."
        );
      }

      setVeiculos((veiculosAtuais) =>
        veiculosAtuais.map((item) =>
          item.id === veiculo.id ? dados : item
        )
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do veículo."
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Veículos
          </h1>

          <p className="text-sm text-gray-600">
            Cadastro e gerenciamento das placas monitoradas.
          </p>
        </div>

        <section className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold text-black">
            Cadastrar veículo
          </h2>

          <form
            onSubmit={cadastrarVeiculo}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={placa}
              onChange={(event) => setPlaca(event.target.value)}
              placeholder="Digite a placa"
              maxLength={8}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 uppercase outline-none focus:border-blue-500 text-black"
            />

            <button
              type="submit"
              disabled={salvando}
              className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? "Cadastrando..." : "Cadastrar"}
            </button>
          </form>
        </section>

        {erro && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-black">
              Veículos cadastrados
            </h2>
          </div>

          {carregando ? (
            <div className="p-5 text-sm text-gray-600">
              Carregando veículos...
            </div>
          ) : veiculos.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">
              Nenhum veículo cadastrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
                    <th className="px-5 py-3">Placa</th>
                    <th className="px-5 py-3">Situação</th>
                    <th className="px-5 py-3">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {veiculos.map((veiculo) => (
                    <tr
                      key={veiculo.id}
                      className="border-b border-gray-100 last:border-0 text-black"
                    >
                      <td className="px-5 py-4 font-medium">
                        {veiculo.placa}
                      </td>

                      <td className="px-5 py-4">
                        {veiculo.ativo ? (
                          <span className="text-green-600">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            Inativo
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => alterarStatus(veiculo)}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {veiculo.ativo ? "Desativar" : "Ativar"}
                        </button>
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