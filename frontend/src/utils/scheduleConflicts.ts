/**
 * Schedule Conflict Detection Utility
 *
 * Provides functions to detect and prevent scheduling conflicts for teachers
 *
 * Related Tasks: T096 [US4] Implement schedule conflict detection
 */

export interface TimeSlot {
  start: Date;
  end: Date;
  id?: string;
  title?: string;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  conflictingSlots: TimeSlot[];
  message?: string;
}

/**
 * Check if two time slots overlap
 */
export function doSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  // Slots overlap if:
  // - slot1 starts before slot2 ends AND
  // - slot1 ends after slot2 starts
  return slot1.start < slot2.end && slot1.end > slot2.start;
}

/**
 * Find all conflicting slots for a given time slot
 */
export function findConflicts(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[],
  excludeId?: string
): ScheduleConflict {
  const conflicts = existingSlots.filter((existing) => {
    // Skip if this is the slot being updated
    if (excludeId && existing.id === excludeId) {
      return false;
    }

    return doSlotsOverlap(newSlot, existing);
  });

  return {
    hasConflict: conflicts.length > 0,
    conflictingSlots: conflicts,
    message:
      conflicts.length > 0
        ? `Conflicts with ${conflicts.length} existing class${conflicts.length > 1 ? 'es' : ''}`
        : undefined,
  };
}

/**
 * Check if a time slot falls within teacher's availability
 */
export function isWithinAvailability(
  slot: TimeSlot,
  availabilitySlots: TimeSlot[]
): boolean {
  // Check if the entire slot falls within at least one availability window
  return availabilitySlots.some((availability) => {
    return slot.start >= availability.start && slot.end <= availability.end;
  });
}

/**
 * Get the duration of a time slot in minutes
 */
export function getSlotDuration(slot: TimeSlot): number {
  return Math.round((slot.end.getTime() - slot.start.getTime()) / (1000 * 60));
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(slot: TimeSlot): string {
  const startTime = slot.start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = slot.end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = slot.start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${date} ${startTime} - ${endTime}`;
}

/**
 * Create a time slot from scheduled_at and duration
 */
export function createTimeSlot(
  scheduledAt: string | Date,
  durationMinutes: number,
  id?: string,
  title?: string
): TimeSlot {
  const start = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return { start, end, id, title };
}

/**
 * Check if a slot starts in the future (at least minHours from now)
 */
export function isFutureSlot(slot: TimeSlot, minHours: number = 24): boolean {
  const now = new Date();
  const minStartTime = new Date(now.getTime() + minHours * 60 * 60 * 1000);

  return slot.start >= minStartTime;
}

/**
 * Get all time slots for a specific date
 */
export function getSlotsForDate(slots: TimeSlot[], date: Date): TimeSlot[] {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  return slots.filter((slot) => {
    return slot.start >= targetDate && slot.start < nextDate;
  });
}

/**
 * Group time slots by date
 */
export function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>();

  slots.forEach((slot) => {
    const dateKey = slot.start.toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, slot]);
  });

  return grouped;
}

/**
 * Check for buffer time between slots
 */
export function hasBufferTime(
  slot1: TimeSlot,
  slot2: TimeSlot,
  bufferMinutes: number = 15
): boolean {
  const gap1 = (slot2.start.getTime() - slot1.end.getTime()) / (1000 * 60);
  const gap2 = (slot1.start.getTime() - slot2.end.getTime()) / (1000 * 60);

  // Return true if there's enough gap in either direction
  return gap1 >= bufferMinutes || gap2 >= bufferMinutes;
}

/**
 * Find available time slots between existing slots
 */
export function findAvailableSlots(
  existingSlots: TimeSlot[],
  date: Date,
  slotDuration: number,
  workHoursStart: number = 0, // midnight
  workHoursEnd: number = 24 // midnight (full day)
): TimeSlot[] {
  const available: TimeSlot[] = [];

  // Sort existing slots by start time
  const sortedSlots = [...existingSlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const dayStart = new Date(date);
  dayStart.setHours(workHoursStart, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(workHoursEnd, 0, 0, 0);

  let currentTime = dayStart;

  sortedSlots.forEach((slot) => {
    // Check if there's a gap before this slot
    const gapMinutes = (slot.start.getTime() - currentTime.getTime()) / (1000 * 60);

    if (gapMinutes >= slotDuration) {
      available.push({
        start: new Date(currentTime),
        end: new Date(slot.start),
      });
    }

    currentTime = new Date(Math.max(currentTime.getTime(), slot.end.getTime()));
  });

  // Check for availability after the last slot
  const remainingMinutes = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60);
  if (remainingMinutes >= slotDuration) {
    available.push({
      start: new Date(currentTime),
      end: new Date(dayEnd),
    });
  }

  return available;
}

/**
 * Validate a class schedule against conflicts and business rules
 */
export interface ScheduleValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSchedule(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[],
  availabilitySlots: TimeSlot[],
  excludeId?: string
): ScheduleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if in the future
  if (!isFutureSlot(newSlot, 24)) {
    errors.push('Class must be scheduled at least 24 hours in advance');
  }

  // Check for conflicts
  const conflicts = findConflicts(newSlot, existingSlots, excludeId);
  if (conflicts.hasConflict) {
    errors.push(
      `Schedule conflicts with: ${conflicts.conflictingSlots
        .map((s) => s.title || 'existing class')
        .join(', ')}`
    );
  }

  // Check availability
  if (availabilitySlots.length > 0 && !isWithinAvailability(newSlot, availabilitySlots)) {
    warnings.push('This time is outside your regular availability hours');
  }

  // Check duration
  const duration = getSlotDuration(newSlot);
  if (duration < 25) {
    errors.push('Class duration must be at least 25 minutes');
  }
  if (duration > 120) {
    errors.push('Class duration cannot exceed 120 minutes');
  }

  // Check buffer time with nearby slots
  const nearbySlots = existingSlots.filter(
    (slot) => !excludeId || slot.id !== excludeId
  );
  const hasNoBuffer = nearbySlots.some((slot) => !hasBufferTime(newSlot, slot, 10));

  if (hasNoBuffer) {
    warnings.push('Less than 10 minutes between classes may be challenging');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
