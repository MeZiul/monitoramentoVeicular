"use client";

import { useEffect, useState } from "react";
import CampoTags from "@/components/campo-tags";

type Veiculo = {
  id: string;
  placa: string;
  ativo: boolean;
};

type Status = {
  id: string;
  nome: string;
  ativo: boolean;
};

type AvaliacaoStatus = {
  status: Status;
};

type Avaliacao = {
  id: string;
  veiculoId: string;
  inicio: string;
  fim: string | null;
  observacao: string | null;
  status: AvaliacaoStatus[];
};

type Sessao = {
  id: string;
  inicio: string;
  fim: string | null;
  ultimaAtividade: string | null;
  status: "EM_ANDAMENTO" | "ENCERRADA";
  avaliacoes: Avaliacao[];
};

function formatarData(data: string | null) {
  if (!data) {
    return "-";
  }

  return new Date(data).toLocaleString("pt-BR");
}

function obterUltimasAvaliacoes(avaliacoes: Avaliacao[]) {
  const ultimas: Record<string, Avaliacao> = {};

  for (const avaliacao of avaliacoes) {
    if (!ultimas[avaliacao.veiculoId]) {
      ultimas[avaliacao.veiculoId] = avaliacao;
    }
  }

  return ultimas;
}

function extrairNomesStatus(status: AvaliacaoStatus[]) {
  return status.map((item) => item.status.nome);
}

