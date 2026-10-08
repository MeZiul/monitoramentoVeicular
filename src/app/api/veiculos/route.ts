
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

function normalizarPlaca(valor: string): string {
  const placa = valor
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");

  if (placa.length !== 7) {
    return placa;
  }

  return `${placa.slice(0, 3)}-${placa.slice(3)}`;
}

// Padrão antigo: ABC-1234
const PLACA_ANTIGA = /^[A-Z]{3}-[0-9]{4}$/;

// Padrão Mercosul: ACB-1D23
const PLACA_MERCOSUL = /^[A-Z]{3}-[0-9][A-Z][0-9]{2}$/;

function validarPlaca(placa: string): boolean {
  return (
    PLACA_ANTIGA.test(placa) ||
    PLACA_MERCOSUL.test(placa)
  );
}


function respostaErro(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    { status }
  );
}

// GET - Listar veículos cadastrados
export async function GET() {
  try {
    const veiculos = await prisma.veiculo.findMany({
      orderBy: {
        placa: "asc",
      },
    });

    return NextResponse.json(veiculos);
  } catch (error) {
    console.error("Erro ao listar veículos:", error);

    return respostaErro(
      "Não foi possível carregar os veículos.",
      500
    );
  }
}

// POST - Cadastrar veículo
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return respostaErro(
      "O corpo da requisição deve ser um JSON válido.",
      400
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return respostaErro(
      "Formato da requisição inválido.",
      400
    );
  }

  const dados = body as Record<string, unknown>;

  if (
    typeof dados.placa !== "string" ||
    !dados.placa.trim()
  ) {
    return respostaErro(
      "A placa é obrigatória e deve ser um texto.",
      400
    );
  }

  const placa = normalizarPlaca(dados.placa);

  if (!validarPlaca(placa)) {
    return respostaErro(
      "Placa inválida. Utilize ABC-1234 ou ACB-1D23.",
      400
    );
  }

  try {
    const veiculo = await prisma.veiculo.create({
      data: {
        placa,
      },
    });

    return NextResponse.json(veiculo, {
      status: 201,
    });
  } catch (error) {
    // O banco possui uma restrição UNIQUE sobre placa.
    // Essa verificação também protege contra requisições
    // simultâneas tentando cadastrar a mesma placa.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return respostaErro(
        "Já existe um veículo com essa placa.",
        409
      );
    }

    console.error("Erro ao cadastrar veículo:", error);

    return respostaErro(
      "Não foi possível cadastrar o veículo.",
      500
    );
  }
}
