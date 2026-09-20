import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Suralta",
  description:
    "Your courses, your timetable, your rhythm. A student workspace for every major.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
