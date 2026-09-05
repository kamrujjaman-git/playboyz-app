"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type DatePickerView = "days" | "months" | "years";

type DatePickerProps = {
    name: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    required?: boolean;
    "aria-label"?: string;
};

const monthLabels = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const weekdayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function parseDate(value?: string) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function toInputValue(date: Date | null) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date | null) {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthDays(date: Date) {
    const firstDay = startOfMonth(date).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const previousMonthDays = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
        const dayNumber = index - firstDay + 1;
        if (dayNumber < 1) return new Date(date.getFullYear(), date.getMonth() - 1, previousMonthDays + dayNumber);
        if (dayNumber > daysInMonth) return new Date(date.getFullYear(), date.getMonth() + 1, dayNumber - daysInMonth);
        return new Date(date.getFullYear(), date.getMonth(), dayNumber);
    });
}

function isSameDay(left: Date | null, right: Date) {
    return Boolean(left && left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate());
}

export function DatePicker({
    name,
    value,
    defaultValue,
    placeholder = "Choose your date",
    required,
    "aria-label": ariaLabel,
}: DatePickerProps) {
    const initialDateValue = defaultValue ?? "";
    const initialDate = parseDate(initialDateValue);
    const [internalDate, setInternalDate] = useState<Date | null>(initialDate);
    const [viewDate, setViewDate] = useState(() => startOfMonth(initialDate ?? new Date()));
    const [view, setView] = useState<DatePickerView>("days");
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPosition, setPopoverPosition] = useState({ top: 16, left: 16, width: 336 });
    const selectedDate = value === undefined ? internalDate : parseDate(value);
    const inputValue = value ?? toInputValue(internalDate);
    const decadeStart = Math.floor(viewDate.getFullYear() / 10) * 10;

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    useEffect(() => {
        const form = rootRef.current?.closest("form");
        if (!form) return;
        const resetDate = parseDate(initialDateValue);
        const reset = () => {
            setInternalDate(resetDate);
            setViewDate(startOfMonth(resetDate ?? new Date()));
        };
        form.addEventListener("reset", reset);
        return () => form.removeEventListener("reset", reset);
    }, [initialDateValue]);

    useEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            const trigger = triggerRef.current;
            const popover = popoverRef.current;
            if (!trigger) return;

            const padding = 16;
            const width = Math.min(336, window.innerWidth - padding * 2);
            const triggerRect = trigger.getBoundingClientRect();
            const popoverHeight = popover?.getBoundingClientRect().height ?? 420;
            const left = Math.max(padding, Math.min(triggerRect.right - width, window.innerWidth - width - padding));
            const below = triggerRect.bottom + 8;
            const above = triggerRect.top - popoverHeight - 8;
            const top = below + popoverHeight <= window.innerHeight - padding
                ? below
                : above >= padding
                    ? above
                    : Math.max(padding, window.innerHeight - popoverHeight - padding);

            setPopoverPosition({ top, left, width });
        };

        const frame = window.requestAnimationFrame(updatePosition);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open, view, viewDate]);

    const selectDate = (date: Date) => {
        if (value === undefined) setInternalDate(date);
        setViewDate(startOfMonth(date));
        setView("days");
        setOpen(false);
    };

    const shiftView = (direction: -1 | 1) => {
        if (view === "days") setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + direction, 1));
        if (view === "months") setViewDate((date) => new Date(date.getFullYear() + direction, date.getMonth(), 1));
        if (view === "years") setViewDate((date) => new Date(date.getFullYear() + direction * 10, date.getMonth(), 1));
    };

    return (
        <div ref={rootRef} className="relative w-full">
            <input type="hidden" name={name} value={inputValue} required={required} />
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel ?? placeholder}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-3 py-2 text-left text-sm text-foreground shadow-[var(--shadow-inset)] transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
            >
                <span className={`flex min-w-0 items-center gap-2 truncate ${selectedDate ? "text-foreground" : "text-muted-foreground"}`}>
                    <CalendarDays size={16} className="shrink-0 text-primary" aria-hidden="true" />
                    {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {open && (
                <div ref={popoverRef} style={{ top: popoverPosition.top, left: popoverPosition.left, width: popoverPosition.width }} className="fixed z-[100] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:shadow-2xl">
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary to-blue-500 px-3 py-2.5 text-white">
                        <button type="button" aria-label="Previous" onClick={() => shiftView(-1)} className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/15">
                            <ChevronLeft size={17} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setView((current) => current === "days" ? "months" : current === "months" ? "years" : "days")} className="rounded-lg px-2 py-1 text-sm font-semibold transition-colors hover:bg-white/15">
                            {view === "years" ? `${decadeStart} - ${decadeStart + 9}` : `${monthLabels[viewDate.getMonth()]}, ${viewDate.getFullYear()}`}
                        </button>
                        <button type="button" aria-label="Next" onClick={() => shiftView(1)} className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/15">
                            <ChevronRight size={17} aria-hidden="true" />
                        </button>
                    </div>

                    {view === "days" && (
                        <div className="grid grid-cols-7 gap-1">
                            {weekdayLabels.map((label) => <span key={label} className="py-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">{label}</span>)}
                            {getMonthDays(viewDate).map((date) => {
                                const currentMonth = date.getMonth() === viewDate.getMonth();
                                return <button key={date.toISOString()} type="button" onClick={() => selectDate(date)} className={`aspect-square rounded-full text-sm transition-colors ${isSameDay(selectedDate, date) ? "bg-primary font-bold text-white" : currentMonth ? "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-700" : "text-slate-300 dark:text-slate-600"}`}>{date.getDate()}</button>;
                            })}
                        </div>
                    )}

                    {view === "months" && (
                        <div className="grid grid-cols-3 gap-2">
                            {monthLabels.map((month, index) => <button key={month} type="button" onClick={() => { setViewDate(new Date(viewDate.getFullYear(), index, 1)); setView("days"); }} className={`rounded-xl px-2 py-3 text-sm font-medium transition-colors ${index === viewDate.getMonth() ? "bg-primary text-white" : "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-700"}`}>{month.slice(0, 3)}</button>)}
                        </div>
                    )}

                    {view === "years" && (
                        <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }, (_, index) => decadeStart - 1 + index).map((year) => <button key={year} type="button" onClick={() => { setViewDate(new Date(year, viewDate.getMonth(), 1)); setView("months"); }} className={`rounded-xl px-2 py-3 text-sm font-medium transition-colors ${year === viewDate.getFullYear() ? "bg-primary text-white" : "text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-700"}`}>{year}</button>)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}