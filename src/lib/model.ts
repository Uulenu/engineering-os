export const tables = [
  "semesters",
  "courses",
  "class_meetings",
  "assignments",
  "exams",
  "study_sessions",
  "projects",
  "progress",
] as const;
export type Table = (typeof tables)[number];
export type Row = {
  id: string;
  user_id: string;
  semester_id?: string;
  course_id?: string | null;
  created_at?: string;
  [key: string]: string | number | boolean | null | undefined;
};
export type Data = Record<Table, Row[]>;
export const emptyData = (): Data => ({
  semesters: [],
  courses: [],
  class_meetings: [],
  assignments: [],
  exams: [],
  study_sessions: [],
  projects: [],
  progress: [],
});
export const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const timezone = "Asia/Ulaanbaatar";
export function clock(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (k: string) => p.find((x) => x.type === k)!.value;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    date,
    time: `${get("hour")}:${get("minute")}`,
    day: new Date(`${date}T12:00:00+08:00`).getUTCDay(),
  };
}
export function minutes(t: unknown) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
}
export function time(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function dateAdd(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function formatDate(date: unknown) {
  return date
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: timezone,
      }).format(new Date(`${String(date).slice(0, 10)}T12:00:00+08:00`))
    : "No date";
}
export function label(row: Row) {
  return String(row.title || row.name || row.code || "Item");
}
export function isPast(r: Row, now = clock()) {
  return (
    String(r.date) < now.date ||
    (r.date === now.date && String(r.time || "23:59").slice(0, 5) < now.time)
  );
}
export function overdue(r: Row, now = clock()) {
  return (
    r.status !== "completed" &&
    (String(r.due_date) < now.date ||
      (r.due_date === now.date &&
        String(r.due_time || "23:59").slice(0, 5) < now.time))
  );
}
export function overlap(
  aStart: unknown,
  aEnd: unknown,
  bStart: unknown,
  bEnd: unknown,
) {
  return minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);
}
export function meetingWarnings(meetings: Row[], candidate: Row) {
  return meetings
    .filter(
      (m) =>
        m.id !== candidate.id &&
        Number(m.day) === Number(candidate.day) &&
        overlap(
          m.start_time,
          m.end_time,
          candidate.start_time,
          candidate.end_time,
        ),
    )
    .map((m) =>
      m.course_id === candidate.course_id &&
      m.start_time?.toString().slice(0, 5) ===
        candidate.start_time?.toString().slice(0, 5) &&
      m.end_time?.toString().slice(0, 5) ===
        candidate.end_time?.toString().slice(0, 5)
        ? "Duplicate meeting: this course already has the same day and time."
        : `Schedule conflict: overlaps ${String(m.start_time).slice(0, 5)}–${String(m.end_time).slice(0, 5)}.`,
    );
}
export function suggestions(
  data: Data,
  semester: Row,
  now = clock(),
  rotation = 0,
): Partial<Row>[] {
  const courses = data.courses.filter((c) => c.semester_id === semester.id);
  if (!courses.length) return [];
  const meetings = data.class_meetings.filter(
    (m) => m.semester_id === semester.id,
  );
  const sessions = data.study_sessions.filter(
    (s) => s.semester_id === semester.id,
  );
  const result: Partial<Row>[] = [];
  const load = new Map<string, number>();
  for (let offset = 0; offset < 7; offset++) {
    const date = dateAdd(now.date, offset);
    if (
      (semester.start_date && date < String(semester.start_date)) ||
      (semester.end_date && date > String(semester.end_date))
    )
      continue;
    const day = new Date(`${date}T12:00:00+08:00`).getUTCDay();
    const daily = meetings.filter((m) => Number(m.day) === day);
    const busy = [
      ...daily.map((m) => [
        minutes(m.start_time) - 10,
        minutes(m.end_time) + 10,
      ]),
      ...sessions
        .filter(
          (s) =>
            s.date === date &&
            s.status !== "skipped" &&
            s.status !== "suggested",
        )
        .map((s) => [minutes(s.start_time) - 10, minutes(s.end_time) + 10]),
      ...data.exams
        .filter(
          (e) =>
            e.semester_id === semester.id &&
            e.date === date &&
            e.status !== "archived",
        )
        .map((e) => [minutes(e.time) - 30, minutes(e.time) + 120]),
    ];
    const duration = daily.length ? 60 : 120;
    let start = 600;
    if (offset === 0)
      start = Math.max(start, Math.ceil((minutes(now.time) + 15) / 10) * 10);
    while (
      start + duration <= 1200 &&
      busy.some(([a, b]) => start < b && a < start + duration)
    )
      start += 10;
    if (start + duration > 1200) continue;
    const ranked = courses
      .map((c) => {
        const upcoming = [
          ...data.assignments
            .filter((a) => a.course_id === c.id && a.status !== "completed")
            .map((a) => String(a.due_date)),
          ...data.exams
            .filter(
              (e) =>
                e.course_id === c.id &&
                !isPast(e, now) &&
                e.status !== "archived",
            )
            .map((e) => String(e.date)),
        ]
          .filter((d) => d >= date && d <= dateAdd(date, 7))
          .sort();
        return {
          c,
          deadline: upcoming[0],
          score:
            (6 - Number(c.priority || 5)) * 10 +
            (upcoming.length ? 65 : 0) -
            (load.get(c.id) || 0) * 25,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          ((courses.indexOf(a.c) + rotation) % courses.length) -
            ((courses.indexOf(b.c) + rotation) % courses.length),
      );
    const chosen = ranked.find(
      ({ c }) =>
        !sessions.some(
          (s) =>
            s.date === date && s.course_id === c.id && s.status === "skipped",
        ),
    );
    if (!chosen) continue;
    load.set(chosen.c.id, (load.get(chosen.c.id) || 0) + 1);
    result.push({
      semester_id: semester.id,
      course_id: chosen.c.id,
      title: chosen.deadline
        ? `Prepare for ${formatDate(chosen.deadline)}`
        : daily.length
          ? "Review + practice problems"
          : "Deep study · concepts + practice",
      date,
      start_time: time(start),
      end_time: time(start + duration),
      status: "suggested",
      source: "suggested",
      notes: chosen.deadline
        ? "Upcoming deadline boosts this subject’s priority."
        : `Priority ${chosen.c.priority || 5} · ${daily.length ? "fits around classes" : "longer block on a free class day"}.`,
    });
  }
  return result;
}
