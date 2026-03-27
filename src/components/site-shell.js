import Link from "next/link";

const navItems = [
  {
    href: "/",
    label: "Dashboard"
  },
  {
    href: "/players",
    label: "Players"
  },
  {
    href: "/teams",
    label: "Teams"
  },
  {
    href: "/matches",
    label: "Matches"
  },
  {
    href: "/venues",
    label: "Venues"
  }
];

export function SiteShell({ children }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <Link className="brand-mark" href="/">
            PitchIQ
          </Link>
          <div>
            <p className="brand-title">Cricket intelligence, not just scorecards</p>
            <p className="brand-subtitle">
              PSL-first analytics and storytelling built on ball-by-ball data
            </p>
          </div>
        </div>

        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} className="site-nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
          <a className="site-nav-link subdued" href="/api/health">
            API
          </a>
        </nav>
      </header>

      {children}
    </div>
  );
}
