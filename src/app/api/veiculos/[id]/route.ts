import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    if (typeof body.ativo !== "boolean") {
      return NextResponse.json(
        { erro: "O campo 'ativo' deve ser booleano." },
        { status: 400 }
      );
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id,
      },
    });

    if (!veiculo) {
      return NextResponse.json(
        { erro: "Veículo não encontrado." },
        { status: 404 }
      );
    }

    const atualizado = await prisma.veiculo.update({
      where: {
        id,
      },
      data: {
        ativo: body.ativo,
      },
    });

    return NextResponse.json(atualizado);
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível atualizar o veículo." },
      { status: 500 }
    );
  }
}