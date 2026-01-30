/**
 * Time Log Permission Utilities
 * 
 * Rules:
 * - Analysts can edit/delete their own logs within 48 business hours
 * - Friday logs extend to Monday (24h Friday + weekend + 24h Monday)
 * - Super Admin and Tenant Admin have full access without time limits
 * - Viewers have read-only access
 */

export interface TimeLogPermissions {
  canEdit: boolean;
  canDelete: boolean;
  reason?: string;
}

export interface TimeLogData {
  analyst_id: string;
  logged_at: string;
}

/**
 * Check if a date is within 48 business hours
 * Accounts for weekends: Friday logs can be edited until Monday at the same time
 */
export function isWithin48BusinessHours(loggedAt: Date): boolean {
  const now = new Date();
  const logDate = new Date(loggedAt);
  const dayOfWeek = logDate.getDay();
  
  let deadline = new Date(logDate);
  
  // Friday (5): add 3 days to skip weekend (effectively Monday same time)
  if (dayOfWeek === 5) {
    deadline.setDate(deadline.getDate() + 3);
  }
  // Saturday (6): add 2 days to get to Monday + 48h
  else if (dayOfWeek === 6) {
    deadline.setDate(deadline.getDate() + 2);
    deadline.setHours(deadline.getHours() + 48);
  }
  // Sunday (0): add 1 day to get to Monday + 48h
  else if (dayOfWeek === 0) {
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(deadline.getHours() + 48);
  }
  // Monday to Thursday: simple 48h
  else {
    deadline.setHours(deadline.getHours() + 48);
  }
  
  return now <= deadline;
}

/**
 * Get time log permissions based on user role and log ownership
 */
export function getTimeLogPermissions(
  log: TimeLogData,
  currentUserId: string | undefined,
  isSuperAdmin: boolean,
  isTenantAdmin: boolean,
  isViewer: boolean
): TimeLogPermissions {
  // Not authenticated
  if (!currentUserId) {
    return { canEdit: false, canDelete: false, reason: "Usuário não autenticado" };
  }
  
  // Viewers cannot edit/delete anything
  if (isViewer) {
    return { canEdit: false, canDelete: false, reason: "Modo somente leitura" };
  }
  
  // Super Admin and Tenant Admin have full access
  if (isSuperAdmin || isTenantAdmin) {
    return { canEdit: true, canDelete: true };
  }
  
  // Analysts can only edit their own logs
  if (log.analyst_id !== currentUserId) {
    return { canEdit: false, canDelete: false, reason: "Apenas o autor pode editar" };
  }
  
  // Check 48 business hours deadline
  const withinDeadline = isWithin48BusinessHours(new Date(log.logged_at));
  if (!withinDeadline) {
    return { canEdit: false, canDelete: false, reason: "Prazo de 48h expirado" };
  }
  
  return { canEdit: true, canDelete: true };
}
