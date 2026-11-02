import { createAuthClient } from "@neon/auth/next";

/** Browser side of the studio sign-in; talks to /api/auth on this site. */
export const authClient = createAuthClient();
