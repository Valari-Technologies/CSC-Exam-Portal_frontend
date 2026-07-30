import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  containerClassName?: string;
  listClassName?: string;
  disabled?: boolean;
}

export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      onChange,
      placeholder = 'Select option...',
      className,
      containerClassName,
      listClassName,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state with controlled prop changes
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }
      if (open) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [open]);

    const handleSelect = (val: string) => {
      if (disabled) return;
      setSelectedValue(val);
      setOpen(false);
      if (onChange) {
        onChange(val);
      }
    };

    const currentOption = options.find((opt) => opt.value === selectedValue);
    const displayLabel = currentOption ? currentOption.label : placeholder;

    return (
      <div ref={containerRef} className={cn("relative w-full", containerClassName)}>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            "flex items-center justify-between gap-2 w-full py-2 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm font-semibold transition-all hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-left",
            className
          )}
          {...props}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0",
              open && "rotate-180 text-indigo-500"
            )}
          />
        </button>

        {open && (
          <div
            className={cn(
              "absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl py-1 z-50 custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200",
              listClassName
            )}
          >
            {options.length === 0 ? (
              <div className="px-4 py-2.5 text-xs font-semibold text-slate-400 text-center">
                No options available
              </div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors",
                    selectedValue === opt.value
                      ? "text-indigo-600 bg-indigo-50/50"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
);

CustomSelect.displayName = 'CustomSelect';
