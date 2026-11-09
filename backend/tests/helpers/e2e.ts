/**
 * Outillage E2E : vrai serveur HTTP + vraie base PostgreSQL.
 */
import { Server } from "node:http";
import { AddressInfo } from "node:net";

import bcrypt from "bcrypt";
import request from "supertest";

import app from "../../src/app";
import { prisma } from "../../src/config/prisma";

export { prisma };

export const ADMIN_CREDENTIALS = { email: "admin@souverainrecrut.com", password: "Admin1234!" };

let server: Server;

/** Démarre l'API sur un port libre et renvoie un client HTTP pointant dessus. */
export const startServer = async () => {
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return request(`http://127.0.0.1:${port}`);
};

export const stopServer = async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
};

/** Vide toutes les tables puis crée l'administrateur initial. */
export const resetDatabase = async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "applications", "jobs", "candidates", "users" RESTART IDENTITY CASCADE'
  );
  await prisma.user.create({
    data: {
      firstName: "Super",
      lastName: "Admin",
      email: ADMIN_CREDENTIALS.email,
      password: await bcrypt.hash(ADMIN_CREDENTIALS.password, 4),
      role: "ADMIN",
    },
  });
};

/** Se connecte via l'API et renvoie l'en-tête Authorization prêt à l'emploi. */
export const login = async (
  client: ReturnType<typeof request>,
  credentials: { email: string; password: string }
) => {
  const res = await client.post("/v1/auth/login").send(credentials).expect(200);
  return { authorization: `Bearer ${res.body.data.token}`, user: res.body.data.user };
};
