"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, UserRound, WalletCards } from "lucide-react";
import { useAuth } from "../lib/useAuth";
import { SiteAccessManagement } from "./SiteAccessManagement";

export function AccountNavigation() {
  const pathname = usePathname();
  return pathname === "/login" ? null : (
    <SignedInNavigation pathname={pathname} />
  );
}
function SignedInNavigation({ pathname }: { pathname: string }) {
  const { user, isInitializing, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");
  async function handleLogout() {
    setIsLoggingOut(true);
    setError("");
    try {
      await logout();
      window.location.assign("/login");
    } catch {
      setError("ההתנתקות נכשלה. אפשר לנסות שוב.");
      setIsLoggingOut(false);
    }
  }
  const links = [
    { href: "/", label: "סקירה כללית", icon: LayoutDashboard },
    { href: "/kristin", label: "Kristin", icon: UserRound },
    { href: "/shahar", label: "Shahar", icon: UserRound },
  ];
  return (
    <header className="ui-header">
      <div className="ui-navigation">
        <Link href="/" className="ui-brand" aria-label="MyIncome — סקירה כללית">
          <span className="ui-brand-mark">
            <WalletCards size={21} aria-hidden="true" />
          </span>
          <span className="ui-brand-name" dir="ltr">
            MyIncome<span className="text-indigo-500">.</span>
          </span>
        </Link>
        <nav aria-label="ניווט ראשי" className="ui-nav-links">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="ui-nav-link"
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="ui-user-actions">
          <div
            className="flex min-w-0 items-center gap-2.5"
            aria-label={`ברוך הבא ${user?.username ?? ""}`}
          >
            <div
              className="ui-avatar"
              title={user?.username}
              aria-hidden="true"
            >
              {user?.username?.[0]?.toUpperCase() ?? <UserRound size={17} />}
            </div>
            <div className="ui-user-copy" aria-live="polite">
              <p>ברוך הבא</p>
              <p title={user?.username}>{user?.username ?? "טוען…"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2 sm:pr-3">
            {user?.isAdmin && <SiteAccessManagement />}
            <button
              type="button"
              className="ui-icon-btn"
              title={isLoggingOut ? "מתנתק…" : "התנתקות"}
              aria-label={isLoggingOut ? "מתנתק…" : "התנתקות"}
              disabled={isInitializing || isLoggingOut}
              onClick={handleLogout}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="ui-alert col-span-full">
            {error}
          </p>
        )}
      </div>
    </header>
  );
}
