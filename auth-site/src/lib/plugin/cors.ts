export function pluginCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin =
    !origin || origin === "null" || origin === "https://www.figma.com"
      ? origin || "*"
      : origin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

export function jsonWithCors(
  request: Request,
  body: unknown,
  init?: { status?: number },
) {
  return Response.json(body, {
    status: init?.status ?? 200,
    headers: pluginCorsHeaders(request),
  });
}

export function emptyCors(request: Request, status = 204) {
  return new Response(null, {
    status,
    headers: pluginCorsHeaders(request),
  });
}
