import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const statusId = String(body.statusId ?? "");

    if (!statusId) {
      return NextResponse.json(
        { erro: "O status é obrigatório." },
        { status: 400 }
      );
    }

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

    const status = await prisma.status.findUnique({
      where: {
        id: statusId,
      },
    });

    if (!status) {
      return NextResponse.json(
        { erro: "Status não encontrado." },
        { status: 404 }
      );
    }

    if (!status.ativo) {
      return NextResponse.json(
        { erro: "Não é possível adicionar um status inativo." },
        { status: 400 }
      );
    }

    const existente = await prisma.avaliacaoStatus.findUnique({
      where: {
        avaliacaoId_statusId: {
          avaliacaoId: id,
          statusId,
        },
      },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Esse status já está associado à avaliação." },
        { status: 409 }
      );
    }

    const associacao = await prisma.avaliacaoStatus.create({
      data: {
        avaliacaoId: id,
        statusId,
      },
      include: {
        status: true,
      },
    });

    await prisma.sessao.update({
      where: {
        id: avaliacao.sessaoId,
      },
      data: {
        ultimaAtividade: new Date(),
      },
    });

    return NextResponse.json(associacao, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível adicionar o status à avaliação." },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { searchParams } = new URL(request.url);

    const statusId = searchParams.get("statusId");

    if (!statusId) {
      return NextResponse.json(
        { erro: "O parâmetro statusId é obrigatório." },
        { status: 400 }
      );
    }

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

    const associacao = await prisma.avaliacaoStatus.findUnique({
      where: {
        avaliacaoId_statusId: {
          avaliacaoId: id,
          statusId,
        },
      },
    });

    if (!associacao) {
      return NextResponse.json(
        { erro: "Esse status não está associado à avaliação." },
        { status: 404 }
      );
    }

    await prisma.avaliacaoStatus.delete({
      where: {
        avaliacaoId_statusId: {
          avaliacaoId: id,
          statusId,
        },
      },
    });

    await prisma.sessao.update({
      where: {
        id: avaliacao.sessaoId,
      },
      data: {
        ultimaAtividade: new Date(),
      },
    });

    return NextResponse.json({
      mensagem: "Status removido da avaliação.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível remover o status da avaliação." },
      { status: 500 }
    );
  }
}