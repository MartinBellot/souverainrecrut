import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "L'email est obligatoire." })
    .email("Adresse email invalide."),

  password: z
    .string({ error: "Le mot de passe est obligatoire." })
    .min(1, "Le mot de passe est obligatoire."),
});
