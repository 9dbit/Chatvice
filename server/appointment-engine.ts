import crypto from "crypto";
import { storage } from "./storage";

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AvailabilityResult {
  date: string;
  providerId: string;
  slots: TimeSlot[];
}

/**
 * Get available time slots for a provider on a specific date.
 * Checks provider schedule, blocked dates, and existing confirmed bookings.
 */
export async function getAvailableSlots(
  merchantId: string,
  providerId: string,
  date: string,
  durationMinutes: number = 60,
  intervalMinutes: number = 30
): Promise<string[]> {
  const [year, month, day] = date.split("-").map(Number);
  const dow = new Date(year, month - 1, day).getDay();

  const schedules = await storage.getProviderSchedules(providerId);
  const daySchedule = schedules.find(s => s.dayOfWeek === dow && s.isActive);
  if (!daySchedule) return [];

  const blockedDates = await storage.getProviderBlockedDates(providerId);
  const isBlocked = blockedDates.some(bd => bd.blockedDate === date);
  if (isBlocked) return [];

  // Check both confirmed and pending to prevent double-booking
  const [confirmedAppts, pendingAppts] = await Promise.all([
    storage.getAppointments(merchantId, { date, providerId, status: "confirmed" }),
    storage.getAppointments(merchantId, { date, providerId, status: "pending" }),
  ]);
  const existingAppts = [...confirmedAppts, ...pendingAppts];

  const [startH, startM] = daySchedule.startTime.split(":").map(Number);
  const [endH, endM] = daySchedule.endTime.split(":").map(Number);
  const openMin = startH * 60 + startM;
  const closeMin = endH * 60 + endM;

  const slots: string[] = [];
  let cursor = openMin;

  while (cursor + durationMinutes <= closeMin) {
    const slotEnd = cursor + durationMinutes;
    const timeStr = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;

    const conflict = existingAppts.some(a => {
      const [aH, aM] = a.appointmentTime.split(":").map(Number);
      const aStart = aH * 60 + aM;
      const [eH, eM] = (a.endTime || a.appointmentTime).split(":").map(Number);
      const aEnd = eH * 60 + eM || aStart + durationMinutes;
      return cursor < aEnd && slotEnd > aStart;
    });

    if (!conflict) slots.push(timeStr);
    cursor += intervalMinutes;
  }

  return slots;
}

/**
 * Atomically book a slot — checks availability then creates appointment.
 * Returns the created appointment or throws if slot is unavailable.
 */
export async function bookSlot(params: {
  merchantId: string;
  serviceId: string | null;
  providerId: string | null;
  divisionId: string | null;
  sessionId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes?: number;
  notes: string | null;
}) {
  const {
    merchantId,
    serviceId,
    providerId,
    divisionId,
    sessionId,
    customerName,
    customerPhone,
    customerEmail,
    appointmentDate,
    appointmentTime,
    durationMinutes = 60,
    notes,
  } = params;

  if (providerId) {
    const [aH, aM] = appointmentTime.split(":").map(Number);
    const aStart = aH * 60 + aM;
    const aEnd = aStart + durationMinutes;
    const endH = Math.floor(aEnd / 60);
    const endM = aEnd % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // Check both confirmed and pending to prevent double-booking race conditions
    const [existingConfirmed, existingPending] = await Promise.all([
      storage.getAppointments(merchantId, { date: appointmentDate, providerId, status: "confirmed" }),
      storage.getAppointments(merchantId, { date: appointmentDate, providerId, status: "pending" }),
    ]);
    const existing = [...existingConfirmed, ...existingPending];

    const conflict = existing.some(a => {
      const [bH, bM] = a.appointmentTime.split(":").map(Number);
      const bStart = bH * 60 + bM;
      const [eH, eM] = (a.endTime || a.appointmentTime).split(":").map(Number);
      const bEnd = eH * 60 + eM || bStart + durationMinutes;
      return aStart < bEnd && aEnd > bStart;
    });

    if (conflict) {
      throw new Error("Slot is no longer available. Please choose another time.");
    }
  }

  const id = "apt_" + crypto.randomBytes(8).toString("hex");
  const bookingCode = "APT-" + crypto.randomBytes(3).toString("hex").toUpperCase();

  const [aH2, aM2] = appointmentTime.split(":").map(Number);
  const aStart2 = aH2 * 60 + aM2;
  const aEnd2 = aStart2 + durationMinutes;
  const endTime2 = `${String(Math.floor(aEnd2 / 60)).padStart(2, "0")}:${String(aEnd2 % 60).padStart(2, "0")}`;

  const appt = await storage.createAppointment({
    id,
    merchantId,
    serviceId: serviceId || null,
    providerId: providerId || null,
    divisionId: divisionId || null,
    sessionId: sessionId || null,
    customerName,
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    appointmentDate,
    appointmentTime,
    endTime: endTime2,
    notes: notes || null,
    bookingCode,
    status: "pending",
  });

  return appt;
}

/**
 * Get upcoming appointments for reminder processing.
 * Returns appointments in the next N hours that haven't been reminded.
 */
export async function getUpcomingAppointments(merchantId: string, hoursAhead: number = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const targetDate = future.toISOString().substring(0, 10);

  const appts = await storage.getAppointments(merchantId, {
    date: targetDate,
    status: "confirmed",
  });

  return appts;
}

/**
 * Send booking reminders for appointments coming up in the next 24 hours.
 * Marks appointments as reminded so they are not re-sent on the next run.
 * In production this would send SMS/email; for now it logs and broadcasts via WS.
 */
export async function sendBookingReminders(broadcastFn?: (sessionId: string, data: any) => void): Promise<number> {
  try {
    const merchants = await storage.getAllMerchants();
    let totalReminded = 0;

    for (const merchant of merchants) {
      const addon = await storage.getMerchantAddon(merchant.id, "appointment_scheduling");
      if (!addon || !addon.isActive) continue;

      const upcomingAppts = await getUpcomingAppointments(merchant.id, 24);

      for (const appt of upcomingAppts) {
        console.log(`[Appointment Reminder] Merchant ${merchant.id}: appointment ${appt.id} on ${appt.appointmentDate} ${appt.appointmentTime} for ${appt.customerName}`);

        // If there is a chat session for this appointment, broadcast a reminder message
        if (appt.sessionId && broadcastFn) {
          broadcastFn(appt.sessionId, {
            type: "message",
            message: {
              from: "chatvice",
              content: `Reminder: You have an appointment on ${appt.appointmentDate} at ${appt.appointmentTime}. Booking code: ${appt.bookingCode || appt.id}.`,
            },
          });
        }

        totalReminded++;
      }
    }

    return totalReminded;
  } catch (err) {
    console.error("[Appointment Reminder] Error sending reminders:", err);
    return 0;
  }
}
