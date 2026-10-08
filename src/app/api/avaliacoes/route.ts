
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ErroHttp = {
  codigo: number;
  mensagem: string;
};

class ErroOperacao extends Error {
  codigo: number;

  constructor(codigo: number, mensagem: string) {
    super(mensagem);
    this.codigo = codigo;
    this.name = "ErroOperacao";
  }
}

function responderErro(
  error: unknown,
  mensagemPadrao: string
) {
  if (error instanceof ErroOperacao) {
    return NextResponse.json(
      { erro: error.message },
      { status: error.codigo }
    );
  }

  console.error(mensagemPadrao, error);

  return NextResponse.json(
    { erro: mensagemPadrao },
    { status: 500 }
  );
}

// GET - Listar avaliações de uma sessão
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessaoId = searchParams.get("sessaoId")?.trim();

    if (!sessaoId) {
      return NextResponse.json(
        { erro: "O parâmetro sessaoId é obrigatório." },
        { status: 400 }
      );
    }

    const avaliacoes = await prisma.avaliacao.findMany({
      where: {
        sessaoId,
      },
      include: {
        veiculo: true,
        status: {
          include: {
            status: true,
          },
        },
      },
      orderBy: {
        inicio: "desc",
      },
    });

    return NextResponse.json(avaliacoes);
  } catch (error) {
    return responderErro(
      error,
      "Não foi possível carregar as avaliações."
    );
  }
}

// POST - Criar avaliação em uma sessão aberta
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { erro: "O corpo da requisição deve ser um JSON válido." },
      { status: 400 }
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { erro: "Formato de requisição inválido." },
      { status: 400 }
    );
  }

  const dados = body as Record<string, unknown>;

  const sessaoId =
    typeof dados.sessaoId === "string"
      ? dados.sessaoId.trim()
      : "";

  const veiculoId =
    typeof dados.veiculoId === "string"
      ? dados.veiculoId.trim()
      : "";

  if (!sessaoId || !veiculoId) {
    return NextResponse.json(
      { erro: "Sessão e veículo são obrigatórios." },
      { status: 400 }
    );
  }

  if (
    dados.statusIds !== undefined &&
    !Array.isArray(dados.statusIds)
  ) {
    return NextResponse.json(
      { erro: "statusIds deve ser uma lista." },
      { status: 400 }
    );
  }

  const statusBrutos = (dados.statusIds ?? []) as unknown[];

  if (
    statusBrutos.some(
      (item) =>
        typeof item !== "string" || !item.trim()
    )
  ) {
    return NextResponse.json(
      { erro: "A lista contém status inválidos." },
      { status: 400 }
    );
  }

  const statusIds = statusBrutos.map(
    (item) => (item as string).trim()
  );

  if (new Set(statusIds).size !== statusIds.length) {
    return NextResponse.json(
      { erro: "A lista contém status duplicados." },
      { status: 400 }
    );
  }

  try {
    const avaliacao = await prisma.$transaction(
      async (tx) => {
        // Confirma a existência da sessão.
        const sessao = await tx.sessao.findUnique({
          where: {
            id: sessaoId,
          },
        });

        if (!sessao) {
          throw new ErroOperacao(
            404,
            "Sessão não encontrada."
          );
        }

        // A escrita condicional coordena esta operação
        // com o encerramento da sessão.
        const atualizacao = await tx.sessao.updateMany({
          where: {
            id: sessaoId,
            status: "EM_ANDAMENTO",
          },
          data: {
            ultimaAtividade: new Date(),
          },
        });

        if (atualizacao.count !== 1) {
          throw new ErroOperacao(
            409,
            "Não é possível avaliar veículos em uma sessão encerrada."
          );
        }

        // Valida o veículo dentro da transação.
        const veiculo = await tx.veiculo.findUnique({
          where: {
            id: veiculoId,
          },
        });

        if (!veiculo) {
          throw new ErroOperacao(
            404,
            "Veículo não encontrado."
          );
        }

        if (!veiculo.ativo) {
          throw new ErroOperacao(
            400,
            "Não é possível avaliar um veículo inativo."
          );
        }

        // Valida os status selecionados.
        const statusValidos = await tx.status.findMany({
          where: {
            id: {
              in: statusIds,
            },
            ativo: true,
          },
        });

        if (statusValidos.length !== statusIds.length) {
          throw new ErroOperacao(
            400,
            "Um ou mais status selecionados são inválidos ou inativos."
          );
        }

        // Cria a avaliação e suas associações.
        const novaAvaliacao = await tx.avaliacao.create({
          data: {
            sessaoId,
            veiculoId,
            inicio: new Date(),
            status: {
              create: statusIds.map((statusId) => ({
                statusId,
              })),
            },
          },
          include: {
            veiculo: true,
            status: {
              include: {
                status: true,
              },
            },
          },
        });

        return novaAvaliacao;
      }
    );

    return NextResponse.json(avaliacao, {
      status: 201,
    });
  } catch (error) {
    return responderErro(
      error,
      "Não foi possível criar a avaliação."
    );
  }
}
