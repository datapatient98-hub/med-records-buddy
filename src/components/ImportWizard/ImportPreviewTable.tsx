 import * as React from "react";
 import { useEffect, useMemo, useRef, useState } from "react";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
 import { normalizeCellValue } from "@/lib/excel/normalizeArabic";
 
 type PreviewRow = Record<string, unknown> & { __sourceIndex?: number };
 
 const BATCH_SIZE = 100;
 
 interface ImportPreviewTableProps {
   headers: string[];
   rows: PreviewRow[];
   rowNumberMode?: "preview" | "source";
   searchable?: boolean;
 }
 
 export default function ImportPreviewTable({
   headers,
   rows,
   rowNumberMode = "preview",
   searchable = false,
 }: ImportPreviewTableProps) {
   const scrollRef = useRef<HTMLDivElement | null>(null);
   const bottomRef = useRef<HTMLDivElement | null>(null);
   const [scrollWidth, setScrollWidth] = useState(0);
   const [displayedRows, setDisplayedRows] = useState<PreviewRow[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
 
   useEffect(() => {
     setDisplayedRows(rows.slice(0, BATCH_SIZE));
   }, [rows]);
 
   const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
     const el = e.currentTarget;
     const bottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
     if (bottom && displayedRows.length < rows.length) {
       setDisplayedRows((prev) => [...prev, ...rows.slice(prev.length, prev.length + BATCH_SIZE)]);
     }
     if (bottomRef.current) bottomRef.current.scrollLeft = el.scrollLeft;
   };
 
   const syncTop = () => {
     if (!scrollRef.current || !bottomRef.current) return;
     scrollRef.current.scrollLeft = bottomRef.current.scrollLeft;
   };
 
   const scrollToStart = () => {
     if (!scrollRef.current || !bottomRef.current) return;
     scrollRef.current.scrollLeft = 0;
     bottomRef.current.scrollLeft = 0;
   };
 
   const scrollToEnd = () => {
     if (!scrollRef.current || !bottomRef.current) return;
    const tableElement = scrollRef.current.querySelector('table');
    const end = Math.max((tableElement?.scrollWidth ?? scrollRef.current.scrollWidth ?? 0) - (scrollRef.current.clientWidth ?? 0), 0);
     scrollRef.current.scrollLeft = end;
     bottomRef.current.scrollLeft = end;
   };
 
   const jumpToColumn = (col: string) => {
     if (!scrollRef.current) return;
     const idx = headers.indexOf(col);
     if (idx < 0) return;
    const cellWidth = 200;
     scrollRef.current.scrollLeft = idx * cellWidth;
    if (bottomRef.current) bottomRef.current.scrollLeft = idx * cellWidth;
   };
 
   useEffect(() => {
    const update = () => {
      const tableElement = scrollRef.current?.querySelector('table');
      setScrollWidth(tableElement?.scrollWidth ?? scrollRef.current?.scrollWidth ?? 0);
    };
     const t = window.setTimeout(() => window.requestAnimationFrame(update), 0);
     window.addEventListener("resize", update);
     return () => {
       window.clearTimeout(t);
       window.removeEventListener("resize", update);
     };
   }, [headers, displayedRows.length]);
 
   const filteredRows = useMemo(() => {
     if (!searchTerm.trim()) return displayedRows;
     const term = searchTerm.toLowerCase();
     return displayedRows.filter((r) =>
       headers.some((h) => String(normalizeCellValue(r[h]) ?? "").toLowerCase().includes(term))
     );
   }, [displayedRows, searchTerm, headers]);
 
   return (
     <div className="space-y-3">
       {searchable && (
         <div className="flex items-center gap-3" dir="rtl">
           <div className="relative flex-1">
             <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
             <Input
               placeholder="بحث في الصفوف..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pr-10"
             />
           </div>
           <Select value={selectedColumn ?? ""} onValueChange={(v) => { setSelectedColumn(v); jumpToColumn(v); }}>
             <SelectTrigger className="w-[200px]">
               <SelectValue placeholder="انتقل لعمود" />
             </SelectTrigger>
             <SelectContent>
               {headers.map((h) => (
                 <SelectItem key={h} value={h}>
                   {h}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
       )}
 
       <div className="rounded-md border">
         <div
           ref={scrollRef}
            className="h-[35vh] w-full overflow-x-auto overflow-y-auto"
           dir="ltr"
           onScroll={handleScroll}
         >
            <Table className="w-max">
              <TableHeader className="sticky top-0 z-10 bg-background">
                 <TableRow>
                    <TableHead className="w-[60px] whitespace-nowrap text-right">#</TableHead>
                   {headers.map((h) => (
                    <TableHead key={h} className="min-w-[180px] max-w-[250px] whitespace-nowrap text-right">
                       {h}
                     </TableHead>
                   ))}
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredRows.map((r, idx) => (
                   <TableRow key={idx}>
                      <TableCell className="w-[60px] whitespace-nowrap text-right text-xs text-muted-foreground">
                       {rowNumberMode === "source" ? Number(r.__sourceIndex ?? idx) + 2 : idx + 1}
                     </TableCell>
                     {headers.map((h) => (
                      <TableCell key={h} className="min-w-[180px] max-w-[250px] truncate text-right text-sm" title={String(normalizeCellValue(r[h]) ?? "")}>
                         {normalizeCellValue(r[h])}
                       </TableCell>
                     ))}
                   </TableRow>
                 ))}
              </TableBody>
            </Table>
         </div>
 
          <div className="border-t bg-muted/30 px-3 py-2.5" dir="rtl">
            <div className="flex items-center justify-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={scrollToEnd} className="gap-1.5 text-xs">
                <ChevronsLeft className="h-5 w-5" />
                <span className="font-medium">البداية</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                if (!scrollRef.current) return;
                scrollRef.current.scrollLeft += 300;
                if (bottomRef.current) bottomRef.current.scrollLeft += 300;
              }} className="gap-1.5 text-xs">
                <ChevronLeft className="h-5 w-5" />
                <span className="font-medium">يمين</span>
              </Button>
              <div className="flex-1 max-w-sm">
                <div
                  ref={bottomRef}
                  className="h-7 w-full overflow-x-scroll overflow-y-hidden rounded border bg-background"
                  onScroll={syncTop}
                  aria-label="شريط تمرير أفقي"
                >
                  <div style={{ width: `${Math.max(scrollWidth, 1)}px` }} className="h-6" />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                if (!scrollRef.current) return;
                scrollRef.current.scrollLeft -= 300;
                if (bottomRef.current) bottomRef.current.scrollLeft -= 300;
              }} className="gap-1.5 text-xs">
                <span className="font-medium">يسار</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={scrollToStart} className="gap-1.5 text-xs">
                <span className="font-medium">النهاية</span>
                <ChevronsRight className="h-4 w-4" />
             </Button>
           </div>
         </div>
 
         <div className="px-3 py-2 text-xs text-muted-foreground" dir="rtl">
           عرض {Math.min(filteredRows.length, displayedRows.length)} من {rows.length} صف
           {searchTerm && ` (مُصفّى من ${displayedRows.length})`}
         </div>
       </div>
     </div>
   );
 }