export default function SessaoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [statusDisponiveis, setStatusDisponiveis] = useState<Status[]>([]);
  const [statusSelecionados, setStatusSelecionados] = useState<
    Record<string, string[]>
  >({});
  const [avaliacoesAtuais, setAvaliacoesAtuais] = useState<
    Record<string, string>
  >({});
  const [alteracoesPendentes, setAlteracoesPendentes] = useState<
    Record<string, boolean>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState("");

  const voltarParaSessoes = () => {
    window.location.href = "/sessoes";
  };

  const adicionarVeiculo = () => {
    window.location.href = "/veiculos";
  };

  const encerrarSessao = async () => {
    if (!sessao) {
      return;
    }

    const confirmar = window.confirm(
      "Deseja realmente encerrar esta sessão?"
    );

    if (!confirmar) {
      return;
    }

    try {
      setErro("");

      const resposta = await fetch(`/api/sessoes/${sessao.id}`, {
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

      setSessao((sessaoAtual) => {
        if (!sessaoAtual) {
          return sessaoAtual;
        }

        return {
          ...sessaoAtual,
          fim: dados.fim,
          ultimaAtividade: dados.ultimaAtividade,
          status: dados.status,
        };
      });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão."
      );
    }
  };

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const { id } = await params;

        const [respostaSessao, respostaVeiculos, respostaStatus] =
          await Promise.all([
            fetch(`/api/sessoes/${id}`),
            fetch("/api/veiculos"),
            fetch("/api/status"),
          ]);

        if (!respostaSessao.ok) {
          throw new Error("Não foi possível carregar a sessão.");
        }

        if (!respostaVeiculos.ok) {
          throw new Error("Não foi possível carregar os veículos.");
        }

        if (!respostaStatus.ok) {
          throw new Error("Não foi possível carregar os status.");
        }

        const dadosSessao = await respostaSessao.json();
        const dadosVeiculos = await respostaVeiculos.json();
        const dadosStatus = await respostaStatus.json();

        if (cancelado) {
          return;
        }

        setSessao(dadosSessao);
        setVeiculos(dadosVeiculos.filter((veiculo: Veiculo) => veiculo.ativo));
        setStatusDisponiveis(
          dadosStatus.filter((status: Status) => status.ativo)
        );

        const ultimasAvaliacoes = obterUltimasAvaliacoes(
          dadosSessao.avaliacoes
        );

        const idsAvaliacoes: Record<string, string> = {};
        const tagsIniciais: Record<string, string[]> = {};

        for (const avaliacao of Object.values(ultimasAvaliacoes)) {
          idsAvaliacoes[avaliacao.veiculoId] = avaliacao.id;
          tagsIniciais[avaliacao.veiculoId] = extrairNomesStatus(
            avaliacao.status
          );
        }

        setAvaliacoesAtuais(idsAvaliacoes);
        setStatusSelecionados(tagsIniciais);
      } catch (error) {
        if (cancelado) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados."
        );
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [params]);

  async function obterStatusIds(nomes: string[]): Promise<string[]> {
    const ids: string[] = [];

    for (const nome of nomes) {
      const nomeNormalizado = nome.trim().toUpperCase();

      if (!nomeNormalizado) {
        continue;
      }

      const existente = statusDisponiveis.find(
        (status) => status.nome === nomeNormalizado
      );

      if (existente) {
        ids.push(existente.id);
        continue;
      }

      const resposta = await fetch("/api/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: nomeNormalizado }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        if (resposta.status === 409) {
          const statusExistente = statusDisponiveis.find(
            (status) => status.nome === nomeNormalizado
          );

          if (statusExistente) {
            ids.push(statusExistente.id);
            continue;
          }
        }

        throw new Error(
          dados.erro ||
          `Não foi possível criar o status "${nomeNormalizado}".`
        );
      }

      ids.push(dados.id);
      setStatusDisponiveis((atuais) => [...atuais, dados]);
    }

    return ids;
  }

  async function salvarAvaliacao(veiculo: Veiculo, textoAtual = "") {
    if (!sessao) {
      return;
    }

    try {
      setEnviando((atuais) => ({
        ...atuais,
        [veiculo.id]: true,
      }));

      setErro("");

      const tagsAtuais = statusSelecionados[veiculo.id] ?? [];
      const textoComoTags = textoAtual
        .split(";")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
      const todasAsTags = [...tagsAtuais, ...textoComoTags];
      const tagsSemDuplicidade = Array.from(new Set(todasAsTags));
      const statusIds = await obterStatusIds(tagsSemDuplicidade);
      const avaliacaoId = avaliacoesAtuais[veiculo.id];

      const resposta = await fetch(
        avaliacaoId ? `/api/avaliacoes/${avaliacaoId}` : "/api/avaliacoes",
        {
          method: avaliacaoId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            avaliacaoId
              ? { statusIds }
              : {
                sessaoId: sessao.id,
                veiculoId: veiculo.id,
                statusIds,
              }
          ),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível salvar a avaliação."
        );
      }

      setSessao((sessaoAtual) => {
        if (!sessaoAtual) {
          return sessaoAtual;
        }

        const existe = sessaoAtual.avaliacoes.some(
          (avaliacao) => avaliacao.id === dados.id
        );

        if (existe) {
          return {
            ...sessaoAtual,
            avaliacoes: sessaoAtual.avaliacoes.map((avaliacao) =>
              avaliacao.id === dados.id ? dados : avaliacao
            ),
          };
        }

        return {
          ...sessaoAtual,
          avaliacoes: [dados, ...sessaoAtual.avaliacoes],
        };
      });

      setAvaliacoesAtuais((atuais) => ({
        ...atuais,
        [veiculo.id]: dados.id,
      }));

      setStatusSelecionados((atuais) => ({
        ...atuais,
        [veiculo.id]: extrairNomesStatus(dados.status),
      }));

      setAlteracoesPendentes((atuais) => ({
        ...atuais,
        [veiculo.id]: false,
      }));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a avaliação."
      );
    } finally {
      setEnviando((atuais) => ({
        ...atuais,
        [veiculo.id]: false,
      }));
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-gray-600">Carregando sessão...</p>
        </div>
      </main>
    );
  }

  if (!sessao) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {erro || "Sessão não encontrada."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={voltarParaSessoes}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Sessões
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={adicionarVeiculo}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Adicionar veículo
              </button>

              {sessao.status === "EM_ANDAMENTO" && (
                <button
                  type="button"
                  onClick={encerrarSessao}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Encerrar sessão
                </button>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Sessão de monitoramento
          </h1>

          <p className="text-sm text-gray-600">
            Início: {formatarData(sessao.inicio)}
          </p>

          <p className="text-sm text-gray-600">
            Situação:{" "}
            {sessao.status === "EM_ANDAMENTO" ? (
              <span className="font-medium text-green-600">
                Em andamento
              </span>
            ) : (
              <span className="font-medium text-gray-500">
                Encerrada
              </span>
            )}
          </p>
        </div>

        {erro && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Veículos monitorados
            </h2>

            <p className="text-sm text-gray-500">
              Digite os status separados por ponto e vírgula.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {veiculos.map((veiculo) => {
              const jaFoiAvaliado = Boolean(avaliacoesAtuais[veiculo.id]);
              const pendente = alteracoesPendentes[veiculo.id] ?? false;
              const selecionados = statusSelecionados[veiculo.id] ?? [];
              const estaEnviando = enviando[veiculo.id] ?? false;

              return (
                <div
                  key={veiculo.id}
                  className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center ${sessao.status === "ENCERRADA"
                      ? "bg-gray-100"
                      : pendente
                        ? "bg-yellow-50"
                        : jaFoiAvaliado
                          ? "bg-green-50"
                          : "bg-gray-100"
                    }`}
                >
                  <div className="w-28 shrink-0 font-semibold text-gray-900">
                    {veiculo.placa}
                  </div>

                  <CampoTags
                    statusDisponiveis={statusDisponiveis}
                    valores={selecionados}
                    onChange={(valores) => {
                      if (sessao.status === "ENCERRADA") {
                        return;
                      }

                      setStatusSelecionados((atuais) => ({
                        ...atuais,
                        [veiculo.id]: valores,
                      }));

                      setAlteracoesPendentes((atuais) => ({
                        ...atuais,
                        [veiculo.id]: true,
                      }));
                    }}
                    onEnter={(textoAtual) => {
                      if (sessao.status !== "ENCERRADA") {
                        salvarAvaliacao(veiculo, textoAtual);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => salvarAvaliacao(veiculo)}
                    disabled={estaEnviando || sessao.status === "ENCERRADA"}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {estaEnviando
                      ? "Salvando..."
                      : jaFoiAvaliado
                        ? "Salvar"
                        : "Enviar"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}