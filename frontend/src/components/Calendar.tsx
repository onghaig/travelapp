import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { CalendarEvent } from '../lib/types';

interface CalendarProps {
  events: CalendarEvent[];
  /** When changed, the calendar jumps to that date's month */
  focusDate?: Date | null;
  onEventClick?: (event: CalendarEvent) => void;
}

// ── ICS export ───────────────────────────────────────────────────────────────
function toICS(events: CalendarEvent[]): string {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Travvy//Travel Planner//EN'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@travvy`,
      `SUMMARY:${e.title}`,
      `DTSTART:${fmt(e.start_time)}`,
      `DTEND:${fmt(e.end_time)}`,
      e.location ? `LOCATION:${e.location}` : '',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParse(iso: string): Date | null {
  try { return parseISO(iso); } catch { return null; }
}

/** Returns true if `day` falls anywhere within the event's start→end span */
function eventCoversDay(event: CalendarEvent, day: Date): boolean {
  const start = safeParse(event.start_time);
  const end   = safeParse(event.end_time);
  if (!start || !end) return false;
  return isWithinInterval(startOfDay(day), { start: startOfDay(start), end: endOfDay(end) });
}

/** True if this is the first day of the event (show full label) */
function isFirstDay(event: CalendarEvent, day: Date): boolean {
  const start = safeParse(event.start_time);
  return !!start && isSameDay(start, day);
}

/** True if this is the last day of the event (rounded right corner) */
function isLastDay(event: CalendarEvent, day: Date): boolean {
  const end = safeParse(event.end_time);
  return !!end && isSameDay(end, day);
}

const TYPE_ORDER: Record<string, number> = { flight: 0, lodging: 1, event: 2 };

export default function Calendar({ events, focusDate, onEventClick }: CalendarProps) {
  // Start on the month of the earliest event, or today
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const dates = events.map((e) => safeParse(e.start_time)).filter(Boolean) as Date[];
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : new Date();
  });

  const [lastFocusDate, setLastFocusDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Jump to focusDate's month when the prop changes
  if (focusDate && focusDate !== lastFocusDate) {
    setLastFocusDate(focusDate);
    setCurrentDate(focusDate);
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const days       = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const exportICS = () => {
    const blob = new Blob([toICS(events)], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'travvy-trip.ics'; a.click();
    URL.revokeObjectURL(url);
  };

  const getEventsForDay = (day: Date) =>
    events
      .filter((e) => eventCoversDay(e, day))
      .sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9));

  return (
    <div className="bg-navy-card rounded-xl border border-slate-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-border">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft size={18} className="text-slate-muted" />
        </button>
        <h2 className="font-serif text-lg text-slate-text">{format(currentDate, 'MMMM yyyy')}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronRight size={18} className="text-slate-muted" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-slate-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-2 text-center text-xs text-slate-muted font-medium">{d}</div>
        ))}
      </div>

      {/* Days grid — 3 fixed tracks per cell: flights · events · lodging */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const colPos  = idx % 7; // 0=Sun … 6=Sat

          // Fixed tracks: 0=flight, 1=event, 2=lodging
          const TRACKS: Array<'flight' | 'event' | 'lodging'> = ['flight', 'event', 'lodging'];

          const trackEvents = TRACKS.map((type) =>
            events.find((e) => e.type === type && eventCoversDay(e, day)) ?? null
          );

          return (
            <div
              key={idx}
              className={`min-h-[96px] p-1 border-b border-r border-slate-border/50 ${!inMonth ? 'opacity-25' : ''}`}
            >
              {/* Date number */}
              <div
                className={`w-6 h-6 flex items-center justify-center text-xs mb-1 rounded-full ${
                  isToday ? 'bg-amber text-navy font-bold' : 'text-slate-muted'
                }`}
              >
                {format(day, 'd')}
              </div>

              {/* 3 fixed-height event tracks */}
              <div className="flex flex-col gap-0.5">
                {trackEvents.map((event, trackIdx) => {
                  if (!event) {
                    // Empty spacer — keeps tracks aligned across days
                    return <div key={trackIdx} className="h-[18px]" />;
                  }

                  const first       = isFirstDay(event, day);
                  const last        = isLastDay(event, day);
                  const isSingleDay = first && last;
                  const isSunday    = colPos === 0;
                  const isSaturday  = colPos === 6;
                  const showLabel   = first || isSunday;

                  const roundedLeft  = first || isSunday   ? 'rounded-l' : '';
                  const roundedRight = last  || isSaturday ? 'rounded-r' : '';

                  return (
                    <button
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); onEventClick?.(event); }}
                      title={event.title}
                      className={`h-[18px] w-full text-left text-xs truncate transition-opacity hover:opacity-80 leading-[18px] ${
                        isSingleDay ? 'px-1.5 rounded' : `px-1 ${roundedLeft} ${roundedRight}`
                      }`}
                      style={{
                        backgroundColor: event.color + (isSingleDay ? '40' : '30'),
                        color: event.color,
                        borderLeft: (first || isSunday) ? `2px solid ${event.color}` : undefined,
                      }}
                    >
                      {showLabel ? event.title : '\u00a0'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend + export */}
      <div className="flex items-center justify-between p-3 border-t border-slate-border">
        <div className="flex items-center gap-4">
          {[
            ['bg-blue-500/60',   'Flights'],
            ['bg-green-500/60',  'Lodging'],
            ['bg-purple-500/60', 'Activities'],
          ].map(([cls, label]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-muted">
              <div className={`w-3 h-3 rounded-sm ${cls}`} />{label}
            </div>
          ))}
        </div>
        {events.length > 0 && (
          <button
            onClick={exportICS}
            className="flex items-center gap-1 text-xs text-slate-muted hover:text-amber transition-colors"
            title="Export to Google Calendar / Apple Calendar"
          >
            <Download size={12} />Export .ics
          </button>
        )}
      </div>

      {/* Event detail overlay */}
      {selectedEvent && (
        <div
          className="absolute inset-0 bg-navy/80 backdrop-blur-sm flex items-center justify-center p-4 z-10"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-navy-card rounded-xl border border-slate-border p-4 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
              <h3 className="font-semibold text-slate-text">{selectedEvent.title}</h3>
            </div>
            <p className="text-sm text-slate-muted">
              {format(parseISO(selectedEvent.start_time), 'PPP p')}
              {' → '}
              {format(parseISO(selectedEvent.end_time), 'PPP p')}
            </p>
            {selectedEvent.location && (
              <p className="text-sm text-slate-muted mt-1">📍 {selectedEvent.location}</p>
            )}
            <button className="mt-3 text-xs text-amber hover:underline" onClick={() => setSelectedEvent(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
