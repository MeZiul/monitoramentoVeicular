import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const sessao = await prisma.sessao.findUnique({
      where: {
        id,
      },
      include: {
        avaliacoes: {
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
        },
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { erro: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(sessao);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível carregar a sessão." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const sessao = await prisma.sessao.findUnique({
      where: {
        id,
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { erro: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (body.acao === "atividade") {
      const atualizada = await prisma.sessao.update({
        where: {
          id,
        },
        data: {
          ultimaAtividade: new Date(),
        },
      });

      return NextResponse.json(atualizada);
    }

    if (body.acao === "encerrar") {
      const atualizada = await prisma.sessao.update({
        where: {
          id,
        },
        data: {
          fim: new Date(),
          status: "ENCERRADA",
          ultimaAtividade: new Date(),
        },
      });

      return NextResponse.json(atualizada);
    }

    if (body.acao === "continuar") {
      if (sessao.status === "ENCERRADA") {
        return NextResponse.json(
          { erro: "Não é possível continuar uma sessão encerrada." },
          { status: 400 }
        );
      }

      const atualizada = await prisma.sessao.update({
        where: {
          id,
        },
        data: {
          ultimaAtividade: new Date(),
        },
      });

      return NextResponse.json(atualizada);
    }

    return NextResponse.json(
      { erro: "Ação inválida." },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível atualizar a sessão." },
      { status: 500 }
    );
  }
}