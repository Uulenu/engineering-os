# Suralta

A responsive student workspace for any university or major, built with Next.js App Router, Tailwind and Supabase. [Live app](https://suralta.vercel.app) · [Figma](https://www.figma.com/design/LHiWzaQVVsoC7spijl8k7X)

## Current launch status

The homepage, login/signup, academic workspace and reviewed timetable imports are implemented. Public email signup and password recovery still require a custom SMTP provider and verified sending domain. Supabase's default mail service only delivers to authorized organization members. Keep email confirmation enabled. Existing confirmed accounts can sign in.

## Development

Requires Node.js 22+ and npm. Copy `.env.example` to `.env.local` for another Supabase project, then run `npm ci` and `npm run dev`. The deployed project's URL and publishable key in `src/lib/public-config.ts` are intentionally browser-visible public settings, never administrative credentials.

Validation: `npm run build`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`. Browser tests use two disposable accounts in `../work/verification/accounts.json`, outside Git. Never put real-user credentials there: the main test clears the first QA account's semesters. Set `TEST_URL` to test a deployment. Chrome must be installed.

## Routes and account profile

- `/`: public homepage with a scroll walkthrough, responsive previews and reduced-motion support.
- `/signup`, `/login`: Supabase authentication; name, school, major and optional study year on signup.
- `/app`: signed-in academic workspace and editable profile.
- `/auth/callback`: email confirmation/password-recovery callback.
- `/privacy`: data handling and current deletion limitations.

The university selector includes eight Mongolian institutions with source URLs in `src/lib/universities.ts`. It is not an exhaustive registry: users may type any other school. Profile metadata is used for display only, never authorization.

## Importing a student's own timetable

Create a semester, then choose **Import your timetable**. Photos (PNG/JPG/WebP), PDFs, CSV and XLSX are read in the browser. OCR uses locally served English and Mongolian models. Original files are not uploaded or stored; only reviewed course/meeting fields are sent to Supabase.

Every import has an editable review stage and explicit confirmation. Missing or uncertain fields remain blank. OCR handles text extraction, not universal timetable layout recognition: complex grids may need substantial correction or manual rows. The CSV template provides a reliable structured format. Course names/credits from separate files fill blank values only when matching course codes agree. Shared course field edits apply to all its meetings.

Limits: 10 MB per file, five selected files at once, eight PDF pages, ten workbook sheets, 500 review rows, 100 courses and 50 meetings per course per save. Imports are one transaction, so failures leave no partial records. Conflicts require confirmation; exact duplicates and existing course codes are rejected. Edit an existing course separately.

The personal NUM preset was retired by migration. Existing student records were preserved. No student receives another person's semester automatically.

## Academic behavior

Responsive Today, Classes, Timetable, Assignments, Exams, Study, Projects, Progress and Semesters have CRUD, validation, delete confirmation and feedback. Courses support multiple weekly meetings. Timetable drag-to-day opens a reviewable editor. Optional manual GPA and attendance are never inferred. Archived semesters are read-only until reactivated; deletion explains cascading linked records.

Dates use Asia/Ulaanbaatar. Recurring classes respect optional semester boundaries. Overdue assignments remain visible until completed; past exams have an archive filter. The planner ranks course priorities and deadlines, finds available time from 10:00–20:00 over the next seven days, and suggests longer sessions on any day without classes. Accept, edit, move, skip, regenerate or complete sessions. Regeneration preserves accepted and manual sessions. This is a deterministic planner, not generative AI. Regenerate when deadlines or the timetable change.

## Database and security

Supabase project `ugfnhcnplyfkxfbkemui`. Apply the complete ordered `supabase/migrations` history for a fresh database; `supabase/schema.sql` is only the original baseline. The latest migration removes the personal seed RPC and adds atomic `import_timetable`.

All eight academic tables enforce owner RLS for reads and writes. Composite ownership/semester foreign keys prevent linking to another student's records. All public application RPCs run as the caller with SECURITY INVOKER. Database constraints enforce required values and ranges. Profiles use Supabase Auth user metadata. Password hashing and sessions are handled by Supabase Auth; application tables never hold passwords.

Only the public publishable key reaches the browser. Environment files are ignored; QA credentials and generated verification output stay outside the repository. CSP, frame protection, content-type and referrer headers are set in `next.config.ts`; local OCR explicitly needs WebAssembly and worker permissions. CSP permits Next.js inline hydration scripts and is not a nonce-based strict policy.

Supabase Site URL must be the public deployment origin. Allow `<origin>/auth/callback` and `<origin>/auth/callback?next=recovery`. Configure custom SMTP for public signup/reset delivery. Compromised-password screening remains unavailable on the current free plan; do not claim it is enabled. Account deletion is not self-service yet and is stated on the privacy page.

## Design and third-party assets

Figma contains the original academic workspace plus Suralta desktop/mobile login, signup and homepage designs. The homepage uses original product illustrations and scroll behavior inspired by the supplied b-egg.farm reference. It does not reuse that site's images. Reduced motion shows all walkthrough stages without sticky animation.

OCR, language data and PDF workers are served locally for privacy and reliability. License notices live alongside the public assets. These assets are lazy-loaded only when an import requires them.
