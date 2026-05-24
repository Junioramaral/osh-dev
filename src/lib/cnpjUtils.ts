/**
 * Utilitários para máscara e validação de CNPJ.
 * Formato: 00.000.000/0000-00
 */

export function unformatCnpj(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "").slice(0, 14);
}

export function formatCnpj(value: string | null | undefined): string {
  const digits = unformatCnpj(value);
  if (!digits) return "";
  let out = digits;
  if (digits.length > 2) out = digits.slice(0, 2) + "." + digits.slice(2);
  if (digits.length > 5) out = out.slice(0, 6) + "." + out.slice(6);
  if (digits.length > 8) out = out.slice(0, 10) + "/" + out.slice(10);
  if (digits.length > 12) out = out.slice(0, 15) + "-" + out.slice(15);
  return out;
}

export function isValidCnpjLength(value: string | null | undefined): boolean {
  return unformatCnpj(value).length === 14;
}