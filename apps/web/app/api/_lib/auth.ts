export function authorized(request: Request) {
  const token = process.env.DISCOVERY_API_TOKEN;
  return Boolean(token && request.headers.get("authorization") === `Bearer ${token}`);
}
