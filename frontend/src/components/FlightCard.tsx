import { Plane, Clock, Luggage } from 'lucide-react';
import { Flight } from '../lib/types';
import { format, parseISO } from 'date-fns';

interface FlightCardProps {
  flight: Flight;
  selected?: boolean;
  onSelect: (flight: Flight) => void;
}

export default function FlightCard({ flight, selected, onSelect }: FlightCardProps) {
  const depTime = format(parseISO(flight.departure_time), 'HH:mm');
  const arrTime = format(parseISO(flight.arrival_time), 'HH:mm');

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
        selected
          ? 'border-amber bg-amber/10'
          : 'border-slate-border bg-navy-card hover:border-amber/40'
      }`}
      onClick={() => onSelect(flight)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Plane size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-text">{flight.airline}</p>
            <p className="text-xs text-slate-muted">{flight.flight_number}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber">${flight.total_price.toLocaleString()}</p>
          <p className="text-xs text-slate-muted">${flight.price_per_person}/person</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-text">{depTime}</p>
          <p className="text-xs text-slate-muted">{flight.origin}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-slate-muted">
            <Clock size={10} />
            <span>{flight.duration}</span>
          </div>
          <div className="w-full flex items-center gap-1">
            <div className="h-px flex-1 bg-slate-border" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-border" />
            <div className="h-px flex-1 bg-slate-border" />
          </div>
          <p className="text-xs text-slate-muted">
            {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            {flight.stop_city ? ` · ${flight.stop_city}` : ''}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-text">{arrTime}</p>
          <p className="text-xs text-slate-muted">{flight.destination}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-border">
        <div className="flex items-center gap-1 text-xs text-slate-muted">
          <Luggage size={12} />
          <span>{flight.baggage_included ? 'Baggage included' : 'No baggage'}</span>
        </div>
        <span className="text-xs text-slate-muted capitalize">{flight.cabin_class}</span>
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-navy" />
        </div>
      )}
    </div>
  );
}
