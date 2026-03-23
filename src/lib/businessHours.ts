/**
 * Business Hours utility for SLA calculation (P3/P4 tickets)
 * Mirrors the SQL add_business_minutes() function logic
 */

export interface BusinessHoursConfig {
  startHour: number;   // e.g. 9
  startMinute: number; // e.g. 0
  endHour: number;     // e.g. 18
  endMinute: number;   // e.g. 0
  businessDays: number[]; // ISO days: 1=Mon, 7=Sun
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 9,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  businessDays: [1, 2, 3, 4, 5],
};

export function parseBusinessHoursConfig(configs: any[]): BusinessHoursConfig {
  const config = { ...DEFAULT_BUSINESS_HOURS };

  const startConfig = configs.find((c: any) => c.key === 'business_hours_start');
  if (startConfig) {
    const val = typeof startConfig.value === 'string' 
      ? startConfig.value.replace(/"/g, '') 
      : String(startConfig.value).replace(/"/g, '');
    const [h, m] = val.split(':').map(Number);
    if (!isNaN(h)) config.startHour = h;
    if (!isNaN(m)) config.startMinute = m;
  }

  const endConfig = configs.find((c: any) => c.key === 'business_hours_end');
  if (endConfig) {
    const val = typeof endConfig.value === 'string' 
      ? endConfig.value.replace(/"/g, '') 
      : String(endConfig.value).replace(/"/g, '');
    const [h, m] = val.split(':').map(Number);
    if (!isNaN(h)) config.endHour = h;
    if (!isNaN(m)) config.endMinute = m;
  }

  const daysConfig = configs.find((c: any) => c.key === 'business_days');
  if (daysConfig) {
    const val = typeof daysConfig.value === 'string' 
      ? JSON.parse(daysConfig.value) 
      : daysConfig.value;
    if (Array.isArray(val)) {
      config.businessDays = val.map(Number);
    }
  }

  return config;
}

/** Check if a priority uses business hours */
export function isBusinessHoursPriority(priority: string): boolean {
  return priority === 'P3' || priority === 'P4';
}

/** Get ISO day of week (1=Monday, 7=Sunday) */
function getISODay(date: Date): number {
  const day = date.getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

/** Get minutes from midnight for a date */
function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Get business start/end as minutes from midnight */
function getBusinessStartMinutes(config: BusinessHoursConfig): number {
  return config.startHour * 60 + config.startMinute;
}

function getBusinessEndMinutes(config: BusinessHoursConfig): number {
  return config.endHour * 60 + config.endMinute;
}

/**
 * Calculate business minutes elapsed between two dates.
 * Only counts time within business hours on business days.
 */
export function calculateBusinessMinutes(
  startDate: Date,
  endDate: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): number {
  if (endDate <= startDate) return 0;

  const bhStart = getBusinessStartMinutes(config);
  const bhEnd = getBusinessEndMinutes(config);
  const dayBusinessMinutes = bhEnd - bhStart;

  let totalMinutes = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const isoDay = getISODay(current);

    if (!config.businessDays.includes(isoDay)) {
      // Skip to next day
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, config.startMinute, 0, 0);
      continue;
    }

    const currentMinutes = getMinutesFromMidnight(current);
    
    // Clamp to business hours
    const effectiveStart = Math.max(currentMinutes, bhStart);
    
    if (effectiveStart >= bhEnd) {
      // Past business hours, move to next day
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, config.startMinute, 0, 0);
      continue;
    }

    // Calculate end of counting for this day
    const endOfDay = new Date(current);
    endOfDay.setHours(config.endHour, config.endMinute, 0, 0);
    
    const dayEnd = endDate < endOfDay ? endDate : endOfDay;
    const dayEndMinutes = getMinutesFromMidnight(dayEnd);
    
    const effectiveEnd = Math.min(dayEndMinutes, bhEnd);
    
    if (effectiveEnd > effectiveStart) {
      totalMinutes += effectiveEnd - effectiveStart;
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(config.startHour, config.startMinute, 0, 0);
  }

  return totalMinutes;
}

/**
 * Calculate remaining business minutes from now until a deadline.
 */
export function calculateBusinessMinutesRemaining(
  deadline: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): number {
  const now = new Date();
  if (now >= deadline) return -(calculateBusinessMinutes(deadline, now, config));
  return calculateBusinessMinutes(now, deadline, config);
}
