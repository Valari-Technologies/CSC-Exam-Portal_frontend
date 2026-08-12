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
  searchable?: boolean;
  searchPlaceholder?: string;
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
      searchable = false,
      searchPlaceholder = 'Search...',
      ...props
    },
    ref
  ) => {
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state with controlled prop changes
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    useEffect(() => {
      if (!open) {
        setSearchTerm('');
      }
    }, [open]);

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

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div ref={containerRef} className={cn("relative w-full", containerClassName)}>
        {searchable ? (
          <div className="relative w-full">
            <input
              ref={ref as unknown as React.Ref<HTMLInputElement>}
              type="text"
              disabled={disabled}
              placeholder={open ? searchPlaceholder : placeholder}
              value={open ? searchTerm : (currentOption ? currentOption.label : '')}
              onFocus={() => {
                if (!disabled) {
                  setOpen(true);
                  setSearchTerm(currentOption ? currentOption.label : '');
                }
              }}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].value);
                  }
                } else if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
              className={cn(
                "flex items-center justify-between gap-2 w-full py-3 pl-4 pr-10 rounded-xl border-2 bg-background text-foreground text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed outline-none text-left",
                open
                  ? "border-indigo-600 ring-4 ring-indigo-100 bg-white scale-[1.005]"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
                className
              )}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...(props as any)}
            />
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => !disabled && setOpen(!open)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center p-1"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200 shrink-0",
                  open ? "rotate-180 text-indigo-600" : "text-slate-400"
                )}
              />
            </button>
          </div>
        ) : (
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen(!open)}
            className={cn(
              "flex items-center justify-between gap-2 w-full py-3 px-4 rounded-xl border-2 bg-background text-foreground text-sm font-medium transition-all duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed",
              open
                ? "border-indigo-600 ring-4 ring-indigo-100 bg-white scale-[1.005]"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
              className
            )}
            {...props}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200 shrink-0",
                open ? "rotate-180 text-indigo-600" : "text-slate-400"
              )}
            />
          </button>
        )}

        {open && (
          <div
            className={cn(
              "absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-popover border-2 border-slate-100 rounded-2xl shadow-xl py-1 z-50 custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200",
              listClassName
            )}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2.5 text-xs font-medium text-slate-400 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs transition-colors",
                    selectedValue === opt.value
                      ? "text-indigo-600 bg-indigo-50/50 font-bold"
                      : "text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900"
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
