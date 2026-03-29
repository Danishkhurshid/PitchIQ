"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export function SiteShell({ children }) {
  const params = useParams();
  const pathname = usePathname();
  const league = params?.league || "psl"; // Default to psl for context

  const navItems = [
    {
      href: "/",
      label: "Live"
    },
    {
      href: `/${league}`,
      label: "Dashboard"
    },
    {
      href: `/${league}/players`,
      label: "Players"
    },
    {
      href: `/${league}/teams`,
      label: "Teams"
    },
    {
      href: `/${league}/matches`,
      label: "Matches"
    },
    {
      href: `/${league}/venues`,
      label: "Venues"
    }
  ];

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
              {league.toUpperCase()}-first analytics and storytelling built on ball-by-ball data
            </p>
          </div>
        </div>

        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              className={`site-nav-link ${pathname === item.href ? 'active' : ''}`} 
              href={item.href}
            >
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
