import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clock,
  emptyData,
  meetingWarnings,
  overdue,
  suggestions,
  overlap,
  Row,
} from "../src/lib/model";
const row = (x: Partial<Row>) => ({ id: "x", user_id: "u", ...x }) as Row;
test("Ulaanbaatar date rollover and overdue boundaries", () => {
  assert.deepEqual(clock(new Date("2026-09-18T16:05:00Z")), {
    date: "2026-09-19",
    time: "00:05",
    day: 6,
  });
  assert.equal(
    overdue(
      row({ due_date: "2026-09-19", due_time: "00:01", status: "open" }),
      { date: "2026-09-19", time: "00:05", day: 6 },
    ),
    true,
  );
  assert.equal(
    overdue(row({ due_date: "2026-09-18", status: "completed" }), {
      date: "2026-09-19",
      time: "00:05",
      day: 6,
    }),
    false,
  );
});
test("planner uses free days, priority and deadlines without overlaps", () => {
  const data = emptyData();
  const sem = row({ id: "s" });
  data.courses = [
    row({ id: "electronics", semester_id: "s", priority: 1 }),
    row({ id: "math", semester_id: "s", priority: 2 }),
    row({ id: "physics", semester_id: "s", priority: 3 }),
  ];
  data.class_meetings = [
    row({
      semester_id: "s",
      course_id: "electronics",
      day: 2,
      start_time: "10:00",
      end_time: "13:00",
    }),
  ];
  data.study_sessions = [
    row({
      id: "manual",
      semester_id: "s",
      course_id: "math",
      date: "2026-09-21",
      start_time: "10:00",
      end_time: "12:00",
      status: "planned",
    }),
  ];
  let plans = suggestions(data, sem, {
    date: "2026-09-19",
    time: "08:00",
    day: 6,
  });
  assert.equal(plans[0].course_id, "electronics");
  assert.equal(plans[0].start_time, "10:00");
  assert.equal(plans[0].end_time, "12:00");
  assert.ok(
    plans.every(
      (s) =>
        !data.study_sessions.some(
          (m) =>
            m.date === s.date &&
            overlap(s.start_time, s.end_time, m.start_time, m.end_time),
        ),
    ),
  );
  const tue = plans.find((s) => s.date === "2026-09-22")!;
  assert.ok(!overlap(tue.start_time, tue.end_time, "10:00", "13:00"));
  data.exams = [
    row({
      semester_id: "s",
      course_id: "physics",
      date: "2026-09-20",
      time: "11:00",
      status: "scheduled",
    }),
  ];
  plans = suggestions(data, sem, { date: "2026-09-19", time: "08:00", day: 6 });
  assert.equal(plans[0].course_id, "physics");
  assert.ok(
    plans.every(
      (s) => String(s.start_time) >= "10:00" && String(s.end_time) <= "20:00",
    ),
  );
});
test("duplicate warnings and adjacency rules", () => {
  const a = row({
    id: "a",
    course_id: "c",
    day: 4,
    start_time: "12:40:00",
    end_time: "14:10:00",
  });
  assert.match(
    meetingWarnings(
      [a],
      row({
        id: "b",
        course_id: "c",
        day: 4,
        start_time: "12:40",
        end_time: "14:10",
      }),
    )[0],
    /Duplicate/,
  );
  assert.equal(
    meetingWarnings(
      [a],
      row({
        id: "b",
        course_id: "c",
        day: 4,
        start_time: "14:10",
        end_time: "15:40",
      }),
    ).length,
    0,
  );
});
