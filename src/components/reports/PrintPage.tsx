import { cn } from "@/lib/utils";

interface PrintPageProps {
  children: React.ReactNode;
  className?: string;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  fullHeight?: boolean;
}

const PrintPage = ({ 
  children, 
  className, 
  pageBreakBefore = false, 
  pageBreakAfter = true,
  fullHeight = true 
}: PrintPageProps) => (
  <div 
    className={cn(
      "bg-background print:bg-white print:p-8",
      fullHeight && "print:min-h-[267mm]",
      pageBreakBefore && "print:break-before-page",
      pageBreakAfter && "print:break-after-page",
      className
    )}
  >
    {children}
  </div>
);

export default PrintPage;
