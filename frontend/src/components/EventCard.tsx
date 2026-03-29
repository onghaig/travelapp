import { Star, Clock, Tag } from 'lucide-react';
import { TripEvent } from '../lib/types';

interface EventCardProps {
  event: TripEvent;
  selected?: boolean;
  onSelect: (event: TripEvent) => void;
}

export default function EventCard({ event, selected, onSelect }: EventCardProps) {
  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
        selected
          ? 'border-amber bg-amber/10'
          : 'border-slate-border bg-navy-card hover:border-amber/40'
      }`}
      onClick={() => onSelect(event)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 mr-3">
          <p className="text-sm font-semibold text-slate-text leading-tight">{event.name}</p>
          <p className="text-xs text-slate-muted mt-0.5">{event.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-amber">${event.price_per_person}</p>
          <p className="text-xs text-slate-muted">per person</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber fill-amber" />
          <span className="text-xs text-slate-text font-medium">{event.rating}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-muted">
          <Clock size={12} />
          <span>{event.duration_hours}h</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-muted">
          <Tag size={12} />
          <span>{event.category}</span>
        </div>
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-navy" />
        </div>
      )}
    </div>
  );
}
