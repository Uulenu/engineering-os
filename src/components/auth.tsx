"use client";
import Link from "next/link";
import { useState } from "react";
import ProfileFields from "./profile-fields";
import { StudentProfile, profileError } from "@/lib/universities";
import { db } from "@/lib/supabase";
export default function Auth({
  recovery = false,
  initialMode = "signin",
  onRecovered,
}: {
  recovery?: boolean;
  initialMode?: "signin" | "signup";
  onRecovered?: () => void;
}) {
  const [mode, setMode] = useState(
    recovery ? "update" : (initialMode as string),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<StudentProfile>({
    display_name: "",
    university: "",
    major: "",
    study_year: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = db();
      const redirect = `${window.location.origin}/auth/callback`;
      if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === "signup") {
        const invalid = profileError(profile);
        if (invalid) throw new Error(invalid);
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: Object.fromEntries(
              Object.entries(profile).map(([k, v]) => [k, v.trim()]),
            ),
            emailRedirectTo: redirect,
          },
        });
        if (error) throw error;
        if (!data.session)
          setMessage("Check your email to confirm your account, then sign in.");
      } else if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${redirect}?next=recovery`,
        });
        if (error) throw error;
        setMessage(
          "If this email has an account, a password reset link is on its way.",
        );
      } else {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        onRecovered?.();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const heading =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : mode === "reset"
          ? "Reset password"
          : "Set a new password";
  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <Link href="/" className="brand">
          <span className="brand-mark">S</span>Suralta
        </Link>
        <h1>
          Your semester.
          <br />
          Your own rhythm.
        </h1>
        <p>
          Sign in to sync your timetable, assignments, exams, study plan,
          projects, and progress across devices.
        </p>
        <div className="auth-note">
          <span className="eyebrow">A LITTLE CLARITY, EVERY DAY</span>
          <p>
            Know what’s next.
            <br />
            Make room for what matters.
          </p>
          <span className="muted">Every school. Every major.</span>
        </div>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>{heading}</h2>
          <p className="muted">
            {mode === "signin"
              ? "Welcome back. Your semester is waiting."
              : mode === "signup"
                ? "A quieter place to organize university life."
                : "Keep your account secure."}
          </p>
          {mode === "signup" && (
            <ProfileFields value={profile} onChange={setProfile} />
          )}
          {mode !== "update" && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Password
              <input
                type="password"
                required
                minLength={mode === "signin" ? 1 : 10}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode !== "signin" && <small>Use at least 10 characters.</small>}
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="success" role="status">
              {message}
            </p>
          )}
          <button className="primary w-full" disabled={busy}>
            {busy ? "Please wait…" : heading}
          </button>
          {mode !== "update" && (
            <div className="auth-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "signin"
                  ? "New here? Create account"
                  : "Back to sign in"}
              </button>
              {mode === "signin" && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError("");
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}
          <p className="caption muted">Your data is private to your account.</p>
        </form>
      </section>
    </main>
  );
}
