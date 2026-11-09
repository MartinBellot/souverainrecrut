/**
 * Point d'entrée commun aux tests d'intégration :
 * l'application Express réelle avec un client Prisma simulé.
 *
 * Usage (en tête de fichier de test) :
 *   jest.mock("../../src/config/prisma", () => ({
 *     prisma: require("../helpers/prisma-mock").createPrismaMock(),
 *   }));
 */
import request from "supertest";

import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { PrismaMock } from "./prisma-mock";

export const db = prisma as unknown as PrismaMock;
export const api = () => request(app);
