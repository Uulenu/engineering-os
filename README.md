# Engineering OS

A Next.js App Router + Tailwind + Supabase university workspace built from [the Engineering OS Figma](https://www.figma.com/design/LHiWzaQVVsoC7spijl8k7X).

## Local development

Requires Node.js 22+ and npm. The current deployment has public Supabase defaults in `src/lib/public-config.ts`; these are browser-visible settings, not administrative credentials. Copy `.env.example` to `.env.local`, set the Supabase URL and publishable key, then run `npm ci`, `npm run dev`.

`npm run build` checks the production build. `npm run lint` checks the source. `npm run test:unit` verifies date boundaries, timetable warnings and planning. Browser tests use two disposable accounts supplied in `../work/verification/accounts.json` (never commit credentials). `npm run test:e2e` runs against localhost; set `TEST_URL` to test a deployment. Tests use the installed Chrome browser. The end-to-end test clears only the first QA account's semesters; never use a real user's credentials.

## Data and setup

Supabase project: `ugfnhcnplyfkxfbkemui`. `supabase/schema.sql` is the initial schema applied as `engineering_os_initial`. All tables enable RLS. Owner IDs and semester IDs are included in composite foreign keys; a user cannot link their data to another user's courses or semesters. Database constraints enforce valid dates, times, priorities and GPA ranges. RPC functions run as the caller, not as a privileged owner.

Sign up, confirm your email, create a semester, and choose **Import NUM courses + timetable**. This atomically imports six 3-credit courses and 13 meetings. Monday, Saturday and Sunday start without classes. Each meeting is editable data. Assignments, exams, projects and academic metrics start empty. Semester dates are optional because they were not provided.

The seed comes from Figma's corrected Timetable frame `3:260`; older Classes summary labels incorrectly mention Saturday and are intentionally not copied. Priorities: EENG202 Electronics, MATH101 Calculus, PHYS101 Physics, then Python and the remaining subjects.

## Authentication

Email/password auth uses Supabase, with PKCE confirmation and password-recovery callbacks. Configure Site URL to the production origin and allow `<origin>/auth/callback` plus `<origin>/auth/callback?next=recovery`. The browser refreshes sessions through `@supabase/ssr`; every data request is authorized by Supabase RLS. There is no privileged database key in the app.

Supabase's built-in email provider is rate-limited and restricts recipients. A custom SMTP provider is required for unrestricted public signups. The user's own organization email can be used with the default provider. Do not disable email confirmation as a workaround.

## Product behavior

- Responsive Today, Classes, Timetable, Assignments, Exams, Study, Projects, Progress and Semesters.
- All date calculations use Asia/Ulaanbaatar; recurring classes obey semester date boundaries.
- Full CRUD, required fields, end-after-start validation, delete confirmation, duplicate prevention, explicit conflict overrides, and visible sync/error feedback.
- Course + multiple weekly meetings save atomically. Drag a timetable block to another day to open a reviewable edit; time and room are set in that editor.
- Overdue work remains until completed. Past exams display in the archive filter. Manual GPA and attendance are optional and never inferred.
- Archived semesters are read-only until reactivated. Deleting a semester or course cascades to linked records, as the confirmation dialog explains.
- The hybrid planner is deterministic scheduling, not a generative AI service. It ranks priorities and deadlines, finds free time from 10:00–20:00 for the next seven days, reserves exam preparation time, and gives longer blocks on class-free Mondays and Saturdays. Accept, edit, move, skip or complete sessions. Regeneration replaces only unaccepted suggestions; it preserves other sessions.
- If a deadline or timetable changes, use Regenerate plan to recalculate suggestions.

## Design

Desktop sidebar 248px; content padding 44px; system SF Pro font stack; 16px cards; Figma neutral surfaces and blue accent. Exported Figma navigation assets are committed locally. Secondary text and colored timetable labels use darker foregrounds for readable contrast. Mobile has a bottom navigation, single-day timetable tabs and full-screen forms. The seventh day is included so future Sunday classes can be edited without disappearing.
