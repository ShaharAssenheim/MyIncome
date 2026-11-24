"use client";
import { X } from "lucide-react";
import { ReactNode, useRef } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function AppDialog({
  title,
  description,
  onClose,
  busy = false,
  wide = false,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const previousFocus = useRef<HTMLElement | null>(
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement),
  );
  return (
    <Dialog
      open
      disablePointerDismissal
      onOpenChange={(open, details) => {
        if (!open) {
          if (busy) details.cancel();
          else onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        finalFocus={() =>
          previousFocus.current?.isConnected
            ? previousFocus.current
            : (document.querySelector<HTMLElement>(
                '[data-slot="dropdown-menu-trigger"]',
              ) ?? false)
        }
        className={wide ? "sm:max-w-xl" : undefined}
      >
        <DialogHeader className="pe-9">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>
            {description ?? "עריכת הנתונים ושמירת השינויים"}
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              className="absolute top-4 end-4"
            />
          }
          aria-label="סגירה"
        >
          <X />
        </DialogClose>
        {children}
      </DialogContent>
    </Dialog>
  );
}
