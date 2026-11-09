import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

import {
  PublicUser,
  UserRepository,
} from "../repositories/user.repository";
import { AppError } from "../errors/app.error";

/**
 * Coût du hachage bcrypt des mots de passe.
 */
const BCRYPT_ROUNDS = 10;

export class UserService {
  private readonly repository: UserRepository;

  constructor() {
    this.repository = new UserRepository();
  }

  /**
   * Retourne les utilisateurs paginés.
   */
  async getAll(skip = 0, take = 10) {
    return this.repository.findAll(skip, take);
  }

  /**
   * Retourne un utilisateur par son identifiant.
   */
  async getById(id: string): Promise<PublicUser> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  /**
   * Retourne le profil de l'utilisateur connecté.
   */
  async getProfile(id: string): Promise<PublicUser> {
    const user = await this.repository.findProfile(id);

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  /**
   * Crée un utilisateur.
   */
  async create(data: Prisma.UserCreateInput): Promise<PublicUser> {
    await this.ensureEmailIsAvailable(data.email);

    return this.repository.create({
      ...data,
      password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    });
  }

  /**
   * Met à jour un utilisateur.
   * Un nouveau mot de passe est systématiquement haché.
   */
  async update(
    id: string,
    data: Prisma.UserUpdateInput
  ): Promise<PublicUser> {
    await this.getById(id);

    if (typeof data.email === "string") {
      await this.ensureEmailIsAvailable(data.email, id);
    }

    if (typeof data.password === "string") {
      data = {
        ...data,
        password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      };
    }

    return this.repository.update(id, data);
  }

  /**
   * Supprime un utilisateur.
   */
  async delete(id: string): Promise<PublicUser> {
    await this.getById(id);

    return this.repository.delete(id);
  }

  /**
   * Vérifie qu'aucun autre utilisateur n'utilise déjà cet email.
   */
  private async ensureEmailIsAvailable(
    email: string,
    currentUserId?: string
  ): Promise<void> {
    const existingUser = await this.repository.findByEmail(email);

    if (existingUser && existingUser.id !== currentUserId) {
      throw new AppError(
        "Cet email est déjà utilisé.",
        409
      );
    }
  }
}
