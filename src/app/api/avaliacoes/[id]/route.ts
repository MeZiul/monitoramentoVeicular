
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!Array.isArray(body.statusIds)) {
      return NextResponse.json(
        { erro: "Informe uma lista válida de status." },
        { status: 400 }
      );
    }

    const statusIds = body.statusIds.map(String);

    if (
      statusIds.some((id: string) => !id.trim()) ||
      new Set(statusIds).size !== statusIds.length
    ) {
      return NextResponse.json(
        { erro: "Existem status inválidos ou duplicados." },
        { status: 400 }
      );
    }

    const avaliacao = await prisma.avaliacao.findUnique({
      where: { id },
      include: { sessao: true },
    });

    if (!avaliacao) {
      return NextResponse.json(
        { erro: "Avaliação não encontrada." },
        { status: 404 }
      );
    }

    if (avaliacao.sessao.status === "ENCERRADA") {
      return NextResponse.json(
        {
          erro:
            "Não é permitido alterar avaliações de uma sessão encerrada.",
        },
        { status: 409 }
      );
    }

    const statusValidos = await prisma.status.findMany({
      where: {
        id: { in: statusIds },
        ativo: true,
      },
    });

    if (statusValidos.length !== statusIds.length) {
      return NextResponse.json(
        { erro: "Um ou mais status são inválidos ou inativos." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Revalida dentro da transação antes da alteração.
      const sessao = await tx.sessao.findUnique({
        where: { id: avaliacao.sessaoId },
      });

      if (!sessao || sessao.status === "ENCERRADA") {
        throw new Error("SESSAO_ENCERRADA");
      }

      await tx.avaliacaoStatus.deleteMany({
        where: { avaliacaoId: id },
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
        where: { id: avaliacao.sessaoId },
        data: { ultimaAtividade: new Date() },
      });
    });

    const atualizada = await prisma.avaliacao.findUnique({
      where: { id },
      include: {
        veiculo: true,
        status: {
          include: { status: true },
        },
      },
    });

    return NextResponse.json(atualizada);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SESSAO_ENCERRADA"
    ) {
      return NextResponse.json(
        { erro: "A sessão está encerrada." },
        { status: 409 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível atualizar a avaliação." },
      { status: 500 }
    );
  }
}
