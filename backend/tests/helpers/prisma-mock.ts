/**
 * Double de test du client Prisma : chaque méthode de chaque modèle
 * est un jest.fn() que les tests configurent selon le scénario.
 */
const delegate = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export const createPrismaMock = () => ({
  user: delegate(),
  candidate: delegate(),
  job: delegate(),
  application: delegate(),
  $queryRaw: jest.fn(),
});

export type PrismaMock = ReturnType<typeof createPrismaMock>;
