/**
 * Options de pagination.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Métadonnées de pagination.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Convertit un paramètre de requête en entier,
 * avec une valeur par défaut s'il est absent ou non numérique.
 */
function toInteger(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);

  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Calcule les paramètres de pagination
 * à partir des paramètres de requête.
 */
export function getPagination(
  page?: string,
  limit?: string
): PaginationOptions {
  const currentPage = Math.max(toInteger(page, 1), 1);

  const currentLimit = Math.min(
    Math.max(toInteger(limit, 10), 1),
    100
  );

  return {
    page: currentPage,
    limit: currentLimit,
    skip: (currentPage - 1) * currentLimit,
  };
}

/**
 * Construit les informations de pagination
 * à retourner dans les réponses API.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}