import { cn } from "@/lib/utils";

interface GradientSeparatorProps {
  className?: string;
  variant?: "primary" | "sidebar" | "subtle";
}

export function GradientSeparator({ 
  className, 
  variant = "primary" 
}: GradientSeparatorProps) {
  const variants = {
    primary: "bg-gradient-to-r from-primary via-accent to-primary",
    sidebar: "bg-gradient-to-r from-sidebar-primary via-accent to-sidebar-primary",
    subtle: "bg-gradient-to-r from-transparent via-border to-transparent",
  };

  return (
    <div 
      className={cn(
        "h-[2px] w-full my-3",
        variants[variant],
        className
      )} 
    />
  );
}
