type AppLike = {
  handle: (request: Request) => Response | Promise<Response>;
};

export type JsonResult<T> = {
  status: number;
  body: T;
};

export const requestJson = async <T>(
  app: AppLike,
  method: string,
  path: string,
  payload?: unknown
): Promise<JsonResult<T>> => {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (payload !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(payload);
  }

  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body
    })
  );

  return {
    status: response.status,
    body: (await response.json()) as T
  };
};