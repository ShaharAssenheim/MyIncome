"use client";

import { Download } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppDialog } from "./AppDialog";
import { Button } from "./ui/button";
import { DropdownMenuItem } from "./ui/dropdown-menu";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  canInstall: boolean;
  installing: boolean;
  install: () => Promise<void>;
}

const PwaContext = createContext<PwaState | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const prompt = useRef<InstallPromptEvent | null>(null);
  const installingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "mac-safari" | "other">("other");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    const updateDisplayMode = () => {
      setInstalled(standalone.matches || iosNavigator.standalone === true);
    };
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
    };
    const appInstalled = () => {
      prompt.current = null;
      setInstalled(true);
      setShowInstructions(false);
    };
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setPlatform("ios");
    } else if (/Macintosh/.test(userAgent) && /Safari/.test(userAgent) &&
      !/Chrome|Chromium|Edg/.test(userAgent)) {
      setPlatform("mac-safari");
    }

    updateDisplayMode();
    setReady(true);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    standalone.addEventListener("change", updateDisplayMode);

    if (window.isSecureContext && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => console.error("PWA service worker registration failed", error));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      standalone.removeEventListener("change", updateDisplayMode);
    };
  }, []);

  async function install() {
    if (installingRef.current) return;
    const deferred = prompt.current;
    if (!deferred) {
      setShowInstructions(true);
      return;
    }
    prompt.current = null;
    installingRef.current = true;
    setInstalling(true);
    try {
      await deferred.prompt();
      if ((await deferred.userChoice).outcome === "accepted") setInstalled(true);
    } catch {
      setShowInstructions(true);
    } finally {
      installingRef.current = false;
      setInstalling(false);
    }
  }

  return (
    <PwaContext.Provider value={{ canInstall: ready && !installed, installing, install }}>
      {children}
      {showInstructions && (
        <AppDialog
          title="התקנת MyIncome"
          description="פתחו את האפליקציה מהסמל שלה לאחר ההתקנה."
          onClose={() => setShowInstructions(false)}
        >
          <ol className="list-inside list-decimal space-y-3 text-sm leading-7">
            {platform === "ios" ? (
              <li>בתפריט השיתוף בחרו ״הוספה למסך הבית״, הפעילו ״פתיחה כיישום״ אם האפשרות מופיעה, ואשרו הוספה.</li>
            ) : platform === "mac-safari" ? (
              <li>ב־Safari פתחו את תפריט ״קובץ״ ובחרו ״הוספה ל־Dock״.</li>
            ) : (
              <li>בתפריט Chrome או Edge בחרו באפשרות להתקנת האתר כאפליקציה ואשרו התקנה.</li>
            )}
            <li>פתחו את MyIncome מהסמל במסך הבית, ב־Dock או בתפריט ההתחלה.</li>
          </ol>
          <Button onClick={() => setShowInstructions(false)}>סגירה</Button>
        </AppDialog>
      )}
    </PwaContext.Provider>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const pwa = useContext(PwaContext);
  if (!pwa?.canInstall) return null;
  return (
    <Button type="button" variant="outline" className={className}
      onClick={pwa.install} disabled={pwa.installing}>
      <Download aria-hidden="true" />
      התקנת האפליקציה
    </Button>
  );
}

export function InstallAppMenuItem() {
  const pwa = useContext(PwaContext);
  if (!pwa?.canInstall) return null;
  return (
    <DropdownMenuItem onClick={pwa.install} disabled={pwa.installing}>
      <Download aria-hidden="true" />
      התקנת האפליקציה
    </DropdownMenuItem>
  );
}
