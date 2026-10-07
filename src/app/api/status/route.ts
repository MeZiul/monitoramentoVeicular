import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const status = await prisma.status.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível carregar os status." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nome = String(body.nome ?? "")
      .trim()
      .toUpperCase();

    if (!nome) {
      return NextResponse.json(
        { erro: "O nome do status é obrigatório." },
        { status: 400 }
      );
    }

    const existente = await prisma.status.findUnique({
      where: {
        nome,
      },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Já existe um status com esse nome." },
        { status: 409 }
      );
    }

    const status = await prisma.status.create({
      data: {
        nome,
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { erro: "Não foi possível criar o status." },
      { status: 500 }
    );
  }
}