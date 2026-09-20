"use client";
import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { StudentProfile, profileError } from "@/lib/universities";
import { db } from "@/lib/supabase";
import ProfileFields from "./profile-fields";
import Modal from "./modal";
export default function ProfileEditor({
  user,
  onSaved,
  onClose,
}: {
  user: User;
  onSaved: (u: User) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<StudentProfile>({
    display_name: user.user_metadata.display_name || "",
    university: user.user_metadata.university || "",
    major: user.user_metadata.major || "",
    study_year: user.user_metadata.study_year || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Your student profile"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const invalid = profileError(value);
          if (invalid) {
            setError(invalid);
            return;
          }
          setBusy(true);
          setError("");
          try {
            const { data, error } = await db().auth.updateUser({
              data: Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, v.trim()]),
              ),
            });
            if (error) throw error;
            onSaved(data.user);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not save profile.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">
          Your school and major help make this space yours. They are private to
          your account.
        </p>
        <ProfileFields value={value} onChange={setValue} />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
