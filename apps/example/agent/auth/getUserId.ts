// Development auth: return a fixed user ID.
// Replace with your real auth (next-auth, clerk, etc.) in production.
export default async function getUserId(_req: Request): Promise<string | null> {
  return "dev-user-1";
}
