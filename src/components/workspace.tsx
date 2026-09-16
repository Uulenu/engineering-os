"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/supabase";
import {
  Data,
  Row,
  Table,
  clock,
  dateAdd,
  days,
  emptyData,
  formatDate,
  isPast,
  label,
  minutes,
  overdue,
  suggestions,
  tables,
} from "@/lib/model";
import { nouns } from "@/lib/forms";
import Auth from "./auth";
import Editor from "./editor";
import Modal from "./modal";
const destinations = [
  "Today",
  "Classes",
  "Assignments",
  "Exams",
  "Study",
  "Projects",
  "Progress",
  "Semesters",
] as const;
type View = (typeof destinations)[number] | "Timetable";
const viewTable: Partial<Record<View, Table>> = {
  Classes: "courses",
  Assignments: "assignments",
  Exams: "exams",
  Study: "study_sessions",
  Projects: "projects",
  Progress: "progress",
  Semesters: "semesters",
  Timetable: "class_meetings",
};
const descriptions: Record<View, string> = {
  Today: "Your real NUM schedule",
  Classes: "Your courses, connected to the rest of your week.",
  Assignments: "Add real deadlines as your instructors give them.",
  Exams: "Add dates as soon as your instructors announce them.",
  Study: "Hybrid planner · suggested sessions + manual control",
  Projects: "Keep university and personal engineering projects in one place.",
  Progress: "A simple view of the data you actually track.",
  Semesters: "A fresh start, with your previous work kept safe.",
  Timetable: "Your actual NUM weekly class plan",
};
function Card({
  title,
  children,
  action,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="card-head">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
function Stat({
  title,
  value,
  detail,
  tone = "",
}: {
  title: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: string;
}) {
  return (
    <Card className="stat">
      <span className="caption muted">{title}</span>
      <strong className={tone}>{value}</strong>
      <span className="caption muted">{detail}</span>
    </Card>
  );
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol" aria-hidden="true">
        +
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}
export default function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("Today");
  const [semesterId, setSemesterId] = useState("");
  const [editor, setEditor] = useState<{
    table: Table;
    row?: Partial<Row>;
  } | null>(null);
  const [deleting, setDeleting] = useState<{ table: Table; row: Row } | null>(
    null,
  );
  const [quick, setQuick] = useState(false);
  const [more, setMore] = useState(false);
  const [now, setNow] = useState(clock());
  const [day, setDay] = useState(clock().day || 1);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editPlan, setEditPlan] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [onboarding, setOnboarding] = useState(0);
  const [regenerate, setRegenerate] = useState(false);
  const generation = useRef(0);
  const rotation = useRef(0);
  const client = db();
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setLoadError("");
    try {
      const results = await Promise.all(
        tables.map(async (table) => {
          const rows: Row[] = [];
          for (let start = 0; ; start += 1000) {
            const { data, error } = await db()
              .from(table)
              .select("*")
              .order("created_at", { ascending: true })
              .order("id")
              .range(start, start + 999);
            if (error) throw error;
            rows.push(...(data as Row[]));
            if (data.length < 1000) break;
          }
          return [table, rows] as const;
        }),
      );
      if (ticket !== generation.current) return;
      const next = Object.fromEntries(results) as Data;
      setData(next);
      setSemesterId((prev) => {
        let preferred = prev;
        try {
          preferred = prev || localStorage.getItem("eos-active-semester") || "";
        } catch {}
        return next.semesters.some((s) => s.id === preferred)
          ? preferred
          : next.semesters.find((s) => !s.archived)?.id ||
              next.semesters[0]?.id ||
              "";
      });
    } catch (e) {
      if (ticket === generation.current)
        setLoadError(
          e instanceof Error ? e.message : "Could not load your data.",
        );
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let live = true;
    const c = db();
    c.auth.getUser().then(({ data }) => {
      if (live) {
        setRecovery(new URLSearchParams(location.search).has("recovery"));
        if (new URLSearchParams(location.search).has("auth_error"))
          setError(
            "This email link has expired. Request a new link or sign in.",
          );
        setUser(data.user);
        setReady(true);
        if (data.user) void refresh();
      }
    });
    const { data: listener } = c.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_IN") setTimeout(() => void refresh(), 0);
      if (event === "SIGNED_OUT") {
        generation.current++;
        setData(emptyData());
        setSemesterId("");
        setEditor(null);
      }
    });
    const timer = setInterval(() => setNow(clock()), 30000);
    return () => {
      live = false;
      listener.subscription.unsubscribe();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const handle = () => {
      const v = decodeURIComponent(location.hash.slice(1)) as View;
      if ([...destinations, "Timetable"].includes(v)) setView(v);
    };
    const initial = setTimeout(handle, 0);
    window.addEventListener("hashchange", handle);
    window.addEventListener("popstate", handle);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("hashchange", handle);
      window.removeEventListener("popstate", handle);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (semesterId) {
      try {
        localStorage.setItem("eos-active-semester", semesterId);
      } catch {}
    }
  }, [semesterId]);
  const semester = data.semesters.find((s) => s.id === semesterId);
  const archived = !!semester?.archived;
  const scoped = (t: Table) =>
    t === "semesters"
      ? data.semesters
      : data[t].filter((r) => r.semester_id === semesterId);
  const courses = scoped("courses");
  const meetings = scoped("class_meetings");
  const assignments = scoped("assignments");
  const exams = scoped("exams");
  const sessions = scoped("study_sessions");
  const projects = scoped("projects");
  const course = (id: unknown) => courses.find((c) => c.id === id);
  const courseName = (id: unknown) => String(course(id)?.name || "Personal");
  const inSemester =
    !!semester &&
    (!semester.start_date || now.date >= String(semester.start_date)) &&
    (!semester.end_date || now.date <= String(semester.end_date));
  const today = meetings
    .filter((m) => m.day === now.day && inSemester)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  const next = today.find((m) => String(m.end_time).slice(0, 5) > now.time);
  const upcoming = exams
    .filter((e) => e.status !== "archived" && !isPast(e, now))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const priorities = [...courses].sort(
    (a, b) => Number(a.priority) - Number(b.priority),
  );
  const activeAssignments = assignments
    .filter((a) => a.status !== "completed")
    .sort((a, b) =>
      `${a.due_date}${a.due_time}`.localeCompare(`${b.due_date}${b.due_time}`),
    );
  const weekStart = dateAdd(now.date, -((now.day + 6) % 7) + weekOffset * 7);
  const weekly = sessions.filter(
    (s) =>
      String(s.date) >= weekStart &&
      String(s.date) <= dateAdd(weekStart, 6) &&
      ["planned", "completed"].includes(String(s.status)),
  );
  const studyMinutes = weekly.reduce(
    (a, s) => a + minutes(s.end_time) - minutes(s.start_time),
    0,
  );
  function go(v: View) {
    setView(v);
    window.history.pushState(null, "", `#${v}`);
    setMore(false);
    setFilter("all");
    setCourseFilter("");
    setSearch("");
    setEditPlan(false);
  }
  function open(table: Table, row?: Partial<Row>) {
    if (table !== "semesters" && !semester) {
      setEditor({ table: "semesters" });
      return;
    }
    if (table !== "semesters" && archived) {
      setError("Reactivate this semester before editing.");
      return;
    }
    setEditor({ table, row });
    setError("");
  }
  async function run(
    action: () => Promise<void>,
    message = "Saved · changes synced",
  ) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      setToast(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function save(
    table: Table,
    value: Partial<Row>,
    courseMeetings?: Partial<Row>[],
  ) {
    const payload: Partial<Row> = {
      ...value,
      user_id: user!.id,
      ...(table !== "semesters" ? { semester_id: semesterId } : {}),
    };
    delete payload.created_at;
    if (
      (table === "assignments" || table === "study_sessions") &&
      payload.status === "completed"
    )
      payload.completed_at = payload.completed_at || new Date().toISOString();
    else if (table === "assignments" || table === "study_sessions")
      payload.completed_at = null;
    if (table === "courses") {
      const { error } = await client.rpc("save_course", {
        payload,
        meetings: courseMeetings || [],
      });
      if (error) throw error;
    } else {
      const q = payload.id
        ? client.from(table).update(payload).eq("id", payload.id)
        : client.from(table).insert(payload);
      const { data: result, error } = await q.select();
      if (error) throw error;
      if (!result?.length)
        throw new Error(
          "This item was changed or removed. Refresh and try again.",
        );
      if (table === "semesters" && !payload.id) {
        setSemesterId(result[0].id);
        setOnboarding(2);
      }
    }
    await refresh();
    setToast("Saved · changes synced");
  }
  async function update(table: Table, row: Row, patch: Partial<Row>) {
    await run(async () => {
      const payload = { ...patch };
      if (
        (table === "assignments" || table === "study_sessions") &&
        patch.status
      )
        payload.completed_at =
          patch.status === "completed" ? new Date().toISOString() : null;
      const { data, error } = await client
        .from(table)
        .update(payload)
        .eq("id", row.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("This item is no longer available.");
    });
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await client
        .from(deleting.table)
        .delete()
        .eq("id", deleting.row.id)
        .select("id");
      if (error) throw error;
      if (!data?.length)
        throw new Error("Item already removed or unavailable.");
      setDeleting(null);
      setEditor(null);
      await refresh();
      setToast("Deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }
  async function importNum() {
    await run(async () => {
      const { error } = await client.rpc("seed_num", { sid: semesterId });
      if (error) throw error;
      setOnboarding(3);
    }, "Imported 6 NUM courses and 13 weekly meetings");
  }
  async function generate() {
    if (!semester) return;
    await run(async () => {
      const items = suggestions(data, semester, now, rotation.current++);
      const { error } = await client.rpc("replace_suggestions", {
        sid: semesterId,
        items,
      });
      if (error) throw error;
      setRegenerate(false);
    }, "Suggestions updated · accepted and manual sessions kept");
  }
  const addButton = (t: Table, text?: string) => (
    <button
      className="primary"
      disabled={archived && t !== "semesters"}
      onClick={() => open(t)}
    >
      {text || `+ Add ${nouns[t]}`}
    </button>
  );
  const priorityCard = (
    <Card title="Study priorities">
      {priorities.slice(0, 3).map((c, i) => (
        <div className="priority-row" key={c.id}>
          <span className={`rank rank-${i}`}>{i + 1}</span>
          <div>
            <strong>{c.name}</strong>
            <small className="muted">
              {i === 0
                ? "Highest focus"
                : i === 1
                  ? "Problem practice"
                  : "Concepts + problems"}
            </small>
          </div>
        </div>
      ))}
      {!courses.length && (
        <p className="muted">Add courses to set your priorities.</p>
      )}
      <p className="caption muted">Change priorities in the class editor.</p>
    </Card>
  );
  function rowActions(t: Table, r: Row) {
    return (
      <div className="row-actions">
        {t === "assignments" && (
          <button
            className="small"
            disabled={busy || archived}
            onClick={() =>
              void update(t, r, {
                status: r.status === "completed" ? "open" : "completed",
              })
            }
          >
            {r.status === "completed" ? "Reopen" : "Complete"}
          </button>
        )}
        {t === "study_sessions" && r.status === "suggested" && (
          <>
            <button
              className="small accept"
              disabled={busy || archived}
              onClick={() => void update(t, r, { status: "planned" })}
            >
              Accept
            </button>
            <button
              className="small"
              disabled={busy || archived}
              onClick={() => open(t, r)}
            >
              Move
            </button>
            <button
              className="small"
              disabled={busy || archived}
              onClick={() => void update(t, r, { status: "skipped" })}
            >
              Skip
            </button>
          </>
        )}
        {t === "study_sessions" && r.status === "planned" && (
          <button
            className="small"
            disabled={busy || archived}
            onClick={() => void update(t, r, { status: "completed" })}
          >
            Complete
          </button>
        )}
        <button
          className="small"
          disabled={archived && t !== "semesters"}
          onClick={() => open(t, r)}
          aria-label={`Edit ${label(r)}`}
        >
          Edit
        </button>
      </div>
    );
  }
  function assignmentRows(items: Row[]) {
    return items.map((a) => (
      <div
        className={`list-row ${a.status === "completed" ? "completed" : ""}`}
        key={a.id}
      >
        <div className="row-copy">
          <strong>{a.title}</strong>
          <small className="muted">
            {courseName(a.course_id)} · {formatDate(a.due_date)} ·{" "}
            {String(a.due_time).slice(0, 5)}
          </small>
        </div>
        <span
          className={`badge ${overdue(a, now) ? "red" : a.status === "completed" ? "green" : ""}`}
        >
          {overdue(a, now)
            ? "Overdue"
            : a.status === "completed"
              ? "Completed"
              : a.priority}
        </span>
        {rowActions("assignments", a)}
      </div>
    ));
  }
  if (!ready)
    return (
      <main className="loading-screen">
        <span className="brand-mark">E</span>
        <p>Opening Engineering OS…</p>
      </main>
    );
  if (!user || recovery)
    return (
      <>
        {error && (
          <div role="alert" className="error global-error">
            {error}
          </div>
        )}
        <Auth
          recovery={recovery}
          onRecovered={() => {
            setRecovery(false);
            history.replaceState(null, "", "/");
            setToast("Password updated");
          }}
        />
      </>
    );
  const greeting =
    Number(now.time.slice(0, 2)) < 12
      ? "Good morning"
      : Number(now.time.slice(0, 2)) < 18
        ? "Good afternoon"
        : "Good evening";
  const displayName = String(
    user.user_metadata?.display_name || user.email?.split("@")[0] || "Student",
  );
  return (
    <div className={`app-shell view-${view.toLowerCase()}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">E</span>Engineering OS
        </div>
        <nav aria-label="Main navigation">
          {destinations
            .filter((v) => v !== "Semesters")
            .map((v) => (
              <button
                key={v}
                className={
                  view === v || (view === "Timetable" && v === "Classes")
                    ? "selected"
                    : ""
                }
                onClick={() => go(v)}
                aria-current={view === v ? "page" : undefined}
              >
                <img
                  src={`/design/${view === v ? "nav-active" : "nav-dot"}.svg`}
                  width="7"
                  height="7"
                  alt=""
                />
                {v}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <label className="caption muted" htmlFor="semester-desktop">
            SEMESTER
          </label>
          <select
            id="semester-desktop"
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
          >
            {!data.semesters.length && <option value="">No semester</option>}
            {data.semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.archived ? " · Archived" : ""}
              </option>
            ))}
          </select>
          <button className="text-button" onClick={() => go("Semesters")}>
            Manage semesters
          </button>
          <div className="profile">
            <span className="avatar">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{displayName}</strong>
              <small className="muted">NUM · Engineering</small>
            </div>
          </div>
          <button
            className="text-button muted"
            onClick={() =>
              void run(async () => {
                const { error } = await client.auth.signOut();
                if (error) throw error;
              }, "Signed out")
            }
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="mobile-top">
        <span className="brand">Engineering OS</span>
        <select
          aria-label="Current semester"
          value={semesterId}
          onChange={(e) => setSemesterId(e.target.value)}
        >
          {!data.semesters.length && <option value="">No semester</option>}
          {data.semesters.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <main id="main" className="main-content">
        <header className="page-header">
          <div>
            <h1>
              {view === "Today" ? (
                <>
                  {greeting}
                  <span className="desktop-greeting">, {displayName}</span>
                </>
              ) : view === "Timetable" && editPlan ? (
                "Edit timetable"
              ) : (
                view
              )}
            </h1>
            <p className="muted">
              {view === "Today"
                ? `${days[now.day]} · ${formatDate(now.date)} · Ulaanbaatar`
                : descriptions[view]}
            </p>
          </div>
          <div className="header-actions">
            {view === "Today" ? (
              <button
                onClick={() => setQuick(true)}
                disabled={!semester || archived}
              >
                + Quick add
              </button>
            ) : (
              <>
                {view === "Study" && (
                  <button
                    disabled={busy || archived || !courses.length}
                    onClick={() => setRegenerate(true)}
                  >
                    Regenerate plan
                  </button>
                )}
                {view === "Classes" && (
                  <button onClick={() => go("Timetable")}>Timetable</button>
                )}
                {view === "Timetable" && (
                  <button
                    onClick={() => setEditPlan(!editPlan)}
                    disabled={archived}
                  >
                    {editPlan ? "Done editing" : "Edit plan"}
                  </button>
                )}
                {viewTable[view] && addButton(viewTable[view]!)}
              </>
            )}
          </div>
        </header>
        {error && (
          <div role="alert" className="error banner">
            {error}
            <button className="text-button" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}
        {loadError && (
          <div role="alert" className="error banner">
            Couldn’t load your data. {loadError}
            <button onClick={() => void refresh()}>Retry</button>
          </div>
        )}
        {loading && !data.semesters.length ? (
          <div className="skeleton-grid" aria-label="Loading data">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton" />
            ))}
          </div>
        ) : (
          <>
            {!semester && view !== "Semesters" ? (
              <Card>
                <Empty
                  title="Your semester starts here"
                  description="Create a semester, add your courses, then build your weekly timetable."
                  action={
                    <button
                      className="primary"
                      onClick={() => {
                        setOnboarding(1);
                        open("semesters");
                      }}
                    >
                      Create semester
                    </button>
                  }
                />
                <ol className="setup-steps">
                  <li>1 · Semester</li>
                  <li>2 · Courses</li>
                  <li>3 · Timetable</li>
                </ol>
              </Card>
            ) : (
              <>
                {archived && (
                  <div className="warning banner">
                    Archived semester · read-only
                    <button
                      onClick={() =>
                        void update("semesters", semester!, { archived: false })
                      }
                    >
                      Reactivate semester
                    </button>
                  </div>
                )}
                {semester && onboarding >= 2 && (
                  <Card className="onboarding">
                    <div>
                      <span className="eyebrow">STEP {onboarding} OF 3</span>
                      <h2>
                        {onboarding === 2
                          ? "Add your real courses"
                          : "Review your weekly plan"}
                      </h2>
                      <p className="muted">
                        {onboarding === 2
                          ? "Import your 6 NUM courses and 13 meetings, or start with an empty timetable."
                          : "Your schedule is editable. Monday and Saturday have no seeded classes."}
                      </p>
                    </div>
                    <div className="row-actions">
                      {onboarding === 2 && courses.length === 0 && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => void importNum()}
                        >
                          Import NUM courses + timetable
                        </button>
                      )}
                      {onboarding === 2 && (
                        <button onClick={() => open("courses")}>
                          Add a course
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (onboarding === 2) {
                            setOnboarding(3);
                            go("Timetable");
                          } else {
                            setOnboarding(0);
                            go("Today");
                          }
                        }}
                      >
                        {onboarding === 2
                          ? "Continue to timetable"
                          : "Finish setup"}
                      </button>
                    </div>
                  </Card>
                )}
                {view === "Today" && (
                  <>
                    <div className="stats-grid today-stats">
                      <Stat
                        title="Next class"
                        value={
                          next ? courseName(next.course_id) : "No more classes"
                        }
                        detail={
                          next
                            ? `${String(next.start_time).slice(0, 5)} · ${next.room || "Room not set"}`
                            : today.length
                              ? "Your classes are done for today"
                              : "A free class day"
                        }
                        tone="blue"
                      />
                      <Stat
                        title="Assignments"
                        value={`${activeAssignments.length} open`}
                        detail={
                          activeAssignments.some((a) => overdue(a, now))
                            ? `${activeAssignments.filter((a) => overdue(a, now)).length} overdue`
                            : "Add deadlines when you get them"
                        }
                      />
                      <Stat
                        title="Exams"
                        value={
                          upcoming.length
                            ? formatDate(upcoming[0].date)
                            : "Not scheduled"
                        }
                        detail={
                          upcoming.length
                            ? label(upcoming[0])
                            : "Add dates when announced"
                        }
                        tone="orange"
                      />
                      <Stat
                        title="Study priority"
                        value={priorities[0]?.code || "Not set"}
                        detail={priorities
                          .slice(1, 3)
                          .map((c) => c.code)
                          .join(" · ")}
                        tone="green-text"
                      />
                    </div>
                    <div className="two-columns">
                      <div className="stack">
                        <Card
                          title="Today’s schedule"
                          action={
                            <button
                              className="text-button"
                              onClick={() => go("Timetable")}
                            >
                              Open timetable
                            </button>
                          }
                        >
                          {today.length ? (
                            today.map((m) => (
                              <div className="schedule-row" key={m.id}>
                                <span className="time-chip">
                                  {String(m.start_time).slice(0, 5)}–
                                  {String(m.end_time).slice(0, 5)}
                                </span>
                                <div>
                                  <strong>{courseName(m.course_id)}</strong>
                                  <small className="muted">
                                    {m.type} ·{" "}
                                    {m.room ? `${m.room} тоот` : "Room not set"}
                                  </small>
                                </div>
                                {String(m.start_time).slice(0, 5) <= now.time &&
                                  String(m.end_time).slice(0, 5) > now.time && (
                                    <span className="badge blue">Now</span>
                                  )}
                              </div>
                            ))
                          ) : (
                            <div className="free-day">
                              <h3>
                                {inSemester
                                  ? "No classes today"
                                  : "No classes in this semester today"}
                              </h3>
                              <p className="muted">
                                {inSemester
                                  ? "Make room for deeper study or take time to rest."
                                  : "Check the semester dates or switch to your current semester."}
                              </p>
                              <button
                                className="text-button"
                                onClick={() => go("Study")}
                              >
                                Plan study time →
                              </button>
                            </div>
                          )}
                        </Card>
                        <Card
                          title="Assignments"
                          action={
                            <button
                              className="text-button"
                              onClick={() => go("Assignments")}
                            >
                              View all
                            </button>
                          }
                        >
                          {activeAssignments.length ? (
                            assignmentRows(activeAssignments.slice(0, 4))
                          ) : (
                            <>
                              <p>No assignments added yet.</p>
                              <p className="muted caption">
                                Add one when a teacher gives you a deadline. It
                                will automatically appear in Today and Study.
                              </p>
                            </>
                          )}
                        </Card>
                        {sessions.some(
                          (s) => s.date === now.date && s.status === "planned",
                        ) && (
                          <Card title="Planned study">
                            {sessions
                              .filter(
                                (s) =>
                                  s.date === now.date && s.status === "planned",
                              )
                              .map((s) => (
                                <div key={s.id} className="list-row">
                                  <div>
                                    <strong>{s.title}</strong>
                                    <small>
                                      {String(s.start_time).slice(0, 5)}–
                                      {String(s.end_time).slice(0, 5)} ·{" "}
                                      {courseName(s.course_id)}
                                    </small>
                                  </div>
                                  {rowActions("study_sessions", s)}
                                </div>
                              ))}
                          </Card>
                        )}
                      </div>
                      <div className="stack">
                        <Card>
                          <span className="caption muted">Next class</span>
                          <h2 className="mt-3">
                            {next
                              ? courseName(next.course_id)
                              : "You’re all clear"}
                          </h2>
                          <p className="blue text-lg">
                            {next
                              ? `${String(next.start_time).slice(0, 5)}–${String(next.end_time).slice(0, 5)}`
                              : "No classes remaining"}
                          </p>
                          <small className="muted">
                            {next
                              ? `${next.type} · ${next.room || "Room not set"}`
                              : "Check your timetable for the rest of the week."}
                          </small>
                        </Card>
                        <Card>
                          <span className="caption muted">Suggested study</span>
                          {sessions.find(
                            (s) =>
                              s.date === now.date && s.status === "suggested",
                          ) ? (
                            <>
                              <h3 className="mt-3">
                                {label(
                                  sessions.find(
                                    (s) =>
                                      s.date === now.date &&
                                      s.status === "suggested",
                                  )!,
                                )}
                              </h3>
                              <button
                                className="text-button"
                                onClick={() => go("Study")}
                              >
                                Review suggestion →
                              </button>
                            </>
                          ) : (
                            <>
                              <h3 className="mt-3">Make a little room</h3>
                              <p className="muted caption">
                                Find study time around your real classes.
                              </p>
                              <button
                                className="text-button"
                                onClick={() => go("Study")}
                              >
                                Open planner →
                              </button>
                            </>
                          )}
                        </Card>
                        <Card>
                          <span className="caption muted">Exams</span>
                          <h3 className="mt-3">
                            {upcoming.length
                              ? label(upcoming[0])
                              : "No dates yet"}
                          </h3>
                          <p className="muted caption">
                            {upcoming.length
                              ? `${formatDate(upcoming[0].date)} · ${String(upcoming[0].time).slice(0, 5)}`
                              : "Your countdown will appear after you add one."}
                          </p>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
                {view === "Classes" && (
                  <>
                    <div className="stats-grid three">
                      <Stat
                        title="Courses"
                        value={courses.length}
                        detail="Active this semester"
                      />
                      <Stat
                        title="Credits"
                        value={courses.reduce(
                          (sum, c) => sum + Number(c.credits),
                          0,
                        )}
                        detail="From your course data"
                        tone="blue"
                      />
                      <Stat
                        title="Class days"
                        value={new Set(meetings.map((m) => m.day)).size}
                        detail="Weekly schedule"
                        tone="green-text"
                      />
                    </div>
                    <div className="two-columns">
                      <Card title="My classes">
                        {courses.length ? (
                          courses.map((c) => (
                            <div className="list-row course-row" key={c.id}>
                              <div className="row-copy">
                                <strong>{c.name}</strong>
                                <small className="muted">
                                  {c.code} · {c.credits} credits
                                  {c.professor ? ` · ${c.professor}` : ""}
                                </small>
                                <small className="muted">
                                  {meetings
                                    .filter((m) => m.course_id === c.id)
                                    .map(
                                      (m) =>
                                        `${days[Number(m.day)].slice(0, 3)} ${String(m.start_time).slice(0, 5)} ${m.type}`,
                                    )
                                    .join(" · ") || "No weekly meetings yet"}
                                </small>
                              </div>
                              <span className="badge">P{c.priority}</span>
                              {rowActions("courses", c)}
                            </div>
                          ))
                        ) : (
                          <Empty
                            title="No classes yet"
                            description="Import the verified NUM schedule or add your own courses."
                            action={
                              <div className="row-actions">
                                <button
                                  className="primary"
                                  disabled={busy || archived}
                                  onClick={() => void importNum()}
                                >
                                  Import NUM courses + timetable
                                </button>
                                {addButton("courses")}
                              </div>
                            }
                          />
                        )}
                      </Card>
                      <div className="stack">
                        {priorityCard}
                        <Card title="Weekly timetable">
                          <p className="muted">
                            {meetings.length} meetings across{" "}
                            {new Set(meetings.map((m) => m.day)).size} class
                            days.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => go("Timetable")}
                          >
                            Open timetable →
                          </button>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
                {view === "Timetable" && (
                  <>
                    <div className="stats-grid three">
                      <Stat title="Courses" value={courses.length} />
                      <Stat
                        title="Class days"
                        value={new Set(meetings.map((m) => m.day)).size}
                        tone="blue"
                      />
                      <Stat
                        title="Credits"
                        value={courses.reduce(
                          (a, c) => a + Number(c.credits),
                          0,
                        )}
                        tone="green-text"
                      />
                    </div>
                    <div className="toolbar">
                      <div className="row-actions">
                        <button
                          aria-label="Previous week"
                          onClick={() => setWeekOffset(weekOffset - 1)}
                        >
                          ←
                        </button>
                        <strong>
                          {formatDate(weekStart)} –{" "}
                          {formatDate(dateAdd(weekStart, 6))}
                        </strong>
                        <button
                          aria-label="Next week"
                          onClick={() => setWeekOffset(weekOffset + 1)}
                        >
                          →
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setWeekOffset(0)}
                        >
                          This week
                        </button>
                      </div>
                      <span className="caption muted">Ulaanbaatar time</span>
                    </div>
                    {editPlan && (
                      <p className="info">
                        Drag a meeting to another day, or select it to change
                        its time and room. Review and save each change in the
                        editor.
                      </p>
                    )}
                    <div
                      className="day-tabs"
                      role="tablist"
                      aria-label="Timetable day"
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <button
                          key={d}
                          role="tab"
                          aria-selected={day === d}
                          className={day === d ? "selected" : ""}
                          onClick={() => setDay(d)}
                        >
                          {days[d].slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <div className="timetable">
                      {[1, 2, 3, 4, 5, 6, 0].map((d, i) => {
                        const date = dateAdd(weekStart, i);
                        const valid =
                          (!semester?.start_date ||
                            date >= String(semester.start_date)) &&
                          (!semester?.end_date ||
                            date <= String(semester.end_date));
                        const blocks = valid
                          ? meetings
                              .filter((m) => m.day === d)
                              .sort((a, b) =>
                                String(a.start_time).localeCompare(
                                  String(b.start_time),
                                ),
                              )
                          : [];
                        return (
                          <section
                            key={d}
                            className={`day-column ${day === d ? "day-active" : ""} ${date === now.date ? "is-today" : ""}`}
                            onDragOver={(e) => {
                              if (editPlan) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const m = meetings.find(
                                (m) =>
                                  m.id === e.dataTransfer.getData("text/plain"),
                              );
                              if (m && editPlan)
                                open("class_meetings", { ...m, day: d });
                            }}
                          >
                            <h3>
                              {days[d]}
                              <small className="muted">
                                {formatDate(date)} ·{" "}
                                {blocks.length
                                  ? `${blocks.length} blocks`
                                  : "No classes"}
                              </small>
                            </h3>
                            {blocks.map((m) => (
                              <button
                                key={m.id}
                                className={`meeting ${String(m.type).toLowerCase()}`}
                                draggable={editPlan && !archived}
                                onDragStart={(e) =>
                                  e.dataTransfer.setData("text/plain", m.id)
                                }
                                onClick={() => open("class_meetings", m)}
                                disabled={archived}
                              >
                                <span className="meeting-time">
                                  {editPlan ? "⋮⋮ " : ""}
                                  {String(m.start_time).slice(0, 5)}–
                                  {String(m.end_time).slice(0, 5)}
                                </span>
                                <strong>{courseName(m.course_id)}</strong>
                                <small>
                                  {m.type} · {m.room || "Room not set"}
                                </small>
                              </button>
                            ))}
                            {!blocks.length && (
                              <div className="free-block">
                                <strong>
                                  {valid ? "Free day" : "Outside semester"}
                                </strong>
                                <small>
                                  {valid
                                    ? "Good for longer study blocks."
                                    : "No classes in this date range."}
                                </small>
                              </div>
                            )}
                            {editPlan && (
                              <button
                                className="small w-full"
                                onClick={() =>
                                  open("class_meetings", { day: d })
                                }
                              >
                                + Add meeting
                              </button>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  </>
                )}
                {(
                  [
                    "Assignments",
                    "Exams",
                    "Study",
                    "Projects",
                    "Progress",
                  ] as View[]
                ).includes(view) && (
                  <>
                    <div className="stats-grid three">
                      {view === "Assignments" ? (
                        <>
                          <Stat
                            title="Open"
                            value={activeAssignments.length}
                            detail="Your upcoming work"
                          />
                          <Stat
                            title="Overdue"
                            value={
                              assignments.filter((a) => overdue(a, now)).length
                            }
                            detail="Stays visible until completed"
                            tone="orange"
                          />
                          <Stat
                            title="Completed"
                            value={
                              assignments.filter(
                                (a) => a.status === "completed",
                              ).length
                            }
                            detail="Your work, recorded"
                            tone="green-text"
                          />
                        </>
                      ) : view === "Exams" ? (
                        <>
                          <Stat
                            title="Scheduled"
                            value={upcoming.length}
                            detail="Upcoming exams"
                          />
                          <Stat
                            title="Next exam"
                            value={
                              upcoming.length
                                ? `${Math.max(0, Math.ceil((new Date(`${upcoming[0].date}T${String(upcoming[0].time).slice(0, 5)}:00+08:00`).getTime() - new Date(`${now.date}T${now.time}:00+08:00`).getTime()) / 86400000))} days`
                                : "No dates yet"
                            }
                            tone="blue"
                          />
                          <Stat
                            title="Prep priority"
                            value={priorities[0]?.code || "Not set"}
                            detail={priorities[0]?.name}
                            tone="orange"
                          />
                        </>
                      ) : view === "Study" ? (
                        <>
                          <Stat
                            title="Planned this week"
                            value={`${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m`}
                            detail={`${weekly.length} accepted or manual sessions`}
                            tone="blue"
                          />
                          <Stat
                            title="Top priority"
                            value={priorities[0]?.code || "Not set"}
                            detail="From your course priorities"
                            tone="orange"
                          />
                          <Stat
                            title="Suggested"
                            value={
                              sessions.filter((s) => s.status === "suggested")
                                .length
                            }
                            detail="Review before accepting"
                            tone="green-text"
                          />
                        </>
                      ) : view === "Projects" ? (
                        <>
                          <Stat
                            title="Active"
                            value={
                              projects.filter((p) => p.status !== "done").length
                            }
                          />
                          <Stat
                            title="Completed"
                            value={
                              projects.filter((p) => p.status === "done").length
                            }
                            tone="green-text"
                          />
                          <Stat
                            title="Courses linked"
                            value={
                              new Set(
                                projects
                                  .map((p) => p.course_id)
                                  .filter(Boolean),
                              ).size
                            }
                            detail="Optional course connection"
                          />
                        </>
                      ) : (
                        <>
                          <Stat
                            title="Credits"
                            value={courses.reduce(
                              (a, c) => a + Number(c.credits),
                              0,
                            )}
                          />
                          <Stat
                            title="Assignments completed"
                            value={`${assignments.filter((a) => a.status === "completed").length} / ${assignments.length}`}
                            detail={
                              assignments.length
                                ? "From your saved work"
                                : "Add assignments first"
                            }
                          />
                          <Stat
                            title="Study completed"
                            value={`${weekly.filter((s) => s.status === "completed").reduce((a, s) => a + minutes(s.end_time) - minutes(s.start_time), 0)} min`}
                            detail="This week"
                            tone="green-text"
                          />
                        </>
                      )}
                    </div>
                    <div className="two-columns">
                      <Card
                        title={
                          view === "Study"
                            ? "Your study plan"
                            : view === "Progress"
                              ? "Academic tracking"
                              : view === "Exams"
                                ? "Exam schedule"
                                : view === "Projects"
                                  ? "Your projects"
                                  : "Assignments"
                        }
                        action={
                          view === "Study" ? (
                            <span className="badge blue">Hybrid mode</span>
                          ) : undefined
                        }
                      >
                        {view !== "Progress" && (
                          <div className="filters">
                            <input
                              type="search"
                              aria-label="Search items"
                              placeholder="Search…"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                            />
                            <select
                              aria-label="Filter by course"
                              value={courseFilter}
                              onChange={(e) => setCourseFilter(e.target.value)}
                            >
                              <option value="">All courses</option>
                              {courses.map((c) => (
                                <option value={c.id} key={c.id}>
                                  {c.code}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label="Filter by status"
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                            >
                              <option value="all">All statuses</option>
                              {(view === "Assignments"
                                ? ["open", "overdue", "completed"]
                                : view === "Exams"
                                  ? ["scheduled", "archived"]
                                  : view === "Study"
                                    ? [
                                        "suggested",
                                        "planned",
                                        "completed",
                                        "skipped",
                                      ]
                                    : ["planning", "active", "done"]
                              ).map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {(() => {
                          const t = viewTable[view]!;
                          const rows = scoped(t)
                            .filter(
                              (r) =>
                                (!courseFilter ||
                                  r.course_id === courseFilter) &&
                                (!search ||
                                  `${label(r)} ${courseName(r.course_id)}`
                                    .toLowerCase()
                                    .includes(search.toLowerCase())) &&
                                (filter === "all" ||
                                  (view === "Exams"
                                    ? filter === "archived"
                                      ? r.status === "archived" ||
                                        isPast(r, now)
                                      : r.status !== "archived" &&
                                        !isPast(r, now)
                                    : filter === "overdue"
                                      ? overdue(r, now)
                                      : r.status === filter)),
                            )
                            .sort((a, b) =>
                              String(
                                a.date || a.due_date || a.created_at,
                              ).localeCompare(
                                String(b.date || b.due_date || b.created_at),
                              ),
                            );
                          if (!rows.length)
                            return (
                              <Empty
                                title={
                                  search || filter !== "all" || courseFilter
                                    ? "No matching items"
                                    : view === "Study"
                                      ? "Make space for focused work"
                                      : `No ${view === "Progress" ? "tracking data" : view.toLowerCase()} yet`
                                }
                                description={
                                  view === "Study"
                                    ? "Generate suggestions around classes and deadlines, or add a session yourself."
                                    : view === "Progress"
                                      ? "GPA and attendance are optional. Nothing is estimated."
                                      : "Add an item to get started. Your changes are saved to your account."
                                }
                                action={
                                  view === "Study" ? (
                                    <button
                                      className="primary"
                                      disabled={
                                        busy || archived || !courses.length
                                      }
                                      onClick={() => void generate()}
                                    >
                                      Generate suggestions
                                    </button>
                                  ) : (
                                    addButton(t)
                                  )
                                }
                              />
                            );
                          if (view === "Assignments")
                            return assignmentRows(rows);
                          return rows.map((r) => (
                            <div
                              key={r.id}
                              className={`list-row ${r.status === "completed" || r.status === "done" ? "completed" : ""}`}
                            >
                              <div className="row-copy">
                                {view === "Study" && (
                                  <small className="muted">
                                    {formatDate(r.date)} ·{" "}
                                    {String(r.start_time).slice(0, 5)}–
                                    {String(r.end_time).slice(0, 5)}
                                  </small>
                                )}
                                <strong>
                                  {view === "Progress"
                                    ? r.course_id
                                      ? courseName(r.course_id)
                                      : "Semester progress"
                                    : label(r)}
                                </strong>
                                <small className="muted">
                                  {view === "Progress"
                                    ? `${r.gpa != null ? `GPA ${r.gpa} / ${r.gpa_scale}` : ""}${r.gpa != null && r.attendance != null ? " · " : ""}${r.attendance != null ? `Attendance ${r.attendance}%` : ""}`
                                    : view === "Study"
                                      ? courseName(r.course_id)
                                      : `${r.course_id ? courseName(r.course_id) + " · " : ""}${formatDate(r.date || r.due_date)}${view === "Exams" ? ` · ${String(r.time).slice(0, 5)}${r.room ? " · Room " + r.room : ""}` : ""}`}
                                </small>
                                {(r.notes || r.description) && (
                                  <p className="caption muted note-text">
                                    {r.description || r.notes}
                                  </p>
                                )}
                                {r.url &&
                                  /^https?:\/\//.test(String(r.url)) && (
                                    <a
                                      href={String(r.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open project link ↗
                                    </a>
                                  )}
                              </div>
                              {view !== "Progress" && (
                                <span
                                  className={`badge ${r.status === "completed" || r.status === "done" ? "green" : ""}`}
                                >
                                  {view === "Exams" &&
                                  (isPast(r, now) || r.status === "archived")
                                    ? "Archived"
                                    : r.status}
                                </span>
                              )}
                              {rowActions(t, r)}
                            </div>
                          ));
                        })()}
                      </Card>
                      <div className="stack">
                        {priorityCard}
                        {view === "Study" ? (
                          <Card title="Planner logic">
                            <p className="green-text">
                              Uses your timetable gaps
                            </p>
                            <p className="muted caption">
                              Ranks courses by priority, upcoming deadlines, and
                              study already suggested. Class-free Monday and
                              Saturday allow longer blocks.
                            </p>
                            <p className="muted caption">
                              Regenerate after timetable or deadline changes.
                              Accepted, completed, skipped, and manual sessions
                              are preserved.
                            </p>
                            <p className="muted caption">
                              Suggestions cover the next 7 days, between 10:00
                              and 20:00. You can edit any time or goal.
                            </p>
                          </Card>
                        ) : view === "Progress" ? (
                          <Card title="No fake metrics">
                            <p className="muted">
                              GPA and attendance appear only after you enter
                              them. Study minutes count completed sessions, not
                              estimates of exam readiness.
                            </p>
                          </Card>
                        ) : view === "Projects" ? (
                          <Card title="Keep it simple">
                            <p className="muted">
                              Projects are for meaningful multi-step work. Small
                              homework stays in Assignments.
                            </p>
                          </Card>
                        ) : (
                          <Card title="Connected planning">
                            <p className="muted">
                              Your deadlines and exams help the study planner
                              find the next useful thing to work on.
                            </p>
                            <button
                              className="text-button"
                              onClick={() => go("Study")}
                            >
                              Open study planner →
                            </button>
                          </Card>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {view === "Semesters" && (
                  <Card title="Your semesters">
                    {data.semesters.length ? (
                      data.semesters.map((s) => (
                        <div className="list-row" key={s.id}>
                          <div className="row-copy">
                            <strong>{s.name}</strong>
                            <small className="muted">
                              {s.start_date
                                ? formatDate(s.start_date)
                                : "Start date not set"}{" "}
                              –{" "}
                              {s.end_date
                                ? formatDate(s.end_date)
                                : "End date not set"}
                            </small>
                          </div>
                          <span className="badge">
                            {s.archived
                              ? "Archived"
                              : s.id === semesterId
                                ? "Current"
                                : "Active"}
                          </span>
                          <div className="row-actions">
                            <button
                              className="small"
                              onClick={() => {
                                setSemesterId(s.id);
                                go("Today");
                              }}
                            >
                              Open
                            </button>
                            <button
                              className="small"
                              disabled={busy}
                              onClick={() =>
                                void update("semesters", s, {
                                  archived: !s.archived,
                                })
                              }
                            >
                              {s.archived ? "Reactivate" : "Archive"}
                            </button>
                            <button
                              className="small"
                              onClick={() => open("semesters", s)}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty
                        title="Create your first semester"
                        description="Every course, meeting, assignment, exam, and session belongs to a semester."
                        action={addButton("semesters")}
                      />
                    )}
                  </Card>
                )}
              </>
            )}
          </>
        )}
        <footer className="workspace-footer">
          <span>Engineering OS</span>
          <span>
            {loading ? "Syncing…" : "Times in Asia/Ulaanbaatar"} ·{" "}
            <button
              className="text-button"
              disabled={loading}
              onClick={() => void refresh()}
            >
              Refresh
            </button>
          </span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {(["Today", "Classes", "Assignments", "Study"] as View[]).map((v) => (
          <button
            key={v}
            className={
              view === v || (v === "Classes" && view === "Timetable")
                ? "active"
                : ""
            }
            onClick={() => go(v)}
          >
            <span aria-hidden="true">{view === v ? "●" : "○"}</span>
            {v === "Assignments" ? "Tasks" : v}
          </button>
        ))}
        <button className={more ? "active" : ""} onClick={() => setMore(true)}>
          <span aria-hidden="true">○</span>More
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
      {editor && (
        <Editor
          key={`${editor.table}-${editor.row?.id || "new"}-${editor.row?.day ?? ""}`}
          table={editor.table}
          row={editor.row}
          data={data}
          semesterId={semesterId}
          onSave={save}
          onClose={() => setEditor(null)}
          onDelete={(table, row) => {
            setError("");
            setDeleting({ table, row });
          }}
        />
      )}
      {deleting && (
        <Modal
          title={`Delete ${nouns[deleting.table]}?`}
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="modal-copy">
            Delete “{label(deleting.row)}”? This action cannot be undone.
          </p>
          {["courses", "semesters"].includes(deleting.table) && (
            <p className="warning">
              This also deletes all linked meetings, assignments, exams, study
              sessions, projects, and progress entries
              {deleting.table === "semesters" ? " in this semester" : ""}.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <footer className="modal-footer">
            <button disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              disabled={busy}
              className="danger solid"
              onClick={() => void remove()}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
          </footer>
        </Modal>
      )}
      {quick && (
        <Modal title="Quick add" onClose={() => setQuick(false)}>
          <div className="quick-grid">
            {(
              [
                "courses",
                "assignments",
                "exams",
                "study_sessions",
                "projects",
                "progress",
              ] as Table[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setQuick(false);
                  open(t);
                }}
              >
                + {nouns[t]}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {more && (
        <Modal title="More" onClose={() => setMore(false)}>
          <div className="quick-grid">
            {(
              [
                "Exams",
                "Projects",
                "Progress",
                "Semesters",
                "Timetable",
              ] as View[]
            ).map((v) => (
              <button key={v} onClick={() => go(v)}>
                {v}
              </button>
            ))}
            <button
              onClick={() =>
                void run(async () => {
                  const { error } = await client.auth.signOut();
                  if (error) throw error;
                  setMore(false);
                })
              }
            >
              Sign out
            </button>
          </div>
        </Modal>
      )}
      {regenerate && (
        <Modal
          title="Regenerate suggestions?"
          onClose={() => {
            if (!busy) setRegenerate(false);
          }}
        >
          <p className="modal-copy">
            Replace unaccepted suggestions with a new plan using your current
            timetable, priorities, assignments, and exams. Accepted, manual,
            completed, and skipped sessions stay as they are.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer className="modal-footer">
            <button disabled={busy} onClick={() => setRegenerate(false)}>
              Cancel
            </button>
            <button
              disabled={busy}
              className="primary"
              onClick={() => void generate()}
            >
              {busy ? "Planning…" : "Regenerate suggestions"}
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
