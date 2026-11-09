import jwt from "jsonwebtoken";

type TestRole = "ADMIN" | "RECRUITER";

/** Génère un JWT valide signé avec le secret de test. */
export const tokenFor = (role: TestRole, id = `${role.toLowerCase()}-id`) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

export const bearer = (role: TestRole, id?: string) => `Bearer ${tokenFor(role, id)}`;
