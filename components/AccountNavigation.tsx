"use client";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/useAuth";
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
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "./ui/navigation-menu";
const SiteAccessManagement = dynamic(() =>
  import("./SiteAccessManagement.tsx").then(
    (module) => module.SiteAccessManagement,
  ),
);

export function AccountNavigation() {
  const pathname = usePathname();
  return pathname === "/login" ? null : (
    <SignedInNavigation pathname={pathname} />
  );
}
function SignedInNavigation({ pathname }: { pathname: string }) {
  const { user, isInitializing, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
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
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link
            href="/"
            className="site-brand"
            aria-label="MyIncome — סקירה כללית"
          >
            <span className="brand-symbol">
              <WalletCards size={21} aria-hidden="true" />
            </span>
            <div>
              <span className="brand-name" dir="ltr">
                MyIncome<span className="text-primary">.</span>
              </span>
              <p className="brand-caption">המרחב הכלכלי המשפחתי</p>
            </div>
          </Link>
          <NavigationMenu aria-label="ניווט ראשי" className="site-main-nav">
            <NavigationMenuList>
              {links.map(({ href, label, icon: Icon }) => (
                <NavigationMenuItem key={href}>
                  <NavigationMenuLink
                    render={<Link href={href} />}
                    className="site-nav-link"
                    aria-current={pathname === href ? "page" : undefined}
                    active={pathname === href}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
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
                  {user?.username?.[0]?.toUpperCase() ?? (
                    <UserRound size={16} />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-start text-xs sm:block">
                {isLoggingOut ? "מתנתק…" : (user?.username ?? "טוען…")}
              </span>
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64" sideOffset={12}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>החשבון שלכם</DropdownMenuLabel>
                <div className="flex flex-col gap-2 px-2.5 py-3">
                  <p className="text-sm font-medium">{user?.username}</p>
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
