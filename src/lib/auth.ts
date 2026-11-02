import { createNeonAuth } from "@neon/auth/next/server";

/**
 * Sign-in for the studio, through Neon Auth (Managed Better Auth). Server only.
 *   NEON_AUTH_BASE_URL       written by `neon deploy`
 *   NEON_AUTH_COOKIE_SECRET  our own secret, 32+ characters
 * Public sign-up is off: the owner's account is made with `neon neon-auth user create`
 * and given the admin role with `neon neon-auth user set-role <id> --roles admin`.
 */
let instance: ReturnType<typeof createNeonAuth> | null = null;

export const authConfigured = () => Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

export function auth() {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}

/** Who is signed in, and whether they may use the studio. */
export async function studioUser() {
  if (!authConfigured()) return { user: null, owner: false };
  const { data } = await auth().getSession();
  const user = data?.user ?? null;
  const roles = String((user as { role?: unknown } | null)?.role ?? "").split(",");
  return { user, owner: roles.includes("admin") };
}

/** For studio route handlers: a 401/403 response, or null when the owner is signed in. */
export async function denyUnlessOwner() {
  const { user, owner } = await studioUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!owner) return Response.json({ error: "This studio is Soni's." }, { status: 403 });
  return null;
}
