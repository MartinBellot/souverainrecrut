import { Prisma, User } from "@prisma/client";

import { prisma } from "../config/prisma";

/**
 * Champs d'un utilisateur exposables par l'API.
 * Le mot de passe (hash) n'est JAMAIS renvoyé.
 */
export const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export class UserRepository {
  /**
   * Retourne les utilisateurs paginés (sans mot de passe).
   */
  async findAll(skip = 0, take = 10) {
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
        select: publicUserSelect,
      }),

      prisma.user.count(),
    ]);

    return {
      items,
      total,
    };
  }

  /**
   * Retourne un utilisateur par son identifiant (sans mot de passe).
   */
  async findById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      where: {
        id,
      },
      select: publicUserSelect,
    });
  }

  /**
   * Retourne un utilisateur par son email.
   *
   * ⚠️ Inclut le hash du mot de passe : réservé à l'authentification
   * et aux contrôles internes, ne jamais renvoyer tel quel au client.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  /**
   * Retourne le profil d'un utilisateur
   * sans exposer son mot de passe.
   */
  async findProfile(id: string): Promise<PublicUser | null> {
    return this.findById(id);
  }

  /**
   * Crée un utilisateur.
   */
  async create(data: Prisma.UserCreateInput): Promise<PublicUser> {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    });
  }

  /**
   * Met à jour un utilisateur.
   */
  async update(
    id: string,
    data: Prisma.UserUpdateInput
  ): Promise<PublicUser> {
    return prisma.user.update({
      where: {
        id,
      },
      data,
      select: publicUserSelect,
    });
  }

  /**
   * Supprime un utilisateur.
   */
  async delete(id: string): Promise<PublicUser> {
    return prisma.user.delete({
      where: {
        id,
      },
      select: publicUserSelect,
    });
  }
}
