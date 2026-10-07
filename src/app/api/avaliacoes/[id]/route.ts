import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const avaliacao = await prisma.avaliacao.findUnique({
      where: {
        id,
      },
    });

    if (!avaliacao) {
      return NextResponse.json(
        { erro: "Avaliação não encontrada." },
        { status: 404 }
      );
    }

    const statusIds = Array.isArray(body.statusIds)
      ? body.statusIds.map(String)
      : null;

    if (statusIds !== null) {
      const status = await prisma.status.findMany({
        where: {
          id: {
            in: statusIds,
          },
          ativo: true,
        },
      });

      if (status.length !== statusIds.length) {
        return NextResponse.json(
          { erro: "Um ou mais status selecionados são inválidos." },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.avaliacaoStatus.deleteMany({
          where: {
            avaliacaoId: id,
          },
        });

        if (statusIds.length > 0) {
          await tx.avaliacaoStatus.createMany({
            data: statusIds.map((statusId: string) => ({
              avaliacaoId: id,
              statusId,
            })),
          });
        }

        await tx.sessao.update({
          where: {
            id: avaliacao.sessaoId,
          },
          data: {
            ultimaAtividade: new Date(),
          },
        });
      });
    }

    const atualizada = await prisma.avaliacao.findUnique({
      where: {
        id,
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

    return NextResponse.json(atualizada);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível atualizar a avaliação." },
      { status: 500 }
    );
  }
}