import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Download } from 'lucide-react';
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
} from 'date-fns';
import { CalendarEvent } from '../lib/types';

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

function toICS(events: CalendarEvent[]): string {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Travvy//Travel Planner//EN',
  ];
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

export default function Calendar({ events, onEventClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const exportICS = () => {
    const blob = new Blob([toICS(events)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travvy-trip.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter((event) => {
      try {
        const start = parseISO(event.start_time);
        return isSameDay(start, day);
      } catch {
        return false;
      }
    });
  };

  return (
    <div className="bg-navy-card rounded-xl border border-slate-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-border">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ChevronLeft size={18} className="text-slate-muted" />
        </button>
        <h2 className="font-serif text-lg text-slate-text">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ChevronRight size={18} className="text-slate-muted" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-slate-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-2 text-center text-xs text-slate-muted font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className={`min-h-[80px] p-1 border-b border-r border-slate-border/50 ${
                !isCurrentMonth ? 'opacity-30' : ''
              }`}
            >
              <div
                className={`w-6 h-6 flex items-center justify-center text-xs mb-1 rounded-full ${
                  isToday
                    ? 'bg-amber text-navy font-bold'
                    : 'text-slate-muted'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      onEventClick?.(event);
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-opacity hover:opacity-80"
                    style={{ backgroundColor: event.color + '33', color: event.color, borderLeft: `2px solid ${event.color}` }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length === 0 && isCurrentMonth && (
                  <button className="w-full flex items-center justify-center opacity-0 hover:opacity-30 transition-opacity">
                    <Plus size={12} className="text-slate-muted" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend + export */}
      <div className="flex items-center justify-between p-3 border-t border-slate-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-muted">
            <div className="w-3 h-3 rounded-sm bg-blue-500/60" />
            Flights
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-muted">
            <div className="w-3 h-3 rounded-sm bg-green-500/60" />
            Lodging
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-muted">
            <div className="w-3 h-3 rounded-sm bg-purple-500/60" />
            Activities
          </div>
        </div>
        {events.length > 0 && (
          <button
            onClick={exportICS}
            className="flex items-center gap-1 text-xs text-slate-muted hover:text-amber transition-colors"
            title="Export to Google Calendar / Apple Calendar"
          >
            <Download size={12} />
            Export .ics
          </button>
        )}
      </div>

      {/* Event detail panel */}
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
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <h3 className="font-semibold text-slate-text">{selectedEvent.title}</h3>
            </div>
            <p className="text-sm text-slate-muted">
              {format(parseISO(selectedEvent.start_time), 'PPP p')} →{' '}
              {format(parseISO(selectedEvent.end_time), 'p')}
            </p>
            {selectedEvent.location && (
              <p className="text-sm text-slate-muted mt-1">{selectedEvent.location}</p>
            )}
            <button
              className="mt-3 text-xs text-amber hover:underline"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
