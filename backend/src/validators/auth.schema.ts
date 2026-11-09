import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({
    error: (issue) =>
      issue.input === undefined
        ? "L'email est obligatoire."
        : "Adresse email invalide.",
  }),

  password: z
    .string({ error: "Le mot de passe est obligatoire." })
    .min(1, "Le mot de passe est obligatoire."),
});
