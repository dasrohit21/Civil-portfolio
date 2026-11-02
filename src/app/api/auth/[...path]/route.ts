import { auth } from "@/lib/auth";

/** Neon Auth on this site's own origin, so the session lives in a first-party cookie. */
const handle = (method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH") => (request: Request, context: { params: Promise<{ path: string[] }> }) =>
  auth().handler()[method](request, context);

export const GET = handle("GET");
export const POST = handle("POST");
export const PUT = handle("PUT");
export const DELETE = handle("DELETE");
export const PATCH = handle("PATCH");
