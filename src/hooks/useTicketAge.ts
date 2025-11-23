import { useEffect, useState } from "react";
import { differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

export function useTicketAge(createdAt: string, resolvedAt: string | null) {
  const [age, setAge] = useState("");
  
  useEffect(() => {
    const calculateAge = () => {
      const startDate = new Date(createdAt);
      const endDate = resolvedAt ? new Date(resolvedAt) : new Date();
      
      const minutes = differenceInMinutes(endDate, startDate);
      const hours = differenceInHours(endDate, startDate);
      const days = differenceInDays(endDate, startDate);
      
      if (days > 0) {
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
      } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}min`;
      } else {
        return `${minutes}min`;
      }
    };
    
    setAge(calculateAge());
    
    // Se não está resolvido, atualizar a cada minuto
    if (!resolvedAt) {
      const interval = setInterval(() => {
        setAge(calculateAge());
      }, 60000); // 60 segundos
      
      return () => clearInterval(interval);
    }
  }, [createdAt, resolvedAt]);
  
  return age;
}
