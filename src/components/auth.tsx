"use client";
import { useState } from "react";
import { db } from "@/lib/supabase";
export default function Auth({
  recovery = false,
  onRecovered,
}: {
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const [mode, setMode] = useState(recovery ? "update" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
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
        <div className="brand">
          <span className="brand-mark">E</span>Engineering OS
        </div>
        <h1>
          Your university
          <br />
          command center
        </h1>
        <p>
          Sign in to sync your timetable, assignments, exams, study plan,
          projects, and progress across devices.
        </p>
        <div className="auth-note">
          <span className="eyebrow">BUILT AROUND YOUR WEEK</span>
          <p>
            Know what’s next.
            <br />
            Make room for what matters.
          </p>
          <span className="muted">NUM · Engineering</span>
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
            <label>
              Your name
              <input
                autoComplete="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
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
