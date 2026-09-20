import Link from "next/link";
export default function Privacy() {
  return (
    <main className="privacy-page">
      <Link href="/">← Suralta</Link>
      <h1>Your data in Suralta</h1>
      <p>Updated September 19, 2026</p>
      <h2>What is stored</h2>
      <p>
        Your name, university, major, optional study year, account email, and
        the academic records you choose to save. Your profile is stored in your
        private Supabase Auth account metadata. Courses and related records are
        protected by ownership policies in Supabase.
      </p>
      <h2>Timetable files</h2>
      <p>
        Photos, PDFs and spreadsheets are read on your device. The original
        files and extracted text are not uploaded to our database. Only the
        course and meeting details you explicitly confirm are saved. Temporary
        previews are discarded when you close the import.
      </p>
      <h2>Passwords and sessions</h2>
      <p>
        Supabase Auth manages password hashing, confirmation emails, and
        sessions. Passwords are not stored in academic tables. The browser
        stores session cookies to keep you signed in. This app does not add
        advertising trackers.
      </p>
      <h2>Infrastructure</h2>
      <p>
        Vercel hosts the website and Supabase stores account and academic data.
        These services process network and service logs needed to operate the
        app. Academic records remain until you delete them using the app.
      </p>
      <h2>Your choices</h2>
      <p>
        Edit your profile from the workspace. Edit or delete courses, meetings
        and other records at any time in an active semester. Semester deletion
        removes its linked records after confirmation. This version does not yet
        provide self-service account deletion.
      </p>
    </main>
  );
}
