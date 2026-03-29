import { Building2, Home, Star, Users } from 'lucide-react';
import { Lodging } from '../lib/types';

interface LodgingCardProps {
  lodging: Lodging;
  selected?: boolean;
  onSelect: (lodging: Lodging) => void;
}

export default function LodgingCard({ lodging, selected, onSelect }: LodgingCardProps) {
  const TypeIcon = lodging.type === 'airbnb' ? Home : Building2;
  const typeColor = lodging.type === 'airbnb' ? 'text-rose-400' : 'text-green-400';
  const typeBg = lodging.type === 'airbnb' ? 'bg-rose-500/20' : 'bg-green-500/20';

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
        selected
          ? 'border-amber bg-amber/10'
          : 'border-slate-border bg-navy-card hover:border-amber/40'
      }`}
      onClick={() => onSelect(lodging)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${typeBg} flex items-center justify-center`}>
            <TypeIcon size={16} className={typeColor} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-text leading-tight">{lodging.name}</p>
            <p className="text-xs text-slate-muted">{lodging.neighborhood}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-lg font-bold text-amber">${lodging.total_price.toLocaleString()}</p>
          <p className="text-xs text-slate-muted">${lodging.price_per_night}/night</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber fill-amber" />
          <span className="text-xs text-slate-text font-medium">{lodging.rating}</span>
        </div>
        {lodging.stars && (
          <span className="text-xs text-slate-muted">{'★'.repeat(lodging.stars)}</span>
        )}
        <div className="flex items-center gap-1 text-xs text-slate-muted">
          <Users size={12} />
          <span>Up to {lodging.max_guests}</span>
        </div>
        <span className="text-xs text-slate-muted capitalize">{lodging.type}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {lodging.amenities.slice(0, 3).map((amenity) => (
          <span
            key={amenity}
            className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-slate-muted border border-white/10"
          >
            {amenity}
          </span>
        ))}
        {lodging.amenities.length > 3 && (
          <span className="px-2 py-0.5 rounded-full text-xs text-slate-muted">
            +{lodging.amenities.length - 3} more
          </span>
        )}
      </div>

      <div className="mt-2 text-xs text-slate-muted">
        {lodging.nights} nights · {lodging.check_in} → {lodging.check_out}
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-navy" />
        </div>
      )}
    </div>
  );
}
