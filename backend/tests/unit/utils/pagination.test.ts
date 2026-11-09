import { buildPaginationMeta, getPagination } from "../../../src/utils/pagination";

describe("getPagination", () => {
  it("retourne page 1 / limit 10 par défaut", () => {
    expect(getPagination()).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("calcule le skip à partir de la page et de la limite", () => {
    expect(getPagination("3", "20")).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it.each([
    ["0", 1],
    ["-5", 1],
  ])("ramène une page invalide (%s) à %i", (page, expected) => {
    expect(getPagination(page, "10").page).toBe(expected);
  });

  it("borne la limite au minimum à 1", () => {
    expect(getPagination("1", "0").limit).toBe(1);
  });

  it("borne la limite au maximum à 100", () => {
    expect(getPagination("1", "500").limit).toBe(100);
  });

  it("retombe sur les valeurs par défaut pour des valeurs non numériques", () => {
    expect(getPagination("abc", "xyz")).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("utilise les valeurs par défaut quand les chaînes sont vides", () => {
    expect(getPagination("", "")).toEqual({ page: 1, limit: 10, skip: 0 });
  });
});

describe("buildPaginationMeta", () => {
  it("calcule le nombre total de pages (arrondi supérieur)", () => {
    expect(buildPaginationMeta(2, 10, 25)).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("retourne 0 page quand il n'y a aucun élément", () => {
    expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(0);
  });
});
