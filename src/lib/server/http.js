const defaultHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
};

export function ok(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init.headers || {})
    }
  });
}

export function badRequest(message) {
  return Response.json(
    {
      error: {
        code: "bad_request",
        message
      }
    },
    {
      status: 400
    }
  );
}

export function notFound(message) {
  return Response.json(
    {
      error: {
        code: "not_found",
        message
      }
    },
    {
      status: 404
    }
  );
}
