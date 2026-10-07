import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sessoes = await prisma.sessao.findMany({
      orderBy: {
        inicio: "desc",
      },
    });

    return NextResponse.json(sessoes);
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível carregar as sessões." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const sessao = await prisma.sessao.create({
      data: {
        status: "EM_ANDAMENTO",
        ultimaAtividade: new Date(),
      },
    });

    return NextResponse.json(sessao, { status: 201 });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível criar a sessão." },
      { status: 500 }
    );
  }
}