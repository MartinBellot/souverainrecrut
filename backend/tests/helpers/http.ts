import { NextFunction, Request, Response } from "express";

export type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

/** Construit une fausse réponse Express chaînable. */
export const mockResponse = (): MockResponse => {
  const res = {} as MockResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/** Construit une fausse requête Express. */
export const mockRequest = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, params: {}, query: {}, body: {}, ...overrides }) as Request;

/** Attend la résolution des promesses en attente (asyncHandler ne retourne pas sa promesse). */
export const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/** Exécute un handler Express et attend la fin de son traitement asynchrone. */
export const run = async (
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request,
  res: Response = mockResponse()
) => {
  const next = jest.fn();
  handler(req, res, next);
  await flushPromises();
  return { res: res as MockResponse, next };
};
