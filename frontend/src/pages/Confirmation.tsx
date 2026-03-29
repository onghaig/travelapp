import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Plane, Building2, Calendar, User, ArrowRight } from 'lucide-react';
import { getTrip, updateBooking } from '../lib/api';
import { Trip, TripState, Booking } from '../lib/types';
import { format, parseISO } from 'date-fns';
import FloatingChat from '../components/FloatingChat';

type BookingStep = 'idle' | 'loading' | 'at_checkout' | 'deep_link' | 'confirmed';

interface BookingState {
  type: string;
  step: BookingStep;
  result?: Record<string, unknown>;
  bookingId?: string;
}

export default function Confirmation() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripState, setTripState] = useState<TripState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [bookingFlow, setBookingFlow] = useState<'idle' | 'active' | 'complete'>('idle');
  const [currentBookingIdx, setCurrentBookingIdx] = useState(0);
  const [bookingStates, setBookingStates] = useState<BookingState[]>([]);
  const [travelerInfo, setTravelerInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    passport: '',
  });

  useEffect(() => {
    if (!tripId) return;
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId) return;
    setIsLoading(true);
    try {
      const t = await getTrip(tripId);
      setTrip(t);
      setTripState(t.state_json || {});
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  const bookingItems = [
    ...(tripState.selected_flight ? [{ type: 'flight', item: tripState.selected_flight, label: `${tripState.selected_flight.airline} ${tripState.selected_flight.flight_number}` }] : []),
    ...(tripState.selected_lodging ? [{ type: tripState.selected_lodging.type, item: tripState.selected_lodging, label: tripState.selected_lodging.name }] : []),
    ...(tripState.selected_events || []).map((e) => ({ type: 'event', item: e, label: e.name })),
  ];

  const buildBookingUrl = (bookingType: string, item: Record<string, unknown>): string => {
    const params = (item.booking_url_params ?? {}) as Record<string, unknown>;
    if (bookingType === 'flight') {
      const origin = params.origin ?? '';
      const dest = params.destination ?? '';
      const date = params.date ?? '';
      const adults = params.adults ?? travelerInfo.first_name ? 1 : (tripState.num_travelers ?? 1);
      return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${dest}+on+${date}&adults=${adults}`;
    }
    if (bookingType === 'hotel') {
      const dest = encodeURIComponent(String(params.destination ?? ''));
      return `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${params.check_in ?? ''}&checkout=${params.check_out ?? ''}&group_adults=${params.guests ?? 1}`;
    }
    if (bookingType === 'airbnb') {
      const dest = encodeURIComponent(String(params.destination ?? ''));
      return `https://www.airbnb.com/s/${dest}/homes?checkin=${params.check_in ?? ''}&checkout=${params.check_out ?? ''}&adults=${params.guests ?? 1}`;
    }
    if (bookingType === 'event') {
      const query = encodeURIComponent(`${String(item.name ?? '')} ${String(params.destination ?? '')}`);
      return `https://www.viator.com/search/${query}`;
    }
    return 'https://www.google.com/travel';
  };

  const startBookingFlow = () => {
    setBookingFlow('active');
    setCurrentBookingIdx(0);
    setBookingStates(bookingItems.map((item) => ({ type: item.type, step: 'idle' })));
    processBooking(0);
  };

  const processBooking = (idx: number) => {
    if (idx >= bookingItems.length) {
      setBookingFlow('complete');
      return;
    }
    const bookingItem = bookingItems[idx];
    setCurrentBookingIdx(idx);
    const url = buildBookingUrl(bookingItem.type, bookingItem.item as Record<string, unknown>);
    window.open(url, '_blank', 'noopener,noreferrer');
    setBookingStates((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, step: 'deep_link', result: { url } } : s))
    );
  };

  const confirmBooking = (idx: number) => {
    setBookingStates((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, step: 'confirmed' } : s))
    );
    // best-effort backend record
    const bs = bookingStates[idx];
    if (bs.bookingId) {
      updateBooking(bs.bookingId, { status: 'confirmed' }).catch(() => {});
    }
    const nextIdx = idx + 1;
    if (nextIdx < bookingItems.length) {
      processBooking(nextIdx);
    } else {
      setBookingFlow('complete');
    }
  };

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
        <h1 className="font-serif text-xl text-slate-text">Confirm Your Trip</h1>
        <button
          onClick={() => navigate(`/dashboard/${tripId}`)}
          className="text-sm text-slate-muted hover:text-slate-text transition-colors"
        >
          ← Back to Dashboard
        </button>
      </nav>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Verification status */}
        {tripState.verification && (
          <div className={`p-4 rounded-xl border ${
            tripState.verification.ready_to_book
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-amber/30 bg-amber/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {tripState.verification.ready_to_book ? (
                <CheckCircle size={18} className="text-green-400" />
              ) : (
                <AlertCircle size={18} className="text-amber" />
              )}
              <p className="text-sm font-medium text-slate-text">{tripState.verification.summary}</p>
            </div>
            {tripState.verification.issues.length > 0 && (
              <ul className="space-y-1">
                {tripState.verification.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={10} />
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Trip summary */}
        <div className="bg-navy-card border border-slate-border rounded-xl p-5">
          <h2 className="font-serif text-lg text-slate-text mb-4">Trip Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-muted">Destination</span>
              <p className="text-slate-text font-medium mt-0.5">{trip?.destination}</p>
            </div>
            {trip?.departure_date && (
              <div>
                <span className="text-slate-muted">Dates</span>
                <p className="text-slate-text font-medium mt-0.5">
                  {trip.departure_date}{trip.return_date ? ` → ${trip.return_date}` : ''}
                </p>
              </div>
            )}
            <div>
              <span className="text-slate-muted">Travelers</span>
              <p className="text-slate-text font-medium mt-0.5">{trip?.num_travelers}</p>
            </div>
            {trip?.budget_total && (
              <div>
                <span className="text-slate-muted">Budget</span>
                <p className="text-slate-text font-medium mt-0.5">${trip.budget_total.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Booking items */}
        {bookingItems.length > 0 && (
          <div className="bg-navy-card border border-slate-border rounded-xl p-5">
            <h2 className="font-serif text-lg text-slate-text mb-4">Bookings</h2>
            <div className="space-y-3">
              {bookingItems.map((item, idx) => {
                const bs = bookingStates[idx];
                const Icon = item.type === 'flight' ? Plane : item.type === 'event' ? Calendar : Building2;
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-amber/20 flex items-center justify-center">
                      <Icon size={16} className="text-amber" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-text">{item.label}</p>
                      <p className="text-xs text-slate-muted capitalize">{item.type}</p>
                    </div>
                    {bs?.step === 'confirmed' && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Confirmed
                      </span>
                    )}
                    {bs?.step === 'loading' && (
                      <Loader2 size={16} className="animate-spin text-amber" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Traveler info */}
        <div className="bg-navy-card border border-slate-border rounded-xl p-5">
          <h2 className="font-serif text-lg text-slate-text mb-4 flex items-center gap-2">
            <User size={18} />
            Traveler Information
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'first_name', label: 'First Name', placeholder: 'John' },
              { key: 'last_name', label: 'Last Name', placeholder: 'Doe' },
              { key: 'email', label: 'Email', placeholder: 'john@example.com' },
              { key: 'phone', label: 'Phone', placeholder: '+1 555 0000' },
              { key: 'passport', label: 'Passport Number', placeholder: 'A12345678' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className={key === 'email' || key === 'passport' ? 'col-span-2' : ''}>
                <label className="block text-xs text-slate-muted mb-1">{label}</label>
                <input
                  value={travelerInfo[key as keyof typeof travelerInfo]}
                  onChange={(e) => setTravelerInfo((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Booking flow */}
        {bookingFlow === 'idle' && (
          <button
            onClick={startBookingFlow}
            disabled={bookingItems.length === 0}
            className="w-full py-4 rounded-xl bg-amber text-navy font-semibold text-base hover:bg-amber-light disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            Confirm & Start Booking
            <ArrowRight size={20} />
          </button>
        )}

        {bookingFlow === 'active' && bookingStates[currentBookingIdx] && (
          <div className="bg-navy-card border border-amber/30 rounded-xl p-5">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {bookingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    bookingStates[i]?.step === 'confirmed'
                      ? 'bg-green-500 text-white'
                      : i === currentBookingIdx
                      ? 'bg-amber text-navy'
                      : 'bg-white/10 text-slate-muted'
                  }`}>
                    {bookingStates[i]?.step === 'confirmed' ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs ${i === currentBookingIdx ? 'text-slate-text' : 'text-slate-muted'}`}>
                    {item.type}
                  </span>
                  {i < bookingItems.length - 1 && <div className="w-4 h-px bg-slate-border" />}
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-slate-text mb-1">
              {bookingItems[currentBookingIdx].label}
            </h3>
            <p className="text-sm text-slate-muted mb-4">
              A pre-filled booking page has been opened in a new tab. Complete your payment there, then come back here to confirm.
            </p>

            <a
              href={String(bookingStates[currentBookingIdx].result?.url || '#')}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-xl bg-white/10 text-slate-text text-center text-sm font-medium hover:bg-white/15 transition-colors mb-3"
            >
              Re-open Booking Page →
            </a>
            <button
              onClick={() => confirmBooking(currentBookingIdx)}
              className="w-full py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-400 transition-colors text-sm"
            >
              I've completed this booking ✓
            </button>
            <button
              onClick={() => confirmBooking(currentBookingIdx)}
              className="mt-2 w-full text-xs text-slate-muted hover:text-slate-text transition-colors text-center"
            >
              Skip for now
            </button>
          </div>
        )}

        {bookingFlow === 'complete' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <h3 className="font-serif text-xl text-slate-text mb-2">Trip Confirmed!</h3>
            <p className="text-sm text-slate-muted mb-4">
              All bookings completed. Have an amazing trip!
            </p>
            <button
              onClick={() => navigate(`/my-trip/${tripId}`)}
              className="px-6 py-2.5 rounded-xl bg-amber text-navy font-medium hover:bg-amber-light transition-colors text-sm"
            >
              View My Trip
            </button>
          </div>
        )}

        {/* Change request box */}
        {bookingFlow === 'idle' && (
          <div className="bg-navy-card border border-slate-border rounded-xl p-4">
            <p className="text-xs text-slate-muted text-center">
              Does everything look correct? Use the chat bubble → to request any changes.
            </p>
          </div>
        )}
      </div>

      {tripId && <FloatingChat tripId={tripId} />}
    </div>
  );
}
