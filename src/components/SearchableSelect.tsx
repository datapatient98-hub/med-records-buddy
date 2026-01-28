import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
  emptyText?: string;
  onAddNew?: () => void;
  onManage?: () => void;
  addNewLabel?: string;
  /** Show clear (X) button to فقط مسح الاختيار بدون حذف العنصر */
  allowClear?: boolean;
  disabled?: boolean;
}

const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(function SearchableSelect(
  {
    value,
    onValueChange,
    options,
    placeholder = "اختر...",
    emptyText = "لا توجد نتائج",
    onAddNew,
    onManage,
    addNewLabel = "إضافة جديد",
    allowClear = true,
    disabled = false,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value),
    [options, value]
  );

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Keep the field snappy: clear search when closed or when value changes from outside.
  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  useEffect(() => {
    // When parent sets a new value (e.g. after quick-add), close & reset.
    setOpen(false);
    setSearchQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  return (
    <div className="relative w-full">
      <Popover
        open={open}
        onOpenChange={(v) => {
          if (disabled) return;
          setOpen(v);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-right pr-3"
            disabled={disabled}
          >
            <span className="flex-1 text-right truncate">
              {selectedOption ? selectedOption.name : placeholder}
            </span>

            {/* IMPORTANT: avoid nesting <button> inside <button> (invalid HTML) */}
            {allowClear && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onValueChange("");
                  }
                }}
                className="ml-2 h-6 w-6 rounded-sm border border-border hover:bg-accent flex items-center justify-center cursor-pointer select-none"
                aria-label="مسح الاختيار"
                title="مسح الاختيار"
              >
                <span className="text-xs text-muted-foreground">×</span>
              </span>
            )}
            {(onAddNew || onManage) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-2 mr-2 flex items-center gap-1">
                      {onManage && !disabled && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            setSearchQuery("");
                            onManage();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpen(false);
                              setSearchQuery("");
                              onManage();
                            }
                          }}
                          className="flex-shrink-0 h-6 w-6 rounded-sm hover:bg-accent flex items-center justify-center transition-colors border border-border"
                          aria-label="تعديل القائمة"
                          title="تعديل القائمة"
                        >
                          <Pencil className="h-3.5 w-3.5 text-foreground" />
                        </span>
                      )}

                      {onAddNew && !disabled && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            setSearchQuery("");
                            onAddNew();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpen(false);
                              setSearchQuery("");
                              onAddNew();
                            }
                          }}
                          className="flex-shrink-0 h-6 w-6 rounded-sm hover:bg-primary/10 flex items-center justify-center transition-colors border border-primary/20"
                          aria-label={addNewLabel}
                          title={addNewLabel}
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{addNewLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder="ابحث..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-right"
              disabled={disabled}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onValueChange(option.id);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center justify-between"
                  >
                    <span>{option.name}</span>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

export default SearchableSelect;

