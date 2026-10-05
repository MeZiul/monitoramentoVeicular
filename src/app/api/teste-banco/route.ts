import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const quantidade = await prisma.veiculo.count();

  return NextResponse.json({
    banco: "ok",
    veiculos: quantidade,
  });
}