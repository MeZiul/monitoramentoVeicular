import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessaoId = searchParams.get("sessaoId");

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
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível carregar as avaliações." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const sessaoId = String(body.sessaoId ?? "");
    const veiculoId = String(body.veiculoId ?? "");

    const statusIds = Array.isArray(body.statusIds)
      ? body.statusIds.map(String)
      : [];

    if (!sessaoId || !veiculoId) {
      return NextResponse.json(
        { erro: "Sessão e veículo são obrigatórios." },
        { status: 400 }
      );
    }

    const sessao = await prisma.sessao.findUnique({
      where: {
        id: sessaoId,
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { erro: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (sessao.status === "ENCERRADA") {
      return NextResponse.json(
        {
          erro:
            "Não é possível iniciar uma avaliação em uma sessão encerrada.",
        },
        { status: 400 }
      );
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id: veiculoId,
      },
    });

    if (!veiculo) {
      return NextResponse.json(
        { erro: "Veículo não encontrado." },
        { status: 404 }
      );
    }

    if (!veiculo.ativo) {
      return NextResponse.json(
        { erro: "Não é possível avaliar um veículo inativo." },
        { status: 400 }
      );
    }

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

    const avaliacao = await prisma.avaliacao.create({
      data: {
        sessaoId,
        veiculoId,
        inicio: new Date(),

        status: {
          create: statusIds.map((statusId: string) => ({
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

    await prisma.sessao.update({
      where: {
        id: sessaoId,
      },
      data: {
        ultimaAtividade: new Date(),
      },
    });

    return NextResponse.json(avaliacao, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível criar a avaliação." },
      { status: 500 }
    );
  }
}