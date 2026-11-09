/**
 * Neutralise morgan pendant les tests d'intégration / E2E pour garder
 * une sortie lisible. Le middleware de log est couvert par ses tests unitaires.
 */
jest.mock("morgan", () => () => (_req: unknown, _res: unknown, next: () => void) => next());
