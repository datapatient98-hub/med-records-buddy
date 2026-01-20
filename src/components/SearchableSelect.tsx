import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
  emptyText?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
}

export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "اختر...",
  emptyText = "لا توجد نتائج",
  onAddNew,
  addNewLabel = "إضافة جديد",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value),
    [options, value]
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const openAndSeedQuery = (seed?: string) => {
    setOpen(true);
    if (seed) setSearchQuery((prev) => (prev ? prev : seed));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          onFocus={() => openAndSeedQuery()}
          onKeyDown={(e) => {
            // allow users to "قف على الحقل واكتب" مباشرة
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              if (!open) openAndSeedQuery(e.key);
            }
          }}
        >
          {selectedOption ? selectedOption.name : placeholder}
          <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            ref={inputRef}
            placeholder="ابحث..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.id}
                value={option.name}
                onSelect={() => {
                  onValueChange(option.id === value ? "" : option.id);
                  setOpen(false);
                  setSearchQuery("");
                }}
              >
                <Check
                  className={cn(
                    "ml-2 h-4 w-4",
                    value === option.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.name}
              </CommandItem>
            ))}
          </CommandGroup>
          {onAddNew && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onAddNew();
                  setOpen(false);
                  setSearchQuery("");
                }}
              >
                <Plus className="ml-2 h-4 w-4" />
                {addNewLabel}
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
