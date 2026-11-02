import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Desk } from "@/components/studio/Desk";
import { SignIn, SignOut } from "@/components/studio/SignIn";
import { authConfigured, studioUser } from "@/lib/auth";
import "./studio.css";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

/** Soni's studio: look after the visitors' wall and add site photos to the chapters. */
export default function Studio() {
  return (
    <main className="studio">
      <nav className="studio-bar">
        <Link href="/" className="btn-quiet">
          ← Back to the building
        </Link>
      </nav>
      <h1 className="display studio-title">Studio</h1>
      <Suspense fallback={<p className="studio-note">Checking who&apos;s here…</p>}>
        <Gate />
      </Suspense>
    </main>
  );
}

async function Gate() {
  await connection(); // the session is per request; never read it while prerendering
  if (!authConfigured()) return <p className="studio-note">Sign-in isn&apos;t set up yet. See the README.</p>;
  const { user, owner } = await studioUser();
  if (!user) return <SignIn />;
  if (!owner)
    return (
      <div className="studio-card">
        <p>You&apos;re signed in as {user.email}, but this studio is Soni&apos;s.</p>
        <SignOut />
      </div>
    );
  return (
    <>
      <p className="studio-note">
        Signed in as {user.email}. <SignOut />
      </p>
      <Desk />
    </>
  );
}
