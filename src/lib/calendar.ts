import "server-only";
import type { PublicEvent } from "@/lib/events";

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// iCalendar lines must be folded at 75 bytes; continuation lines start with a space.
function fold(line: string) {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > 73) {
      parts.push(current);
      current = ch;
      bytes = size;
    } else {
      current += ch;
      bytes += size;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function whereText(event: PublicEvent) {
  return [event.venue_name, event.address].filter(Boolean).join(", ");
}

function range(event: PublicEvent) {
  const start = new Date(event.starts_at);
  return { start, end: new Date(start.getTime() + DEFAULT_DURATION_MS) };
}

export function buildIcs(event: PublicEvent, inviteUrl: string) {
  const { start, end } = range(event);
  const description = [event.message, inviteUrl].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//weInvite//Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.slug}@gharinvite`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(whereText(event) ? [`LOCATION:${escapeText(whereText(event))}`] : []),
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${inviteUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function googleCalendarUrl(event: PublicEvent, inviteUrl: string) {
  const { start, end } = range(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: [event.message, inviteUrl].filter(Boolean).join("\n\n"),
    location: whereText(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
