 import KPICard from "@/components/KPICard";
 
 interface ImportKPICardsProps {
   totalRows: number;
   importRows: number;
   duplicateRows: number;
   errorRows: number;
 }
 
 export default function ImportKPICards({ totalRows, importRows, duplicateRows, errorRows }: ImportKPICardsProps) {
   return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <KPICard title="إجمالي الصفوف" value={totalRows} colorScheme="cyan" />
       <KPICard title="سيتم استيرادها" value={importRows} colorScheme="green" />
       <KPICard title="مكرر حرفياً" value={duplicateRows} colorScheme="orange" />
       <KPICard title="بها أخطاء" value={errorRows} colorScheme="pink" />
     </div>
   );
 }