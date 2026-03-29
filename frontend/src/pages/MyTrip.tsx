import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plane, Building2, Calendar, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getBookings, getTrip } from '../lib/api';
import { Booking, Trip } from '../lib/types';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle },
  pending: { label: 'Pending', color: 'text-amber', bg: 'bg-amber/10 border-amber/30', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle },
};

const TYPE_ICONS = {
  flight: Plane,
  hotel: Building2,
  airbnb: Building2,
  event: Calendar,
};

export default function MyTrip() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([getTrip(tripId), getBookings(tripId)])
      .then(([t, b]) => {
        setTrip(t);
        setBookings(b);
      })
      .finally(() => setIsLoading(false));
  }, [tripId]);

  const totalConfirmed = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.actual_cost || b.estimated_cost || 0), 0);

  const totalEstimated = bookings.reduce(
    (sum, b) => sum + (b.estimated_cost || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <nav className="border-b border-slate-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-xl text-slate-text">Travvy</h1>
          <div className="flex items-center gap-2 text-sm text-slate-muted">
            <Link to={`/dashboard/${tripId}`} className="hover:text-slate-text transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-text">My Trip</span>
          </div>
        </div>
        <Link
          to={`/dashboard/${tripId}`}
          className="text-sm text-slate-muted hover:text-slate-text transition-colors"
        >
          ← Back
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="font-serif text-2xl text-slate-text">{trip?.destination}</h2>
          {trip?.departure_date && (
            <p className="text-slate-muted text-sm mt-1">
              {trip.departure_date}{trip.return_date ? ` → ${trip.return_date}` : ''} · {trip.num_travelers} traveler{trip.num_travelers !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Budget summary */}
        <div className="bg-navy-card border border-slate-border rounded-xl p-4 flex gap-6">
          <div>
            <p className="text-xs text-slate-muted">Budget</p>
            <p className="text-xl font-bold text-slate-text">${(trip?.budget_total || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-muted">Estimated</p>
            <p className="text-xl font-bold text-amber">${totalEstimated.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-muted">Confirmed Spent</p>
            <p className="text-xl font-bold text-green-400">${totalConfirmed.toLocaleString()}</p>
          </div>
        </div>

        {/* Bookings list */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-text">Bookings</h3>
          {bookings.length === 0 ? (
            <div className="text-center py-10 text-slate-muted text-sm">
              No bookings yet.{' '}
              <button
                onClick={() => navigate(`/confirmation/${tripId}`)}
                className="text-amber hover:underline"
              >
                Start booking
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const TypeIcon = TYPE_ICONS[booking.type] || Calendar;

              return (
                <div
                  key={booking.id}
                  className="bg-navy-card border border-slate-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber/20 flex items-center justify-center">
                        <TypeIcon size={18} className="text-amber" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-text capitalize">
                          {booking.provider || booking.type}
                        </p>
                        <p className="text-xs text-slate-muted capitalize">{booking.type}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.bg} ${status.color}`}>
                      <StatusIcon size={11} />
                      {status.label}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-4 text-xs">
                      {booking.estimated_cost && (
                        <div>
                          <span className="text-slate-muted">Estimated: </span>
                          <span className="text-slate-text font-medium">${booking.estimated_cost.toLocaleString()}</span>
                        </div>
                      )}
                      {booking.actual_cost && (
                        <div>
                          <span className="text-slate-muted">Actual: </span>
                          <span className="text-green-400 font-medium">${booking.actual_cost.toLocaleString()}</span>
                        </div>
                      )}
                      {booking.confirmation_number && (
                        <div>
                          <span className="text-slate-muted">Conf#: </span>
                          <span className="text-slate-text font-medium">{booking.confirmation_number}</span>
                        </div>
                      )}
                    </div>
                    {booking.booking_url && (
                      <a
                        href={booking.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-amber hover:underline"
                      >
                        Manage
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
