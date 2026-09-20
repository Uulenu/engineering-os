import Papa from "papaparse";
export type ImportRow = {
  code: string;
  name: string;
  credits: string;
  priority: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  type: string;
};
export const blankRow = (): ImportRow => ({
  code: "",
  name: "",
  credits: "",
  priority: "3",
  day: "",
  start_time: "",
  end_time: "",
  room: "",
  type: "Lecture",
});
const aliases: Record<keyof ImportRow, string[]> = {
  code: ["code", "coursecode", "хичээлийнкод", "код"],
  name: ["name", "course", "coursename", "хичээл", "хичээлийннэр", "нэр"],
  credits: ["credits", "credit", "кредит", "багццаг"],
  priority: ["priority", "эрэмбэ"],
  day: ["day", "weekday", "өдөр", "гараг"],
  start_time: ["start", "starttime", "start_time", "эхлэх"],
  end_time: ["end", "endtime", "end_time", "дуусах"],
  room: ["room", "location", "өрөө", "танхим"],
  type: ["type", "classtype", "төрөл"],
};
export const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const mnDays = ["ням", "даваа", "мягмар", "лхагва", "пүрэв", "баасан", "бямба"];
export function parseDay(s: string) {
  const v = s.trim().toLowerCase();
  if (/^[0-6]$/.test(v)) return v;
  const i = dayNames.findIndex(
    (d, i) =>
      v === d.toLowerCase() ||
      v === d.slice(0, 3).toLowerCase() ||
      v.startsWith(mnDays[i]),
  );
  return i < 0 ? "" : String(i);
}
export function parseTime(s: string) {
  const m = s.trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) return s.trim();
  let h = +m[1];
  if (m[3]) h = (h % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}
