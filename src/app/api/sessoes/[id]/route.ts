
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Contexto = {
  params: Promise<{ id: string }>;
};

type AcaoSessao = "atividade" | "encerrar" | "continuar";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    { status }
  );
}

// GET - Consultar sessão e suas avaliações
export async function GET(
  _request: Request,
  context: Contexto
) {
  try {
    const { id } = await context.params;

    if (!id.trim()) {
      return respostaErro("ID da sessão inválido.", 400);
    }

    const sessao = await prisma.sessao.findUnique({
      where: { id },
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
      return respostaErro("Sessão não encontrada.", 404);
    }

    return NextResponse.json(sessao);
  } catch (error) {
    console.error("Erro ao consultar sessão:", error);

    return respostaErro(
      "Não foi possível carregar a sessão.",
      500
    );
  }
}

// PATCH - Atualizar o estado da sessão
export async function PATCH(
  request: Request,
  context: Contexto
) {
  const { id } = await context.params;

  if (!id.trim()) {
    return respostaErro("ID da sessão inválido.", 400);
  }

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
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return respostaErro(
      "Formato da requisição inválido.",
      400
    );
  }

  const { acao } = body as { acao?: unknown };

  const acoesPermitidas: AcaoSessao[] = [
    "atividade",
    "encerrar",
    "continuar",
  ];

  if (
    typeof acao !== "string" ||
    !acoesPermitidas.includes(acao as AcaoSessao)
  ) {
    return respostaErro("Ação inválida.", 400);
  }

  try {
    // Confirma a existência da sessão.
    const existente = await prisma.sessao.findUnique({
      where: { id },
    });

    if (!existente) {
      return respostaErro("Sessão não encontrada.", 404);
    }

    // Sessões encerradas são imutáveis.
    if (existente.status === "ENCERRADA") {
      return respostaErro(
        "Esta sessão já foi encerrada e não pode ser alterada.",
        409
      );
    }

    const agora = new Date();

    if (acao === "encerrar") {
      // Atualização condicional:
      // somente uma sessão aberta pode ser encerrada.
      const resultado = await prisma.sessao.updateMany({
        where: {
          id,
          status: "EM_ANDAMENTO",
          fim: null,
        },
        data: {
          status: "ENCERRADA",
          fim: agora,
          ultimaAtividade: agora,
        },
      });

      if (resultado.count !== 1) {
        return respostaErro(
          "A sessão não está disponível para encerramento.",
          409
        );
      }

      const encerrada = await prisma.sessao.findUnique({
        where: { id },
      });

      return NextResponse.json(encerrada);
    }

    // Atividade e continuar têm a mesma semântica:
    // atualizar a última atividade da sessão aberta.
    const resultado = await prisma.sessao.updateMany({
      where: {
        id,
        status: "EM_ANDAMENTO",
        fim: null,
      },
      data: {
        ultimaAtividade: agora,
      },
    });

    if (resultado.count !== 1) {
      return respostaErro(
        "Não é possível atualizar uma sessão encerrada.",
        409
      );
    }

    const atualizada = await prisma.sessao.findUnique({
      where: { id },
    });

    return NextResponse.json(atualizada);
  } catch (error) {
    console.error("Erro ao atualizar sessão:", error);

    return respostaErro(
      "Não foi possível atualizar a sessão.",
      500
    );
  }
}
