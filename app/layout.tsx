import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Level Finishes Command Center",
  description: "AI dashboard for leads, estimates, schedule, cash flow, and customer replies."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
