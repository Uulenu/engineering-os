"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
const steps = [
  {
    number: "01",
    title: "Bring your week.",
    body: "Upload a timetable photo, PDF or spreadsheet. Review the extracted details, fix anything that needs attention, and make it yours.",
    tag: "YOUR TIMETABLE → YOUR WORKSPACE",
  },
  {
    number: "02",
    title: "See the whole picture.",
    body: "Classes, deadlines, exams and projects belong together. See what is next, what is overdue, and where you have room to breathe.",
    tag: "LESS TAB-HOPPING. MORE CLARITY.",
  },
  {
    number: "03",
    title: "Make time for progress.",
    body: "Get study suggestions around your classes and priorities. Accept, move, edit or skip them. You always decide what happens next.",
    tag: "A PLAN THAT LEAVES YOU IN CHARGE",
  },
];
export default function Landing() {
  const root = useRef<HTMLElement>(null),
    story = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const el = root.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!reduced.matches) {
          el.style.setProperty(
            "--drift",
            `${Math.min(window.scrollY, 900) * 0.09}px`,
          );
        }
        if (story.current) {
          const rect = story.current.getBoundingClientRect();
          const progress = Math.max(
            0,
            Math.min(0.999, -rect.top / (rect.height - window.innerHeight)),
          );
          setActive(Math.floor(progress * 3));
        }
      });
    };
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in-view");
        }),
      { threshold: 0.12 },
    );
    el.querySelectorAll(".reveal").forEach((n) => observer.observe(n));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <main ref={root} className="landing">
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>
      <header className="landing-nav">
        <Link href="/" className="landing-logo" aria-label="Suralda home">
          <span aria-hidden="true">✳</span> Suralda
        </Link>
        <nav aria-label="Website navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#workspace">Your workspace</a>
        </nav>
        <div>
          <Link href="/login" className="landing-signin">
            Sign in
          </Link>
          <Link href="/signup" className="landing-pill small">
            Get started <span>↗</span>
          </Link>
        </div>
      </header>
      <section className="landing-hero" id="landing-content">
        <div className="hero-copy">
          <p className="landing-kicker">FOR YOUR NEXT CHAPTER</p>
          <h1>
            Less chaos.
            <br />
            <span>More campus.</span>
          </h1>
          <p className="hero-description">
            Your classes, deadlines and study time.
            <br />
            Finally, on the same page.
          </p>
          <div className="landing-actions">
            <Link href="/signup" className="landing-pill">
              Create your space <span>↗</span>
            </Link>
            <a href="#how-it-works" className="landing-text-link">
              Take a look ↓
            </a>
          </div>
          <p className="hero-footnote">
            YOUR UNIVERSITY. YOUR MAJOR. YOUR OWN RHYTHM.
          </p>
        </div>
        <div
          className="hero-scene"
          aria-label="Illustrative preview of a student workspace"
        >
          <div className="orbit" />
          <div className="scene-star" aria-hidden="true">
            ✳
          </div>
          <div className="scene-card schedule-preview">
            <div className="preview-top">
              <span>✳ Suralda</span>
              <span>YOUR WEEK</span>
            </div>
            <p className="demo-label">EXAMPLE WORKSPACE</p>
            <h2>
              A little more
              <br />
              breathing room.
            </h2>
            <div className="mini-days">
              {["M", "T", "W", "T", "F"].map((x, i) => (
                <span key={i} className={i === 2 ? "current" : ""}>
                  {x}
                </span>
              ))}
            </div>
            <div className="preview-class">
              <span>09:00</span>
              <div>
                <b>Design studio</b>
                <small>Room 204 · Seminar</small>
              </div>
              <i>↗</i>
            </div>
            <div className="preview-class pale">
              <span>14:00</span>
              <div>
                <b>A little focus time</b>
                <small>Suggested · Your choice</small>
              </div>
              <i>＋</i>
            </div>
          </div>
          <div className="scene-card done-note">
            <span>✓</span>
            <div>
              <b>Essay outline</b>
              <small>One less thing on your mind.</small>
            </div>
          </div>
          <div className="sticker">
            Room for
            <br />
            <em>real life.</em>
          </div>
        </div>
      </section>
      <div className="major-ribbon" aria-label="For every field of study">
        <span>Medicine</span>
        <i>✳</i>
        <span>Business</span>
        <i>✳</i>
        <span>Design</span>
        <i>✳</i>
        <span>Engineering</span>
        <i>✳</i>
        <span>Whatever comes next</span>
      </div>
      <section className="landing-statement reveal">
        <p className="landing-kicker">UNIVERSITY HAS ENOUGH MOVING PARTS.</p>
        <h2>
          Your week doesn’t
          <br />
          need to be one of them.
        </h2>
        <p>
          One place for the things you need to do.
          <br />
          More space for the person you’re becoming.
        </p>
      </section>
      <section className="scroll-story" id="how-it-works" ref={story}>
        <div className="story-sticky">
          <div className="story-heading">
            <p className="landing-kicker">
              FROM A FULL SCHEDULE TO A CLEAR PLAN
            </p>
            <h2>
              Find your
              <br />
              <em>rhythm.</em>
            </h2>
            <div className="story-tabs" aria-label="Explore how it works">
              {steps.map((s, i) => (
                <a
                  key={s.number}
                  href={`#story-${i}`}
                  aria-current={active === i ? "step" : undefined}
                >
                  {s.number}
                </a>
              ))}
            </div>
          </div>
          <div className="story-card">
            <span className="story-number" aria-hidden="true">
              {steps[active].number}
            </span>
            <p className="landing-kicker">{steps[active].tag}</p>
            <h3>{steps[active].title}</h3>
            <p>{steps[active].body}</p>
            <div className="story-illustration" aria-hidden="true">
              {active === 0 ? (
                <>
                  <span>PHOTO / PDF / XLSX</span>
                  <b>↘</b>
                  <span className="green-note">Review → Import ✓</span>
                </>
              ) : active === 1 ? (
                <>
                  <span>Classes</span>
                  <span className="green-note">Deadlines</span>
                  <span>Projects</span>
                </>
              ) : (
                <>
                  <span>Focus time · 60 min</span>
                  <span className="green-note">Accept ✓</span>
                  <span>Move ↗</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="static-story">{steps.map(s=><article key={s.number}><h3>{s.number} · {s.title}</h3><p>{s.body}</p></article>)}</div>
        {steps.map((s, i) => (
          <div
            id={`story-${i}`}
            className="story-anchor"
            key={i}
            aria-hidden="true"
          />
        ))}
      </section>
      <section id="workspace" className="landing-features">
        <div className="feature-heading reveal">
          <p className="landing-kicker">A PLACE FOR ALL OF IT</p>
          <h2>
            Small tools.
            <br />A calmer semester.
          </h2>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: "▦",
              title: "Your week, in focus",
              text: "Multiple meetings per course, rooms, class types, and a date-aware view of today.",
              tone: "lime",
            },
            {
              icon: "↗",
              title: "Deadlines without the scramble",
              text: "Keep assignments and exams in view. Mark work done and see what still needs you.",
              tone: "lilac",
            },
            {
              icon: "✳",
              title: "Study with a little direction",
              text: "Set your own course priorities. Find useful study time around your actual schedule.",
              tone: "peach",
            },
            {
              icon: "◌",
              title: "A fresh start, every semester",
              text: "Keep past semesters, projects, and optional GPA or attendance records in one space.",
              tone: "white",
            },
          ].map((f) => (
            <article className={`feature-card ${f.tone} reveal`} key={f.title}>
              <span aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-bottom reveal">
        <div>
          <p className="landing-kicker">MADE FOR STUDENTS, NOT ONE TIMETABLE</p>
          <h2>
            Different majors.
            <br />
            Same fresh start.
          </h2>
          <p>
            Choose your Mongolian university or type any other school. Bring
            your own classes. Build a week that works for you.
          </p>
          <Link href="/signup" className="landing-pill">
            Make it yours <span>↗</span>
          </Link>
        </div>
        <div className="landing-faq">
          <details>
            <summary>Can I use my own timetable?</summary>
            <p>
              Yes. Upload photos, PNG/JPG/WebP images, PDFs, CSV or XLSX files.
              Check the extracted rows before saving. Scans and complex grids
              may need manual corrections. You can also add courses yourself.
            </p>
          </details>
          <details>
            <summary>Is this only for engineers?</summary>
            <p>
              No. Suralda is for any major. Your school, courses, priorities and
              free days are yours to choose.
            </p>
          </details>
          <details>
            <summary>Who can see my data?</summary>
            <p>
              Your account can access only your own academic records. Files are
              read on your device; only the reviewed course details are saved.
              Passwords are handled and hashed by Supabase Auth.
            </p>
          </details>
          <details>
            <summary>Why didn’t my signup email arrive?</summary>
            <p>
              Email delivery is currently limited by the configured Supabase
              sender. Public email delivery is being configured. If signup
              returns an email error, do not keep retrying; your school does not
              need to be on the university list to use Suralda.
            </p>
          </details>
        </div>
      </section>
      <footer className="landing-footer">
        <Link href="/" className="landing-logo">
          ✳ Suralda
        </Link>
        <p>A little clarity. A lot of possibility.</p>
        <Link href="/login">Open your workspace ↗</Link>
        <a href="/privacy">Privacy</a>
      </footer>
    </main>
  );
}
