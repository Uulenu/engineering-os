"use client";
import { universities, StudentProfile } from "@/lib/universities";
export default function ProfileFields({
  value,
  onChange,
}: {
  value: StudentProfile;
  onChange: (value: StudentProfile) => void;
}) {
  const set = (key: keyof StudentProfile, v: string) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="profile-fields">
      <label>
        Your name
        <input
          required
          autoComplete="name"
          maxLength={80}
          value={value.display_name}
          onChange={(e) => set("display_name", e.target.value)}
        />
      </label>
      <label>
        University
        <input
          required
          list="universities"
          autoComplete="organization"
          placeholder="Choose a school or type your own"
          maxLength={160}
          value={value.university}
          onChange={(e) => set("university", e.target.value)}
        />
        <datalist id="universities">
          {universities.map((u) => (
            <option key={u.short} value={u.name}>
              {u.short}
            </option>
          ))}
        </datalist>
        <small>Search Mongolian universities, or enter any other school.</small>
      </label>
      <div className="form-grid">
        <label>
          Major / field of study
          <input
            required
            maxLength={120}
            placeholder="e.g. Medicine, Business, Design"
            value={value.major}
            onChange={(e) => set("major", e.target.value)}
          />
        </label>
        <label>
          Study year (optional)
          <select
            value={value.study_year}
            onChange={(e) => set("study_year", e.target.value)}
          >
            <option value="">Prefer not to say</option>
            {["1", "2", "3", "4", "5", "6+", "Postgraduate"].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
