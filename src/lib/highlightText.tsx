import React from "react";

interface HighlightTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export function HighlightText({ text, searchTerm, className }: HighlightTextProps) {
  if (!searchTerm || !searchTerm.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Escapar caracteres especiais de regex
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-yellow-200 dark:bg-yellow-500/40 text-foreground px-0.5 rounded-sm"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}
