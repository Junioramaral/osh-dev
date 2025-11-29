interface TicketCountBadgeProps {
  count: number;
}

export const TicketCountBadge = ({ count }: TicketCountBadgeProps) => {
  if (count === 0) return null;

  const getColorClasses = () => {
    if (count <= 5) return "bg-green-500 text-white";
    if (count <= 15) return "bg-yellow-500 text-black";
    return "bg-red-500 text-white";
  };

  const displayCount = count > 99 ? "99+" : count;

  return (
    <span 
      className={`ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center 
        text-xs font-semibold rounded-full ${getColorClasses()}`}
    >
      {displayCount}
    </span>
  );
};
