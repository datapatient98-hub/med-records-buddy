 import { cn } from "@/lib/utils";
 import { CheckCircle2, Circle } from "lucide-react";
 
 interface ImportWizardStepProps {
   number: number;
   title: string;
   status: "completed" | "active" | "pending";
 }
 
 export default function ImportWizardStep({ number, title, status }: ImportWizardStepProps) {
   return (
     <div className="flex items-center gap-3">
       <div
         className={cn(
           "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-all",
          status === "completed" && "border-green bg-green text-white",
          status === "active" && "border-cyan bg-cyan text-white shadow-lg shadow-cyan/50",
           status === "pending" && "border-muted-foreground/30 bg-muted text-muted-foreground"
         )}
       >
         {status === "completed" ? (
           <CheckCircle2 className="h-6 w-6" />
         ) : (
           <Circle className={cn("h-5 w-5", status === "active" && "fill-white")} />
         )}
       </div>
       <div className="flex-1">
         <p
           className={cn(
             "text-sm font-medium transition-colors",
            status === "active" && "text-cyan",
             status === "pending" && "text-muted-foreground"
           )}
         >
           {title}
         </p>
       </div>
     </div>
   );
 }