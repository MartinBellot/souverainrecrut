/** Jeux de données réutilisables (format renvoyé par Prisma). */
const now = new Date("2026-01-01T10:00:00.000Z");

export const userFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  firstName: "Alice",
  lastName: "Diallo",
  email: "alice@souverainrecrut.com",
  password: "$2b$10$hashedpassword",
  role: "RECRUITER",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const candidateFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "candidate-1",
  fullName: "Mamadou Bah",
  email: "mamadou@example.com",
  phone: "+224620000001",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const jobFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  title: "Développeur Full Stack",
  description: "Node.js / React / PostgreSQL",
  location: "Conakry",
  company: "SouverainTech",
  recruiterId: "user-1",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const applicationFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "application-1",
  candidateId: "candidate-1",
  jobId: "job-1",
  status: "PENDING",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});
