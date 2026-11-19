"use client";
import {
  ChevronDown,
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  FolderOpen,
  Home,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  PiggyBank,
  UserRound,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { incomeDateParts } from "../lib/income-date";
import { useAuth } from "../lib/useAuth";
import { InstallAppMenuItem } from "./PwaProvider";
import { Alert, AlertDescription } from "./ui/alert";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
const SiteAccessManagement = dynamic(() =>
  import("./SiteAccessManagement.tsx").then(
    (module) => module.SiteAccessManagement,
  ),
);

export function AccountNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/login" ? children : (
    <div className="app-shell">
      <SignedInNavigation pathname={pathname} />
      <div className="app-content">{children}</div>
    </div>
  );
}
function SignedInNavigation({ pathname }: { pathname: string }) {
  const { user, isInitializing, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [error, setError] = useState("");
  const displayName = ({ shahar: "שחר", kristin: "קריסטין" } as Record<string, string>)[
    user?.username?.toLowerCase() ?? ""
  ] ?? user?.username;
  const today = incomeDateParts();
  const dateLabel = new Intl.DateTimeFormat("he-IL", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(today.year, today.month - 1, today.day));
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
    { href: "/kristin", label: "קריסטין", icon: UserRound },
    { href: "/shahar", label: "שחר", icon: UserRound },
  ];
  return (
    <>
      <aside className="site-sidebar" aria-label="ניווט האפליקציה">
          <Link
            href="/"
            className="site-brand"
            aria-label="MyIncome — סקירה כללית"
          >
            <span className="brand-symbol">
              <Home size={27} strokeWidth={2.3} aria-hidden="true" />
            </span>
            <div>
              <span className="brand-name" dir="ltr">
                MyIncome
              </span>
            </div>
          </Link>
          <nav aria-label="ניווט ראשי" className="site-main-nav">
            <p className="nav-section-label">חשבונות</p>
              {links.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className="site-nav-link"
                    aria-current={pathname === href ? "page" : undefined}
                  >
                    <Icon size={20} aria-hidden="true" />
                    {label}
                  </Link>
              ))}
            <div className="nav-divider" />
            <p className="nav-section-label">נתונים</p>
            {[
              { view: "transactions", label: "תנועות בנק", icon: ArrowLeftRight },
              { view: "savings", label: "חיסכון והשקעות", icon: PiggyBank },
              { view: "salary", label: "משכורות", icon: BarChart3 },
              { view: "sources", label: "דוחות ומקורות", icon: FolderOpen },
            ].map(({ view, label, icon: Icon }) => (
              <Link key={view} href={`/?view=${view}#finance-details`} className="site-nav-link">
                <Icon size={20} aria-hidden="true" />{label}
              </Link>
            ))}
          </nav>
      </aside>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="topbar-location"><LayoutDashboard size={17} aria-hidden="true" /><strong>{links.find((link) => link.href === pathname)?.label ?? "סקירה כללית"}</strong></div>
          <div className="topbar-date"><CalendarDays size={17} aria-hidden="true" /><span>{dateLabel}</span></div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="account-trigger gap-2.5 px-2"
                />
              }
              aria-label="תפריט החשבון"
              disabled={isInitializing || isLoggingOut}
            >
              <Avatar className="size-8">
                <AvatarFallback>
                  {displayName?.[0]?.toUpperCase() ?? (
                    <UserRound size={16} />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-start text-xs sm:block">
                {isLoggingOut ? "מתנתק…" : (displayName ?? "טוען…")}
              </span>
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64" sideOffset={12}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>החשבון שלכם</DropdownMenuLabel>
                <div className="flex flex-col gap-2 px-2.5 py-3">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p
                    dir="ltr"
                    className="truncate text-start text-xs text-muted-foreground"
                  >
                    {user?.email}
                  </p>
                  <Badge variant="secondary">
                    {user?.isAdmin ? "מנהל המערכת" : "גישה לצפייה"}
                  </Badge>
                </div>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <InstallAppMenuItem />
                {user?.isAdmin && (
                  <DropdownMenuItem onClick={() => setAccessOpen(true)}>
                    <ShieldCheck />
                    ניהול גישה לאתר
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut />
                  {isLoggingOut ? "מתנתק…" : "התנתקות"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {error && (
            <Alert variant="destructive" className="col-span-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </header>
      {user?.isAdmin && accessOpen && (
        <SiteAccessManagement
          open={accessOpen}
          onClose={() => setAccessOpen(false)}
        />
      )}
    </>
  );
}
