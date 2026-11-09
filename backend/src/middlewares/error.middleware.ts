import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app.error";

/**
 * Traduction des erreurs Prisma connues en erreurs HTTP métier.
 * https://www.prisma.io/docs/orm/reference/error-reference
 */
const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  // Violation d'une contrainte d'unicité.
  P2002: {
    status: 409,
    message: "Une ressource avec ces valeurs existe déjà.",
  },
  // Violation d'une clé étrangère : la ressource liée n'existe pas.
  P2003: {
    status: 400,
    message: "Une ressource liée est introuvable.",
  },
  // Enregistrement à modifier / supprimer introuvable.
  P2025: {
    status: 404,
    message: "Ressource introuvable.",
  },
};

/**
 * Erreurs levées par express.json() (body-parser).
 */
const BODY_PARSER_ERRORS: Record<string, { status: number; message: string }> = {
  "entity.parse.failed": {
    status: 400,
    message: "Le corps de la requête n'est pas un JSON valide.",
  },
  "entity.too.large": {
    status: 413,
    message: "Le corps de la requête est trop volumineux.",
  },
};

const sendError = (res: Response, status: number, message: string): void => {
  res.status(status).json({
    success: false,
    error: {
      status,
      message,
    },
  });
};

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const known = PRISMA_ERRORS[err.code];

    if (known) {
      return sendError(res, known.status, known.message);
    }
  }

  const bodyParserError = BODY_PARSER_ERRORS[(err as { type?: string }).type ?? ""];

  if (bodyParserError) {
    return sendError(res, bodyParserError.status, bodyParserError.message);
  }

  console.error(err);

  sendError(res, 500, "Erreur interne du serveur.");
};
