import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
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
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sync state with controlled prop changes
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    useEffect(() => {
      if (!open) {
        setSearchTerm('');
      } else if (searchable) {
        // Focus the search input when the dropdown opens
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }, [open, searchable]);

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

        {open && (
          <div
            className={cn(
              "absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-popover border-2 border-slate-100 rounded-2xl shadow-xl py-1 z-50 custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200",
              listClassName
            )}
          >
            {searchable && (
              <div className="px-2 py-1.5 border-b border-slate-100 sticky top-0 bg-popover z-10 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400 ml-1.5 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent form submission on Enter inside the search input
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // If there is exactly one filtered option, select it on Enter
                      if (filteredOptions.length === 1) {
                        handleSelect(filteredOptions[0].value);
                      }
                    }
                  }}
                  className="w-full pr-3 py-1.5 text-xs bg-transparent text-foreground outline-none"
                />
              </div>
            )}
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
