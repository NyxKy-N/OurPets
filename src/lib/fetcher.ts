export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => null)) as unknown;
  const payload = json as ApiOk<T> | ApiErr | null;

  const isApiErr = (p: unknown): p is ApiErr =>
    Boolean(
      p &&
        typeof p === "object" &&
        "ok" in p &&
        (p as { ok: unknown }).ok === false
    );

  if (!res.ok || !payload || isApiErr(payload)) {
    const message = isApiErr(payload)
      ? payload.error.message
      : `Request failed (${res.status})`;

    const err = new Error(message) as Error & {
      status?: number;
      code?: string;
      details?: unknown;
    };
    err.status = res.status;
    if (isApiErr(payload)) {
      err.code = payload.error.code;
      err.details = payload.error.details;
    }
    throw err;
  }

  return (payload as ApiOk<T>).data;
}
