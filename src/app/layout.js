import "./globals.css";

import { SiteShell } from "@/components/site-shell";

export const metadata = {
  title: "PitchIQ",
  description: "PSL-first cricket analytics dashboard and storytelling platform"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
