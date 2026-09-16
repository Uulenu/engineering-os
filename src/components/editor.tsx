"use client";
import { useState } from "react";
import {
  Data,
  Row,
  Table,
  days,
  meetingWarnings,
  minutes,
  overlap,
} from "@/lib/model";
import { defaults, fields, nouns, Field } from "@/lib/forms";
import Modal from "./modal";
export default function Editor({
  table,
  row,
  data,
  semesterId,
  onSave,
  onClose,
  onDelete,
}: {
  table: Table;
  row?: Partial<Row>;
  data: Data;
  semesterId: string;
  onSave: (
    table: Table,
    payload: Partial<Row>,
    meetings?: Partial<Row>[],
  ) => Promise<void>;
  onClose: () => void;
  onDelete?: (table: Table, row: Row) => void;
}) {
  const [value, setValue] = useState<Partial<Row>>({
    ...defaults[table],
    ...row,
  });
  const [meetings, setMeetings] = useState<Partial<Row>[]>(
    table === "courses"
      ? data.class_meetings.filter((m) => m.course_id === row?.id)
      : [],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [allow, setAllow] = useState(false);
  const courses = data.courses.filter((c) => c.semester_id === semesterId);
  function field(
    f: Field,
    v: Partial<Row>,
    change: (k: string, v: string | number) => void,
    prefix = "",
  ) {
    const id = `${prefix}${f.key}`;
    return (
      <label
        key={id}
        htmlFor={id}
        className={f.type === "textarea" ? "wide" : ""}
      >
        {f.label}
        {f.required && <span aria-hidden="true"> *</span>}
        {f.options || f.type === "course" || f.type === "day" ? (
          <select
            id={id}
            required={f.required}
            value={String(v[f.key] ?? "")}
            onChange={(e) =>
              change(
                f.key,
                f.type === "day" ? Number(e.target.value) : e.target.value,
              )
            }
          >
            {f.type === "course" ? (
              <>
                <option value="">
                  {f.required ? "Choose a course" : "No course"}
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </>
            ) : f.type === "day" ? (
              days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))
            ) : (
              f.options?.map((o) => <option key={o}>{o}</option>)
            )}
          </select>
        ) : f.type === "textarea" ? (
          <textarea
            id={id}
            maxLength={5000}
            rows={3}
            value={String(v[f.key] ?? "")}
            onChange={(e) => change(f.key, e.target.value)}
          />
        ) : (
          <input
            id={id}
            type={f.type || "text"}
            required={f.required}
            min={f.min}
            max={f.max}
            step={f.step}
            maxLength={f.key === "code" ? 30 : 200}
            value={String(v[f.key] ?? "").slice(
              0,
              f.type === "time" ? 5 : undefined,
            )}
            onChange={(e) =>
              change(
                f.key,
                f.type === "number" && e.target.value !== ""
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  }
  const change = (k: string, v: string | number) => {
    setValue({ ...value, [k]: v });
    setAllow(false);
  };
  const warnings: string[] = [];
  if (table === "class_meetings")
    warnings.push(
      ...meetingWarnings(
        data.class_meetings.filter((m) => m.semester_id === semesterId),
        value as Row,
      ),
    );
  if (table === "courses")
    meetings.forEach((m, i) =>
      warnings.push(
        ...meetingWarnings(
          [
            ...data.class_meetings.filter(
              (x) => x.semester_id === semesterId && x.course_id !== row?.id,
            ),
            ...meetings
              .filter((_, j) => j !== i)
              .map((x, j) => ({
                ...x,
                id: `draft-${j}`,
                course_id: row?.id || "new",
              })),
          ] as Row[],
          { ...m, id: `current-${i}`, course_id: row?.id || "new" } as Row,
        ),
      ),
    );
  if (
    table === "study_sessions" &&
    value.date &&
    value.start_time &&
    value.end_time
  ) {
    const day = new Date(`${value.date}T12:00:00+08:00`).getUTCDay();
    if (
      data.class_meetings.some(
        (m) =>
          m.semester_id === semesterId &&
          m.day === day &&
          overlap(m.start_time, m.end_time, value.start_time, value.end_time),
      ) ||
      data.study_sessions.some(
        (s) =>
          s.id !== row?.id &&
          s.semester_id === semesterId &&
          s.date === value.date &&
          s.status !== "skipped" &&
          overlap(s.start_time, s.end_time, value.start_time, value.end_time),
      )
    )
      warnings.push(
        "Schedule conflict: this session overlaps another class or study session.",
      );
  }
  const duplicate = warnings.some((w) => w.startsWith("Duplicate"));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    for (const f of fields[table])
      if (
        f.required &&
        (value[f.key] === undefined || String(value[f.key]).trim() === "")
      )
        return setError(`Enter ${f.label.toLowerCase()}.`);
    if (
      value.start_time &&
      minutes(value.end_time) <= minutes(value.start_time)
    )
      return setError("End time must be after start time.");
    if (
      meetings.some(
        (m) =>
          !m.start_time ||
          !m.end_time ||
          minutes(m.end_time) <= minutes(m.start_time),
      )
    )
      return setError("Every meeting needs an end time after its start time.");
    if (
      table === "semesters" &&
      value.start_date &&
      value.end_date &&
      value.end_date < value.start_date
    )
      return setError("Semester end date must be after its start date.");
    if (
      table === "progress" &&
      value.gpa !== "" &&
      value.gpa != null &&
      Number(value.gpa) > Number(value.gpa_scale)
    )
      return setError("GPA cannot exceed the GPA scale.");
    if (
      table === "progress" &&
      (value.gpa == null || value.gpa === "") &&
      (value.attendance == null || value.attendance === "")
    )
      return setError("Enter GPA or attendance to save a progress entry.");
    if (duplicate || (warnings.length && !allow))
      return setError(
        duplicate
          ? "Remove the duplicate meeting before saving."
          : "Review the conflict and confirm below to save anyway.",
      );
    const payload: Partial<Row> = { ...value };
    for (const f of fields[table]) {
      if (typeof payload[f.key] === "string")
        payload[f.key] = String(payload[f.key]).trim();
      if (
        !f.required &&
        ["date", "number", "course"].includes(f.type || "") &&
        payload[f.key] === ""
      )
        payload[f.key] = null;
    }
    setBusy(true);
    try {
      await onSave(table, payload, table === "courses" ? meetings : undefined);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your changes are still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${row?.id ? "Edit" : "Add"} ${nouns[table]}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <p className="muted form-intro">
          {table === "courses"
            ? "One course can have multiple lectures, seminars, and labs."
            : table === "progress"
              ? "Optional manual tracking. Only values you enter are shown."
              : "Changes sync to your account. All times are Ulaanbaatar time."}
        </p>
        <div className="form-grid">
          {fields[table].map((f) => field(f, value, change))}
        </div>
        {table === "courses" && (
          <section className="meeting-fields">
            <h3>Weekly meetings</h3>
            {meetings.map((m, i) => (
              <fieldset key={i}>
                <legend>Meeting {i + 1}</legend>
                <div className="form-grid">
                  {fields.class_meetings
                    .filter((f) => f.key !== "course_id")
                    .map((f) =>
                      field(
                        f,
                        m,
                        (k, v) => {
                          setMeetings(
                            meetings.map((x, j) =>
                              j === i ? { ...x, [k]: v } : x,
                            ),
                          );
                          setAllow(false);
                        },
                        `m${i}-`,
                      ),
                    )}
                </div>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() =>
                    setMeetings(meetings.filter((_, j) => j !== i))
                  }
                >
                  Remove meeting {i + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={() =>
                setMeetings([...meetings, { ...defaults.class_meetings }])
              }
            >
              + Add weekly meeting
            </button>
          </section>
        )}
        {warnings.length > 0 && (
          <div className="warning" role="status">
            {[...new Set(warnings)].map((w) => (
              <p key={w}>{w}</p>
            ))}
            {!duplicate && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={allow}
                  onChange={(e) => setAllow(e.target.checked)}
                />
                Save anyway — I have reviewed the conflict
              </label>
            )}
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          {row?.id && onDelete && (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => onDelete(table, row as Row)}
            >
              Delete
            </button>
          )}
          <span className="flex-1" />
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy || duplicate}
            type="submit"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
