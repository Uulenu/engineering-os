"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Modal from "./modal";
import {
  blankRow,
  dayNames,
  ImportRow,
  importPayload,
  validateImport,
  mergeImportRows,
} from "@/lib/import-model";
import { readTimetable, FileResult } from "@/lib/read-timetable";
import { Row } from "@/lib/model";
import { db } from "@/lib/supabase";
export default function TimetableImport({
  semesterId,
  courses,
  meetings,
  onClose,
  onSaved,
}: {
  semesterId: string;
  courses: Row[];
  meetings: Row[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]),
    [files, setFiles] = useState<FileResult[]>([]),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [reviewed, setReviewed] = useState(false);
  const errors = validateImport(rows);
  const duplicateCodes = rows
    .filter((r) =>
      courses.some(
        (c) => String(c.code).toUpperCase() === r.code.trim().toUpperCase(),
      ),
    )
    .map((r) => r.code);
  const all = [
    ...meetings.map((m) => ({
      day: String(m.day),
      start_time: String(m.start_time).slice(0, 5),
      end_time: String(m.end_time).slice(0, 5),
    })),
    ...rows,
  ];
  const overlaps = rows.some(
    (r, i) =>
      r.day !== "" &&
      all.some(
        (m, j) =>
          j !== meetings.length + i &&
          r.day === m.day &&
          r.start_time < m.end_time &&
          m.start_time < r.end_time,
      ),
  );
  async function upload(selected: FileList | null) {
    if (!selected?.length) return;
    if (selected.length > 5) {
      setError("Choose up to 5 files at a time.");
      return;
    }
    setBusy(true);
    setError("");
    setReviewed(false);
    try {
      for (const file of Array.from(selected)) {
        setStatus(`Reading ${file.name}…`);
        const result = await readTimetable(file, setStatus);
        setFiles((prev) => [...prev, result]);
        setRows((prev) => mergeImportRows([...prev, ...result.rows]));
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not read this file. Try the CSV template.",
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }
  async function save() {
    if (errors.length || duplicateCodes.length || !reviewed) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await db().rpc("import_timetable", {
        sid: semesterId,
        items: importPayload(rows),
        allow_conflicts: overlaps,
      });
      if (error) throw error;
      await onSaved();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Import failed. No rows were saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(i: number, key: keyof ImportRow, value: string) {
    setReviewed(false);
    setRows((prev) => {
      const code = prev[i].code.trim().toUpperCase();
      const shared = ["name", "credits", "priority"].includes(key) && !!code;
      return prev.map((r, j) =>
        j === i || (shared && r.code.trim().toUpperCase() === code)
          ? { ...r, [key]: value }
          : r,
      );
    });
  }
  return (
    <Modal
      title="Import your timetable"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="import-flow">
        <p className="muted">
          Upload your course list and timetable. Review the details, then add
          them to this semester. Existing courses stay unchanged.
        </p>
        <label className="upload-zone">
          {busy ? status : "Choose timetable files"}
          <input
            aria-label="Timetable files"
            type="file"
            accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg,.webp"
            multiple
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <small>
            Photos · PDF · CSV · Excel (XLSX). Up to 10 MB per file; 8 PDF
            pages.
          </small>
        </label>
        <p className="caption muted">
          Files are read on your device. Only the course details you confirm are
          saved.{" "}
          <a href="/timetable-template.csv" download>
            Download CSV template ↗
          </a>
        </p>
        {busy && <p role="status">{status || "Saving…"}</p>}
        {files.map((f, i) => (
          <details key={i} open={files.length === 1}>
            <summary>Source {i + 1} · View original and extracted text</summary>
            <p className="warning">{f.notice}</p>
            {f.previews.map((src, j) => (
              <img
                className="import-preview"
                key={j}
                src={src}
                alt={`Uploaded timetable, page ${j + 1}`}
              />
            ))}
            <pre className="extracted-text">{f.text}</pre>
          </details>
        ))}
        <h3>Review courses & weekly meetings</h3>
        <p className="caption muted">
          One row per meeting. Repeat the course code for another meeting. Leave
          day and times blank for a course without a schedule. Priority 1 is
          highest. Name, credits and priority edits apply to all rows with that
          course code.
        </p>
        {rows.map((r, i) => (
          <fieldset key={i} className="import-row" disabled={busy}>
            <legend>Row {i + 1}</legend>
            <div className="form-grid">
              {(
                [
                  ["code", "Course code"],
                  ["name", "Course name"],
                  ["credits", "Credits"],
                ] as const
              ).map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input
                    aria-label={`${l} ${i + 1}`}
                    value={r[k]}
                    onChange={(e) => edit(i, k, e.target.value)}
                    maxLength={k === "name" ? 200 : 30}
                  />
                </label>
              ))}
              <label>
                Priority
                <select
                  aria-label={`Priority ${i + 1}`}
                  value={r.priority}
                  onChange={(e) => edit(i, "priority", e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Day
                <select
                  aria-label={`Day ${i + 1}`}
                  value={r.day}
                  onChange={(e) => edit(i, "day", e.target.value)}
                >
                  <option value="">No meeting</option>
                  {dayNames.map((d, j) => (
                    <option value={j} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type
                <select
                  value={r.type}
                  aria-label={`Type ${i + 1}`}
                  onChange={(e) => edit(i, "type", e.target.value)}
                >
                  {["Lecture", "Seminar", "Lab"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <input
                  type="time"
                  aria-label={`Start ${i + 1}`}
                  value={r.start_time}
                  onChange={(e) => edit(i, "start_time", e.target.value)}
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  aria-label={`End ${i + 1}`}
                  value={r.end_time}
                  onChange={(e) => edit(i, "end_time", e.target.value)}
                />
              </label>
              <label>
                Room
                <input
                  value={r.room}
                  aria-label={`Room ${i + 1}`}
                  maxLength={120}
                  onChange={(e) => edit(i, "room", e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                setRows(rows.filter((_, j) => i !== j));
                setReviewed(false);
              }}
            >
              Remove row {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          disabled={busy || rows.length >= 500}
          onClick={() => {
            setRows([...rows, blankRow()]);
            setReviewed(false);
          }}
        >
          + Add review row
        </button>
        {rows.length > 0 && errors.length > 0 && (
          <div role="status" className="warning">
            {errors.slice(0, 6).map((s, i) => (
              <p key={i}>{s}</p>
            ))}
            {errors.length > 6 && (
              <p>And {errors.length - 6} more fields to review.</p>
            )}
          </div>
        )}
        {!!duplicateCodes.length && (
          <p role="alert" className="error">
            Already in this semester: {[...new Set(duplicateCodes)].join(", ")}.
            Remove these import rows and edit the existing courses instead.
          </p>
        )}
        {overlaps && (
          <p className="warning">
            Some meetings overlap. Correct their times, or confirm below to keep
            the overlaps.
          </p>
        )}
        {rows.length > 0 && (
          <label className="check-line">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={busy}
            />
            I checked every course and time
            {overlaps ? ", and want to keep these overlaps" : ""}.
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={
              busy || !reviewed || !!errors.length || !!duplicateCodes.length
            }
            onClick={() => void save()}
          >
            Import {new Set(rows.map((r) => r.code.trim().toUpperCase())).size}{" "}
            courses
          </button>
        </footer>
      </div>
    </Modal>
  );
}
