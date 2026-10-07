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

    const status = await prisma.status.findUnique({
      where: {
        id,
      },
    });

    if (!status) {
      return NextResponse.json(
        { erro: "Status não encontrado." },
        { status: 404 }
      );
    }

    const atualizado = await prisma.status.update({
      where: {
        id,
      },
      data: {
        ativo: body.ativo,
      },
    });

    return NextResponse.json(atualizado);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível atualizar o status." },
      { status: 500 }
    );
  }
}