export function fromMatrix(matrix: string[][]): ImportRow[] {
  if (matrix.length > 501) throw Error("Use at most 500 rows per import.");
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s_\-]/g, "")
      .replace(/^\uFEFF/, "");
  const header = matrix.findIndex(
    (row) =>
      row.some((v) => aliases.name.some((a) => norm(a) === norm(v))) &&
      row.some((v) => aliases.code.some((a) => norm(a) === norm(v))),
  );
  if (header < 0) return fromText(matrix.map((r) => r.join(" ")).join("\n"));
  const cols = Object.fromEntries(
    Object.entries(aliases).map(([key, vals]) => [
      key,
      matrix[header].findIndex((v) => vals.some((a) => norm(a) === norm(v))),
    ]),
  ) as Record<keyof ImportRow, number>;
  return matrix
    .slice(header + 1)
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => {
      const row = blankRow();
      for (const key of Object.keys(cols) as (keyof ImportRow)[])
        if (cols[key] >= 0) row[key] = String(r[cols[key]] || "").trim();
      row.day = parseDay(row.day);
      row.start_time = parseTime(row.start_time);
      row.end_time = parseTime(row.end_time);
      row.type = /lab|лабор/i.test(row.type)
        ? "Lab"
        : /seminar|семинар/i.test(row.type)
          ? "Seminar"
          : /lecture|лекц/i.test(row.type)
            ? "Lecture"
            : row.type;
      row.code = row.code.toUpperCase();
      return row;
    });
}
export function fromCSV(text: string) {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (result.errors.some((e) => e.code === "MissingQuotes"))
    throw Error("The CSV has an unclosed quote. Check the file and try again.");
  return fromMatrix(result.data);
}
// Conservative line extraction. Unknown fields stay blank for review, never guessed.
export function fromText(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const code = line.match(/\b[A-Z]{2,8}\s?\d{2,4}[A-Z]?\b/i)?.[0];
    if (!code) continue;
    const times = [...line.matchAll(/\b\d{1,2}[:.]\d{2}\b/g)].map((x) =>
      parseTime(x[0]),
    );
    const day =
      line
        .split(/[\s,;|]+/)
        .filter((s) => !/^\d+$/.test(s))
        .map(parseDay)
        .find((x) => x !== "") || "";
    const name = line
      .replace(code, "")
      .split(/\d{1,2}[:.]\d{2}/)[0]
      .replace(
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi,
        "",
      )
      .replace(/(даваа|мягмар|лхагва|пүрэв|баасан|бямба|ням)(\s+гараг)?/gi, "")
      .replace(/^[\s,;|\-]+|[\s,;|\-]+$/g, "");
    rows.push({
      ...blankRow(),
      code: code.replace(/\s/g, "").toUpperCase(),
      name,
      day,
      start_time: times[0] || "",
      end_time: times[1] || "",
      type: /lab|лабор/i.test(line)
        ? "Lab"
        : /seminar|семинар/i.test(line)
          ? "Seminar"
          : "Lecture",
    });
  }
  if (rows.length > 500) throw Error("Use at most 500 rows per import.");
  return rows;
}
export function validateImport(rows: ImportRow[]) {
  const errors: string[] = [];
  const seen = new Set<string>();
  const courses = new Map<string, ImportRow>();
  if (!rows.length || rows.length > 500)
    errors.push("Add between 1 and 500 rows.");
  rows.forEach((r, i) => {
    const p = `Row ${i + 1}: `;
    const code = r.code.trim().toUpperCase();
    if (
      !code ||
      code.length > 30 ||
      !r.name.trim() ||
      r.name.trim().length > 200
    )
      errors.push(p + "enter a course code and name.");
    if (
      r.credits === "" ||
      !Number.isFinite(+r.credits) ||
      +r.credits < 0 ||
      +r.credits > 30
    )
      errors.push(p + "enter credits from 0 to 30.");
    if (!/^[1-5]$/.test(r.priority))
      errors.push(p + "choose a priority from 1 to 5.");
    const prev = courses.get(code);
    if (
      prev &&
      (prev.name.trim() !== r.name.trim() ||
        prev.credits !== r.credits ||
        prev.priority !== r.priority)
    )
      errors.push(
        p +
          "rows for the same course must have the same name, credits and priority.",
      );
    courses.set(code, r);
    if (r.day || r.start_time || r.end_time) {
      if (
        !/^[0-6]$/.test(r.day) ||
        ![r.start_time, r.end_time].every((t) =>
          /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
        ) ||
        r.end_time <= r.start_time
      )
        errors.push(p + "choose a day and valid start/end times.");
      if (!["Lecture", "Seminar", "Lab"].includes(r.type))
        errors.push(p + "choose the meeting type.");
      const key = [code, r.day, r.start_time, r.end_time].join("|");
      if (seen.has(key)) errors.push(p + "duplicate meeting.");
      seen.add(key);
    }
    if (r.room.length > 120) errors.push(p + "room is too long.");
  });
  if (courses.size > 100) errors.push("Import at most 100 courses at a time.");
  for (const course of importPayload(rows)) {
    if (course.meetings.length > 50)
      errors.push(`${course.code}: use at most 50 meetings per course.`);
  }
  return errors;
}
// Fill only blank course metadata when all supplied values for that code agree.
// Conflicting source values remain visible and must be corrected by the student.
export function mergeImportRows(rows: ImportRow[]): ImportRow[] {
  return rows.map((row) => {
    const code = row.code.trim().toUpperCase();
    if (!code) return row;
    const peers = rows.filter((r) => r.code.trim().toUpperCase() === code);
    const merged = { ...row };
    for (const key of ["name", "credits"] as const) {
      const values = new Set(peers.map((r) => r[key].trim()).filter(Boolean));
      if (!merged[key].trim() && values.size === 1)
        merged[key] = [...values][0];
    }
    return merged;
  });
}
export function importPayload(rows: ImportRow[]) {
  const groups = new Map<
    string,
    {
      code: string;
      name: string;
      credits: number;
      priority: number;
      meetings: {
        day: number;
        start_time: string;
        end_time: string;
        room: string;
        type: string;
      }[];
    }
  >();
  for (const r of rows) {
    const code = r.code.trim().toUpperCase();
    if (!groups.has(code))
      groups.set(code, {
        code,
        name: r.name.trim(),
        credits: +r.credits,
        priority: +r.priority,
        meetings: [],
      });
    if (r.day !== "")
      groups.get(code)!.meetings.push({
        day: +r.day,
        start_time: r.start_time,
        end_time: r.end_time,
        room: r.room.trim(),
        type: r.type,
      });
  }
  return [...groups.values()];
}
