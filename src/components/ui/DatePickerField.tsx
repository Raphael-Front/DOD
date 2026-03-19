"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, isValid, setMonth, setYear, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/dist/style.css";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

type ViewMode = "days" | "months" | "years";

interface DatePickerFieldProps {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className = "",
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [yearRangeStart, setYearRangeStart] = useState(
    Math.floor(getYear(new Date()) / 12) * 12
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value
    ? (() => {
        const d = new Date(value + "T12:00:00");
        return isValid(d) ? d : undefined;
      })()
    : undefined;

  const displayValue = selectedDate
    ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
    : "";

  useEffect(() => {
    if (open && selectedDate) {
      setViewDate(selectedDate);
      setYearRangeStart(Math.floor(getYear(selectedDate) / 12) * 12);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setViewMode("days");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleToggle() {
    setOpen((o) => {
      if (!o) setViewMode("days");
      return !o;
    });
  }

  function handleSelectMonth(monthIndex: number) {
    const updated = setMonth(viewDate, monthIndex);
    setViewDate(updated);
    setViewMode("days");
  }

  function handleSelectYear(year: number) {
    const updated = setYear(viewDate, year);
    setViewDate(updated);
    setYearRangeStart(Math.floor(year / 12) * 12);
    setViewMode("months");
  }

  const currentMonth = getMonth(viewDate);
  const currentYear = getYear(viewDate);

  const monthLabel = format(viewDate, "MMMM yyyy", { locale: ptBR });
  const monthLabelCapitalized =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          readOnly
          value={displayValue}
          placeholder={placeholder}
          onClick={handleToggle}
          className="w-full px-3 py-2 pr-9 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 cursor-pointer"
        />
        <button
          type="button"
          onClick={handleToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-[var(--surface-card)] shadow-[var(--shadow-dropdown)] w-[280px]">

          {/* ── Cabeçalho clicável ── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              type="button"
              onClick={() => {
                if (viewMode === "days") setViewDate((d) => setMonth(d, currentMonth - 1));
                else if (viewMode === "months") setYearRangeStart((y) => y - 12);
                else if (viewMode === "years") setYearRangeStart((y) => y - 12);
              }}
              className="p-1 rounded hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode((m) =>
                  m === "days" ? "months" : m === "months" ? "years" : "days"
                )
              }
              className="flex-1 text-center text-[var(--font-size-small)] font-semibold text-[var(--text-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--surface-card-hover)] rounded px-2 py-1 transition-colors"
            >
              {viewMode === "days" && monthLabelCapitalized}
              {viewMode === "months" && currentYear}
              {viewMode === "years" && `${yearRangeStart} – ${yearRangeStart + 11}`}
            </button>

            <button
              type="button"
              onClick={() => {
                if (viewMode === "days") setViewDate((d) => setMonth(d, currentMonth + 1));
                else if (viewMode === "months") setYearRangeStart((y) => y + 12);
                else if (viewMode === "years") setYearRangeStart((y) => y + 12);
              }}
              className="p-1 rounded hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── Seletor de meses ── */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-1 px-3 pb-4">
              {MESES.map((mes, i) => (
                <button
                  key={mes}
                  type="button"
                  onClick={() => handleSelectMonth(i)}
                  className={`py-2 rounded-[var(--radius-md)] text-[var(--font-size-small)] font-medium transition-colors
                    ${i === currentMonth
                      ? "bg-[var(--color-primary)] text-white"
                      : "hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)]"
                    }`}
                >
                  {mes}
                </button>
              ))}
            </div>
          )}

          {/* ── Seletor de anos ── */}
          {viewMode === "years" && (
            <div className="grid grid-cols-3 gap-1 px-3 pb-4">
              {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleSelectYear(year)}
                  className={`py-2 rounded-[var(--radius-md)] text-[var(--font-size-small)] font-medium transition-colors
                    ${year === currentYear
                      ? "bg-[var(--color-primary)] text-white"
                      : "hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)]"
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* ── Calendário de dias ── */}
          {viewMode === "days" && (
            <DayPicker
              mode="single"
              selected={selectedDate}
              month={viewDate}
              onMonthChange={setViewDate}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, "yyyy-MM-dd"));
                } else {
                  onChange(null);
                }
                setOpen(false);
                setViewMode("days");
              }}
              locale={ptBR}
              hideNavigation
              className="px-3 pb-3 pt-0"
            />
          )}

          {/* ── Botão limpar ── */}
          {value && viewMode === "days" && (
            <div className="px-3 pb-3 -mt-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full text-center text-[var(--font-size-small)] text-[var(--text-tertiary)] hover:text-[var(--color-error)] py-1"
              >
                Limpar data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
