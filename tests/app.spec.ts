import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const accounts = JSON.parse(
  readFileSync("../work/verification/accounts.json", "utf8"),
) as { email: string; password: string; id: string }[];
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split("=")),
);
const api = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
test("real account: onboarding, personal timetable upload, CRUD, planner, responsive, persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const c = api();
  await c.auth.signInWithPassword(accounts[0]);
  await c.from("semesters").delete().eq("user_id", accounts[0].id);
  await page.goto("/app");
  await page.getByLabel("Email", { exact: true }).fill(accounts[0].email);
  await page.getByLabel("Password", { exact: true }).fill(accounts[0].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Create semester", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Semester name").fill("Fall 2026");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Upload timetable",
      exact: true,
    })
    .click();
  await page.getByLabel("Timetable files").setInputFiles({name:"my-timetable.csv",mimeType:"text/csv",buffer:Buffer.from("code,name,credits,priority,day,start_time,end_time,room,type\nART101,Visual communication,3,3,Monday,09:00,10:30,Studio,Lecture\nMED101,Human anatomy,4,1,Thursday,12:40,14:10,Lab A,Lab\nMED101,Human anatomy,4,1,Saturday,09:00,10:30,Lab A,Seminar\nHIST101,Modern history,3,2,Tuesday,11:00,12:30,204,Lecture\n")});
  await expect(page.getByLabel("Course name 1")).toHaveValue("Visual communication");
  await page.getByRole("checkbox",{name:/I checked/}).check();
  await page.getByRole("button",{name:"Import 3 courses",exact:true}).click();
  await expect(page.getByText("Review your weekly plan")).toBeVisible();
  await page.getByRole("button", { name: "Finish setup" }).click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("button", { name: "Classes", exact: true }).click();
  await expect(
    page.getByText("Visual communication", { exact: true }).first(),
  ).toBeVisible();
  const { data: meetings } = await c.from("class_meetings").select("*");
  expect(meetings).toHaveLength(4);
  expect(meetings?.some((m) => m.day === 1 || m.day === 6)).toBe(true);
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await expect(
    page
      .locator(".day-column")
      .filter({ has: page.getByRole("heading", { name: /Sunday/ }) })
      .getByText("Free day"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add meeting", exact: false })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Course", { exact: false })
    .selectOption({ label: "MED101 · Human anatomy" });
  await page
    .getByRole("dialog")
    .getByLabel("Day", { exact: false })
    .selectOption("4");
  await page.getByRole("dialog").getByLabel("Start time").fill("12:40");
  await page.getByRole("dialog").getByLabel("End time").fill("14:10");
  await expect(
    page.getByText("Duplicate meeting:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await nav.getByRole("button", { name: "Assignments", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Add assignment", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: false })
    .fill("QA circuits worksheet");
  await page
    .getByRole("dialog")
    .getByLabel("Course", { exact: false })
    .selectOption({ label: "MED101 · Human anatomy" });
  await page.getByRole("dialog").getByLabel("Due date").fill("2026-09-01");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("QA circuits worksheet", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".list-row")
      .filter({ hasText: "QA circuits worksheet" })
      .getByText("Overdue", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await page
    .getByRole("button", { name: "Edit QA circuits worksheet" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Title")
    .fill("QA edited worksheet");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("QA edited worksheet", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("QA edited worksheet", { exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Exams", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Add exam", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").getByLabel("Title").fill("QA physics quiz");
  await page
    .getByRole("dialog")
    .getByLabel("Course")
    .selectOption({ label: "HIST101 · Modern history" });
  await page
    .getByRole("dialog")
    .getByLabel("Date", { exact: false })
    .fill("2026-09-01");
  await page
    .getByRole("dialog")
    .getByLabel("Time *", { exact: true })
    .fill("09:00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .locator(".list-row")
      .filter({ hasText: "QA physics quiz" })
      .getByText("Archived"),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Study", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate suggestions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Accept", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Complete", exact: true }).first(),
  ).toBeVisible();
  const { data: accepted } = await c
    .from("study_sessions")
    .select("*")
    .eq("status", "planned");
  expect(accepted).toHaveLength(1);
  await page.getByRole("button", { name: "Regenerate plan" }).click();
  await page
    .getByRole("button", { name: "Regenerate suggestions", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const { data: kept } = await c
    .from("study_sessions")
    .select("*")
    .eq("id", accepted![0].id);
  expect(kept).toHaveLength(1);
  await nav.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Add project", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Project title")
    .fill("QA sensor project");
  await page
    .getByRole("dialog")
    .getByLabel("Link (optional)", { exact: true })
    .fill("https://example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("link", { name: "Open project link" }),
  ).toHaveAttribute("href", "https://example.com");
  await nav.getByRole("button", { name: "Progress", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Add progress entry", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("GPA (optional)", { exact: true })
    .fill("4.5");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("GPA cannot exceed the GPA scale."),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByLabel("GPA (optional)", { exact: true })
    .fill("3.72");
  await page
    .getByRole("dialog")
    .getByLabel("Attendance % (optional)", { exact: true })
    .fill("94");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("GPA 3.72 / 4 · Attendance 94%")).toBeVisible();
  await nav.getByRole("button", { name: "Today", exact: true }).click();
  await page.screenshot({
    path: "../work/verification/desktop-today.png",
    fullPage: true,
  });
  for (const width of [1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../work/verification/today-${width}.png`,
      fullPage: true,
    });
  }
  const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
  await mobile.getByRole("button", { name: "Classes", exact: true }).click();
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  await page.getByRole("tab", { name: "Sun", exact: true }).click();
  await expect(page.locator(".day-active").getByText("Free day")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../work/verification/mobile-timetable.png",
    fullPage: true,
  });
  await mobile.getByRole("button", { name: "Tasks", exact: true }).click();
  await page.getByRole("button", { name: "Edit QA edited worksheet" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: "../work/verification/mobile-edit.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Delete assignment?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByText("QA edited worksheet", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("RLS prevents reading, updating, and linking another account’s data", async () => {
  const a = api(),
    b = api();
  expect((await a.auth.signInWithPassword(accounts[0])).error).toBeNull();
  expect((await b.auth.signInWithPassword(accounts[1])).error).toBeNull();
  const { data: sem } = await a.from("semesters").select("*").limit(1).single();
  const { data: course } = await a
    .from("courses")
    .select("*")
    .limit(1)
    .single();
  for (const table of [
    "semesters",
    "courses",
    "class_meetings",
    "assignments",
    "exams",
    "study_sessions",
    "projects",
    "progress",
  ]) {
    const { data, error } = await b
      .from(table)
      .select("*")
      .eq("user_id", accounts[0].id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }
  const forbidden = await b
    .from("semesters")
    .insert({ name: "Foreign owner", user_id: accounts[0].id });
  expect(forbidden.error).not.toBeNull();
  const edit = await b
    .from("courses")
    .update({ name: "Tampered" })
    .eq("id", course.id)
    .select();
  expect(edit.data).toEqual([]);
  const link = await b
    .from("assignments")
    .insert({
      semester_id: sem.id,
      course_id: course.id,
      title: "Cross account",
      due_date: "2026-10-01",
    });
  expect(link.error).not.toBeNull();
  const anon = api();
  expect((await anon.from("semesters").select()).error).not.toBeNull();
});
