import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const veiculos = await prisma.veiculo.findMany({
    orderBy: {
      placa: "asc",
    },
  });

  return NextResponse.json(veiculos);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const placa = String(body.placa ?? "")
      .trim()
      .toUpperCase();

    if (!placa) {
      return NextResponse.json(
        { erro: "A placa é obrigatória." },
        { status: 400 }
      );
    }

    const existente = await prisma.veiculo.findUnique({
      where: {
        placa,
      },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Já existe um veículo com essa placa." },
        { status: 409 }
      );
    }

    const veiculo = await prisma.veiculo.create({
      data: {
        placa,
      },
    });

    return NextResponse.json(veiculo, { status: 201 });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível cadastrar o veículo." },
      { status: 500 }
    );
  }
}