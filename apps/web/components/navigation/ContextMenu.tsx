"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ContextMenuAction = {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  onSelect: () => void | Promise<void>;
};

export type ContextMenuSection = {
  id: string;
  label?: string;
  actions: ContextMenuAction[];
};

type ContextMenuProps = {
  open: boolean;
  x: number;
  y: number;
  sections: ContextMenuSection[];
  onClose: () => void;
};

const MENU_WIDTH = 240;
const MENU_MARGIN = 12;
const MENU_ESTIMATED_HEIGHT = 320;

export function ContextMenu({ open, x, y, sections, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      onClose();
    }

    function onWindowChange() {
      onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [onClose, open]);

  const position = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: x, top: y };
    }

    return {
      left: Math.max(MENU_MARGIN, Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN)),
      top: Math.max(MENU_MARGIN, Math.min(y, window.innerHeight - MENU_ESTIMATED_HEIGHT - MENU_MARGIN))
    };
  }, [x, y]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]">
      <div
        ref={menuRef}
        className="pointer-events-auto fixed max-h-[calc(100vh-24px)] w-60 overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur"
        style={{ left: position.left, top: position.top }}
      >
        {sections.map((section, sectionIndex) => (
          <div key={section.id} className={sectionIndex > 0 ? "mt-2 border-t border-slate-800 pt-2" : ""}>
            {section.label ? (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.disabled}
                  onClick={() => {
                    void action.onSelect();
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    action.tone === "danger"
                      ? "text-rose-200 hover:bg-rose-500/12 disabled:text-rose-200/40"
                      : "text-slate-100 hover:bg-slate-800 disabled:text-slate-500"
                  } disabled:cursor-not-allowed`}
                >
                  <span>{action.label}</span>
                  {action.hint ? <span className="text-xs text-slate-500">{action.hint}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
