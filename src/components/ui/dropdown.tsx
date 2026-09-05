"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type DropdownOption = { value: string; label: string };

type DropdownProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: DropdownOption[];
  onValueChange?: (value: string) => void;
  "aria-label"?: string;
};

export function Dropdown({
  name,
  value,
  defaultValue,
  options,
  onValueChange,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-secondary px-3 py-2 text-left text-sm text-foreground shadow-[var(--shadow-inset)] transition-all hover:-translate-y-px hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring active:shadow-[var(--shadow-soft-sm)]"
      >
        <span>{selected?.label ?? "Select an option"}</span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="listbox" className="absolute z-[100] mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-2xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              onClick={() => selectValue(option.value)}
              className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
            >
              {option.label}
              {option.value === selectedValue && <Check size={15} className="text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
