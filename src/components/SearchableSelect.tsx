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
  /** Callback when new item is created via dialog */
  onItemCreated?: (item: { id: string; name: string }) => void;
}

export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "اختر...",
  emptyText = "لا توجد نتائج",
  onAddNew,
  onManage,
  addNewLabel = "إضافة جديد",
  onItemCreated,
}: SearchableSelectProps) {
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

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-right pr-3"
          >
            <span className="flex-1 text-right truncate">
              {selectedOption ? selectedOption.name : placeholder}
            </span>
            {(onAddNew || onManage) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-2 mr-2 flex items-center gap-1">
                      {onManage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onManage();
                          }}
                          className="flex-shrink-0 h-6 w-6 rounded-sm hover:bg-accent flex items-center justify-center transition-colors border border-border"
                          aria-label="تعديل القائمة"
                          title="تعديل القائمة"
                        >
                          <Pencil className="h-3.5 w-3.5 text-foreground" />
                        </button>
                      )}

                      {onAddNew && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddNew();
                          }}
                          className="flex-shrink-0 h-6 w-6 rounded-sm hover:bg-primary/10 flex items-center justify-center transition-colors border border-primary/20"
                          aria-label={addNewLabel}
                          title={addNewLabel}
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </button>
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
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onValueChange(option.id === value ? "" : option.id);
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
}
