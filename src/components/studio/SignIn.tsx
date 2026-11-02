"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Sign in with a code sent by email: no password to remember. Sign-up is closed. */
export function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (error) setError(error.message ?? "The code couldn't be sent.");
    else setSent(true);
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const otp = String(new FormData(e.currentTarget).get("otp") ?? "").trim();
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (error) setError(error.message ?? "That code didn't work.");
    else router.refresh();
  }

  return (
    <div className="studio-card">
      {!sent ? (
        <form className="studio-form" onSubmit={send}>
          <label>
            <span className="label">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send me a code"}
          </button>
        </form>
      ) : (
        <form className="studio-form" onSubmit={verify}>
          <p>We sent a code to {email}.</p>
          <label>
            <span className="label">Code</span>
            <input name="otp" required inputMode="numeric" autoComplete="one-time-code" />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" className="btn-quiet" onClick={() => setSent(false)}>
            Use another email
          </button>
        </form>
      )}
      {error ? (
        <p className="studio-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SignOut() {
  const router = useRouter();
  return (
    <button type="button" className="link-quiet" onClick={() => authClient.signOut().then(() => router.refresh())}>
      Sign out
    </button>
  );
}
