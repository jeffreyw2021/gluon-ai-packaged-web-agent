export interface AgentErrorOptions {
  status?: number;
  code?: string;
}

export class AgentError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message);
    this.name = "AgentError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
  }

  static badRequest(message: string, code = "BAD_REQUEST"): AgentError {
    return new AgentError(message, { status: 400, code });
  }

  static unauthorized(message: string, code = "UNAUTHORIZED"): AgentError {
    return new AgentError(message, { status: 401, code });
  }

  static forbidden(message: string, code = "FORBIDDEN"): AgentError {
    return new AgentError(message, { status: 403, code });
  }

  static notFound(message: string, code = "NOT_FOUND"): AgentError {
    return new AgentError(message, { status: 404, code });
  }

  static conflict(message: string, code = "CONFLICT"): AgentError {
    return new AgentError(message, { status: 409, code });
  }

  toResponse(): Response {
    return Response.json(
      { ok: false, code: this.code, message: this.message },
      { status: this.status },
    );
  }
}

export function handleRouteError(err: unknown): Response {
  if (err instanceof AgentError) {
    return err.toResponse();
  }
  console.error("[Agent route error]", err);
  return Response.json(
    { ok: false, code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    { status: 500 },
  );
}

export function apiSuccess<T extends object>(data: T, status = 200): Response {
  return Response.json({ ok: true, ...data }, { status });
}
