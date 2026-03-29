import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getTrip, updateTrip } from '../lib/api';
import { Trip, TripState, Flight, Lodging, TripEvent, CalendarEvent, BudgetBreakdown } from '../lib/types';
import Calendar from '../components/Calendar';
import BudgetTracker from '../components/BudgetTracker';
import FlightCard from '../components/FlightCard';
import LodgingCard from '../components/LodgingCard';
import EventCard from '../components/EventCard';
import FloatingChat from '../components/FloatingChat';

export default function Dashboard() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripState, setTripState] = useState<TripState>({});
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedLodging, setSelectedLodging] = useState<Lodging | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [calendarFocusDate, setCalendarFocusDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flights' | 'lodging' | 'events'>('flights');

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
      if (t.state_json?.selected_flight) setSelectedFlight(t.state_json.selected_flight);
      if (t.state_json?.selected_lodging) setSelectedLodging(t.state_json.selected_lodging);
      if (t.state_json?.selected_events) {
        setSelectedEvents(new Set(t.state_json.selected_events.map((e: TripEvent) => e.id)));
      }
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateUpdate = (state: TripState) => {
    setTripState(state);
    if (state.selected_flight) setSelectedFlight(state.selected_flight);
    if (state.selected_lodging) setSelectedLodging(state.selected_lodging);
    if (state.selected_events) setSelectedEvents(new Set(state.selected_events.map((e) => e.id)));
  };

  const persistSelection = async (patch: Partial<TripState>) => {
    if (!tripId) return;
    const newState = { ...tripState, ...patch };
    setTripState(newState);
    try {
      await updateTrip(tripId, { state_json: newState });
    } catch {
      // non-fatal
    }
  };

  const handleFlightSelect = (flight: Flight) => {
    setSelectedFlight(flight);
    persistSelection({ selected_flight: flight });
    try { setCalendarFocusDate(new Date(flight.departure_time)); } catch { /* noop */ }
  };

  const handleLodgingSelect = (lodging: Lodging) => {
    setSelectedLodging(lodging);
    persistSelection({ selected_lodging: lodging });
    try { setCalendarFocusDate(new Date(lodging.check_in + 'T12:00:00')); } catch { /* noop */ }
  };

  const toggleEvent = (event: TripEvent) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event.id)) { next.delete(event.id); } else { next.add(event.id); }
      const selected = (tripState.events || []).filter((e) => next.has(e.id));
      persistSelection({ selected_events: selected });
      return next;
    });
    // Focus calendar on the departure date (events don't have a date, so use flight if available)
    if (selectedFlight) {
      try { setCalendarFocusDate(new Date(selectedFlight.departure_time)); } catch { /* noop */ }
    }
  };

  const computeBudget = (): BudgetBreakdown | null => {
    // Determine the budget cap — prefer what the backend confirmed, else trip record
    const budgetCap =
      tripState.budget?.budget_total ??
      trip?.budget_total ??
      tripState.budget_total ??
      null;

    if (!budgetCap) return null;

    // Always recompute from live selections so the tracker responds immediately
    const items: { label: string; cost: number; category: string }[] = [];

    if (selectedFlight) {
      items.push({ label: selectedFlight.airline + ' ' + selectedFlight.flight_number, cost: selectedFlight.total_price, category: 'flights' });
    }
    if (selectedLodging) {
      items.push({ label: selectedLodging.name, cost: selectedLodging.total_price, category: 'lodging' });
    }
    (tripState.events || []).filter((e) => selectedEvents.has(e.id)).forEach((e) => {
      items.push({ label: e.name, cost: e.price_per_person * (trip?.num_travelers || 1), category: 'events' });
    });

    const total = items.reduce((sum, i) => sum + i.cost, 0);
    const breakdown: BudgetBreakdown['breakdown'] = {};
    items.forEach((item) => {
      if (!breakdown[item.category]) breakdown[item.category] = { total: 0, items: [] };
      breakdown[item.category].total += item.cost;
      breakdown[item.category].items.push({ label: item.label, cost: item.cost });
    });

    return {
      budget_total: budgetCap,
      total_estimated: total,
      remaining: budgetCap - total,
      over_budget: total > budgetCap,
      percentage_used: budgetCap > 0 ? (total / budgetCap) * 100 : 0,
      breakdown,
      warnings: total > budgetCap ? [`Over budget by $${(total - budgetCap).toFixed(0)}`] : [],
    };
  };


  const budget = computeBudget();

  // Build calendar events from selections when the backend hasn't synced them yet
  const buildCalendarEventsFromSelections = (): CalendarEvent[] => {
    const evts: CalendarEvent[] = [];

    // ── Outbound flight ───────────────────────────────────────────────────
    if (selectedFlight) {
      evts.push({
        id: `flight-out-${selectedFlight.id}`,
        trip_id: tripId || '',
        type: 'flight',
        title: `✈ ${selectedFlight.airline} ${selectedFlight.flight_number}`,
        start_time: selectedFlight.departure_time,
        end_time: selectedFlight.arrival_time,
        location: `${selectedFlight.origin} → ${selectedFlight.destination}`,
        color: '#3b82f6',
        metadata: {},
      });

      // ── Return flight (same airline on return_date) ───────────────────
      const returnDate = tripState.return_date;
      if (returnDate) {
        // Use the return date but keep the departure hh:mm from the outbound flight
        const depTime = new Date(selectedFlight.departure_time);
        const retDep  = new Date(`${returnDate}T${depTime.toISOString().substring(11)}`);
        const durationMs =
          new Date(selectedFlight.arrival_time).getTime() -
          new Date(selectedFlight.departure_time).getTime();
        const retArr = new Date(retDep.getTime() + durationMs);

        evts.push({
          id: `flight-ret-${selectedFlight.id}`,
          trip_id: tripId || '',
          type: 'flight',
          title: `✈ ${selectedFlight.airline} (return)`,
          start_time: retDep.toISOString(),
          end_time: retArr.toISOString(),
          location: `${selectedFlight.destination} → ${selectedFlight.origin}`,
          color: '#3b82f6',
          metadata: {},
        });
      }
    }

    // ── Lodging — spans full check_in (3 PM) → check_out (11 AM) ─────────
    if (selectedLodging) {
      evts.push({
        id: `lodging-${selectedLodging.id}`,
        trip_id: tripId || '',
        type: 'lodging',
        title: `🏨 ${selectedLodging.name}`,
        start_time: `${selectedLodging.check_in}T15:00:00`,
        end_time:   `${selectedLodging.check_out}T11:00:00`,
        location: selectedLodging.neighborhood,
        color: '#22c55e',
        metadata: {},
      });
    }

    // ── Activities — spread one per day starting the day after check-in ──
    const base = selectedLodging
      ? new Date(`${selectedLodging.check_in}T10:00:00`)
      : selectedFlight
      ? new Date(selectedFlight.arrival_time)
      : new Date();

    (tripState.events || [])
      .filter((e) => selectedEvents.has(e.id))
      .forEach((e, i) => {
        const eventStart = new Date(base.getTime() + (i + 1) * 86_400_000);
        const eventEnd   = new Date(eventStart.getTime() + e.duration_hours * 3_600_000);
        evts.push({
          id: `event-${e.id}`,
          trip_id: tripId || '',
          type: 'event',
          title: e.name,
          start_time: eventStart.toISOString(),
          end_time:   eventEnd.toISOString(),
          location: e.destination,
          color: '#a855f7',
          metadata: {},
        });
      });

    return evts;
  };


  const calendarEvents: CalendarEvent[] =
    (tripState.calendar_events || []).length > 0
      ? tripState.calendar_events!
      : buildCalendarEventsFromSelections();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      {/* Nav */}
      <nav className="border-b border-slate-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-xl text-slate-text">Travvy</h1>
          <div className="flex items-center gap-2 text-sm text-slate-muted">
            <Link to="/" className="hover:text-slate-text transition-colors">Chat</Link>
            <span>/</span>
            <span className="text-slate-text">{trip?.destination}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/my-trip/${tripId}`}
            className="text-sm text-slate-muted hover:text-slate-text transition-colors"
          >
            My Trip
          </Link>
          <button
            onClick={() => navigate(`/confirmation/${tripId}`)}
            disabled={!selectedFlight && !selectedLodging}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber text-navy text-sm font-medium hover:bg-amber-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Review & Book
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left: Calendar */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-slate-text">Your Itinerary</h2>
            <button
              onClick={loadTrip}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={16} className="text-slate-muted" />
            </button>
          </div>
          <div className="relative">
            <Calendar events={calendarEvents} focusDate={calendarFocusDate} />
          </div>
        </div>

        {/* Right: Options + Budget */}
        <div className="w-96 flex-shrink-0 border-l border-slate-border p-6 overflow-y-auto space-y-4">
          {/* Budget */}
          {budget && <BudgetTracker budget={budget} />}

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-slate-border">
            {(['flights', 'lodging', 'events'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-amber text-navy'
                    : 'text-slate-muted hover:text-slate-text hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Flight options */}
          {activeTab === 'flights' && (
            <div className="space-y-3">
              {(tripState.flights || []).length === 0 ? (
                <div className="text-center py-8 text-slate-muted text-sm">
                  No flights found yet. Keep chatting to search for flights.
                </div>
              ) : (
                (tripState.flights || []).map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    selected={selectedFlight?.id === flight.id}
                    onSelect={handleFlightSelect}
                  />
                ))
              )}
            </div>
          )}

          {/* Lodging options */}
          {activeTab === 'lodging' && (
            <div className="space-y-3">
              {(tripState.lodging || []).length === 0 ? (
                <div className="text-center py-8 text-slate-muted text-sm">
                  No lodging found yet.
                </div>
              ) : (
                (tripState.lodging || []).map((l) => (
                  <LodgingCard
                    key={l.id}
                    lodging={l}
                    selected={selectedLodging?.id === l.id}
                    onSelect={handleLodgingSelect}
                  />
                ))
              )}
            </div>
          )}

          {/* Events */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              {(tripState.events || []).length === 0 ? (
                <div className="text-center py-8 text-slate-muted text-sm">
                  No activities found yet.
                </div>
              ) : (
                (tripState.events || []).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    selected={selectedEvents.has(event.id)}
                    onSelect={toggleEvent}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {tripId && <FloatingChat tripId={tripId} onStateUpdate={handleStateUpdate} />}
    </div>
  );
}
