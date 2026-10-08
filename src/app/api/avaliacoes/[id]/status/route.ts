
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

type Contexto = {
  params: Promise<{ id: string }>;
};

class ErroOperacao extends Error {
  constructor(
    public codigo: number,
    mensagem: string
  ) {
    super(mensagem);
    this.name = "ErroOperacao";
  }
}

function responderErro(error: unknown, operacao: string) {
  if (error instanceof ErroOperacao) {
    return NextResponse.json(
      { erro: error.message },
      { status: error.codigo }
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { erro: "Esse status já está associado à avaliação." },
      { status: 409 }
    );
  }

  console.error(`Erro ao ${operacao}:`, error);

  return NextResponse.json(
    { erro: `Não foi possível ${operacao}.` },
    { status: 500 }
  );
}

// POST - Adicionar status a uma avaliação
export async function POST(
  request: Request,
  context: Contexto
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const statusId =
      typeof body?.statusId === "string"
        ? body.statusId.trim()
        : "";

    if (!statusId) {
      return NextResponse.json(
        { erro: "O status é obrigatório." },
        { status: 400 }
      );
    }

    const associacao = await prisma.$transaction(
      async (tx) => {
        const avaliacao = await tx.avaliacao.findUnique({
          where: { id },
        });

        if (!avaliacao) {
          throw new ErroOperacao(
            404,
            "Avaliação não encontrada."
          );
        }

        // Adquire a escrita na sessão somente se estiver aberta.
        const sessao = await tx.sessao.updateMany({
          where: {
            id: avaliacao.sessaoId,
            status: "EM_ANDAMENTO",
          },
          data: {
            ultimaAtividade: new Date(),
          },
        });

        if (sessao.count !== 1) {
          throw new ErroOperacao(
            409,
            "Não é possível alterar uma sessão encerrada."
          );
        }

        const status = await tx.status.findUnique({
          where: { id: statusId },
        });

        if (!status) {
          throw new ErroOperacao(
            404,
            "Status não encontrado."
          );
        }

        if (!status.ativo) {
          throw new ErroOperacao(
            400,
            "Não é possível adicionar um status inativo."
          );
        }

        const existente =
          await tx.avaliacaoStatus.findUnique({
            where: {
              avaliacaoId_statusId: {
                avaliacaoId: id,
                statusId,
              },
            },
          });

        if (existente) {
          throw new ErroOperacao(
            409,
            "Esse status já está associado à avaliação."
          );
        }

        return tx.avaliacaoStatus.create({
          data: {
            avaliacaoId: id,
            statusId,
          },
          include: {
            status: true,
          },
        });
      }
    );

    return NextResponse.json(associacao, {
      status: 201,
    });
  } catch (error) {
    return responderErro(error, "adicionar o status à avaliação");
  }
}

// DELETE - Remover status de uma avaliação
export async function DELETE(
  request: Request,
  context: Contexto
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get("statusId")?.trim();

    if (!statusId) {
      return NextResponse.json(
        { erro: "O parâmetro statusId é obrigatório." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const avaliacao = await tx.avaliacao.findUnique({
        where: { id },
      });

      if (!avaliacao) {
        throw new ErroOperacao(
          404,
          "Avaliação não encontrada."
        );
      }

      const sessao = await tx.sessao.updateMany({
        where: {
          id: avaliacao.sessaoId,
          status: "EM_ANDAMENTO",
        },
        data: {
          ultimaAtividade: new Date(),
        },
      });

      if (sessao.count !== 1) {
        throw new ErroOperacao(
          409,
          "Não é possível alterar uma sessão encerrada."
        );
      }

      const associacao =
        await tx.avaliacaoStatus.findUnique({
          where: {
            avaliacaoId_statusId: {
              avaliacaoId: id,
              statusId,
            },
          },
        });

      if (!associacao) {
        throw new ErroOperacao(
          404,
          "Esse status não está associado à avaliação."
        );
      }

      await tx.avaliacaoStatus.delete({
        where: {
          avaliacaoId_statusId: {
            avaliacaoId: id,
            statusId,
          },
        },
      });
    });

    return NextResponse.json({
      mensagem: "Status removido da avaliação.",
    });
  } catch (error) {
    return responderErro(error, "remover o status da avaliação");
  }
}
