/**
 * Remove formatação de telefone, mantendo apenas números
 * @param phone - Telefone formatado (ex: "(11) 98765-4321")
 * @returns Telefone limpo (ex: "11987654321")
 */
export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Formata telefone para exibição
 * @param phone - Telefone sem formatação (ex: "11987654321")
 * @returns Telefone formatado (ex: "(11) 98765-4321")
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  const cleaned = cleanPhone(phone);
  
  if (cleaned.length === 10) {
    // Telefone fixo: (11) 3212-3456
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    // Telefone celular: (11) 98765-4321
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
};

/**
 * Valida se telefone tem formato correto (10 ou 11 dígitos)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = cleanPhone(phone);
  return cleaned.length === 10 || cleaned.length === 11;
};
