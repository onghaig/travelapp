import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Send, Loader2, MapPin, Calendar, Users, DollarSign, X } from 'lucide-react';
import { login, signup, streamChat, createTrip, getTrips } from '../lib/api';
import { ChatChunk, TripState } from '../lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ToolIndicator {
  tool: string;
  status: string;
}

interface ChoiceOption {
  label: string;
  sendAs: string;
  description?: string;
  emoji?: string;
}

interface ChoicePrompt {
  title: string;
  options: ChoiceOption[];
}

interface Props {
  onAuthChange: (auth: boolean) => void;
  isAuthenticated?: boolean;
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getChoicePrompt(
  messages: ChatMessage[],
  tripState: TripState,
  isStreaming: boolean
): ChoicePrompt | null {
  if (isStreaming) return null;
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.content && !m.isStreaming);
  if (!lastAssistant) return null;

  const { destination, departure_date, return_date, num_travelers, budget_total, flights, lodging } = tripState;

  if (!destination) {
    return {
      title: 'Choose a destination',
      options: [
        { label: 'Tokyo', sendAs: 'Tokyo', emoji: '🇯🇵', description: 'Japan — culture & food' },
        { label: 'Paris', sendAs: 'Paris', emoji: '🇫🇷', description: 'France — art & romance' },
        { label: 'Bali', sendAs: 'Bali', emoji: '🇮🇩', description: 'Indonesia — beaches & temples' },
        { label: 'New York', sendAs: 'New York', emoji: '🗽', description: 'USA — the city that never sleeps' },
        { label: 'Rome', sendAs: 'Rome', emoji: '🇮🇹', description: 'Italy — history & food' },
        { label: 'Bangkok', sendAs: 'Bangkok', emoji: '🇹🇭', description: 'Thailand — street food & temples' },
        { label: 'Barcelona', sendAs: 'Barcelona', emoji: '🇪🇸', description: 'Spain — architecture & beaches' },
        { label: 'London', sendAs: 'London', emoji: '🇬🇧', description: 'UK — culture & history' },
      ],
    };
  }

  if (!departure_date) {
    const today = new Date();
    return {
      title: 'When do you want to leave?',
      options: [
        { label: 'In 2 weeks', sendAs: `I want to leave ${fmtDate(addDays(today, 14))}`, emoji: '📅', description: fmtDate(addDays(today, 14)) },
        { label: 'Next month', sendAs: `I want to leave ${fmtDate(addDays(today, 30))}`, emoji: '📅', description: fmtDate(addDays(today, 30)) },
        { label: 'In 2 months', sendAs: `I want to leave ${fmtDate(addDays(today, 60))}`, emoji: '📅', description: fmtDate(addDays(today, 60)) },
        { label: 'In 3 months', sendAs: `I want to leave ${fmtDate(addDays(today, 90))}`, emoji: '📅', description: fmtDate(addDays(today, 90)) },
      ],
    };
  }

  if (!return_date) {
    const dep = new Date(departure_date + 'T12:00:00');
    return {
      title: 'How long is the trip?',
      options: [
        { label: 'Long weekend', sendAs: `I'll return ${fmtDate(addDays(dep, 3))}`, emoji: '🗓️', description: '3 nights' },
        { label: '1 week', sendAs: `I'll return ${fmtDate(addDays(dep, 7))}`, emoji: '🗓️', description: '7 nights' },
        { label: '10 days', sendAs: `I'll return ${fmtDate(addDays(dep, 10))}`, emoji: '🗓️', description: '10 nights' },
        { label: '2 weeks', sendAs: `I'll return ${fmtDate(addDays(dep, 14))}`, emoji: '🗓️', description: '14 nights' },
      ],
    };
  }

  if (!num_travelers) {
    return {
      title: 'How many travelers?',
      options: [
        { label: 'Just me', sendAs: 'Just me — 1 traveler', emoji: '🧑', description: 'Solo travel' },
        { label: '2 people', sendAs: '2 travelers', emoji: '👫', description: 'Couple or friends' },
        { label: '3–4 people', sendAs: '4 travelers', emoji: '👨‍👩‍👧', description: 'Small group or family' },
        { label: '5+ people', sendAs: '6 travelers', emoji: '👥', description: 'Large group' },
      ],
    };
  }

  if (!budget_total) {
    return {
      title: 'What\'s your total budget?',
      options: [
        { label: 'Budget', sendAs: 'My total budget is $1,500', emoji: '💵', description: '~$1,500 USD' },
        { label: 'Mid-range', sendAs: 'My total budget is $3,500', emoji: '💳', description: '~$3,500 USD' },
        { label: 'Premium', sendAs: 'My total budget is $7,000', emoji: '💎', description: '~$7,000 USD' },
        { label: 'Luxury', sendAs: 'My total budget is $15,000', emoji: '✨', description: '~$15,000+ USD' },
      ],
    };
  }

  const hasResults = (flights?.length ?? 0) > 0 || (lodging?.length ?? 0) > 0;
  if (!hasResults) {
    return {
      title: 'Ready to plan your trip!',
      options: [
        { label: 'Search everything', sendAs: `Search for flights, hotels, and activities in ${destination}`, emoji: '🔍', description: 'Flights + hotels + activities' },
        { label: 'Hotels only', sendAs: 'I prefer hotels, not Airbnbs', emoji: '🏨', description: 'Filter to hotels' },
        { label: 'Airbnb only', sendAs: 'I prefer Airbnbs', emoji: '🏠', description: 'Filter to Airbnbs' },
        { label: 'Morning flights', sendAs: 'I prefer morning flights', emoji: '🌅', description: 'Depart before noon' },
      ],
    };
  }

  return {
    title: 'What would you like to change?',
    options: [
      { label: 'View Dashboard', sendAs: '__dashboard__', emoji: '📊', description: 'See all results' },
      { label: 'Cheaper flights', sendAs: `Find me cheaper flights to ${destination}`, emoji: '💰', description: 'Budget options' },
      { label: 'More activities', sendAs: `What else can I do in ${destination}?`, emoji: '🎯', description: 'Add experiences' },
      { label: 'Change hotel', sendAs: `Show me different hotels in ${destination}`, emoji: '🏨', description: 'New lodging options' },
    ],
  };
}

export default function Chat({ onAuthChange, isAuthenticated }: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Travvy, your AI travel planner. Tell me where you'd like to go and I'll plan your perfect trip — flights, hotels, activities, and budget.\n\nWhere do you want to go?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolIndicator[]>([]);
  const [tripState, setTripState] = useState<TripState>({});
  const [tripId, setTripId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [choiceDismissed, setChoiceDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset choice panel whenever a new assistant message arrives
  const prevMsgCount = useRef(0);
  useEffect(() => {
    const count = messages.filter((m) => m.role === 'assistant').length;
    if (count !== prevMsgCount.current) {
      prevMsgCount.current = count;
      setChoiceDismissed(false);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ensureTripId = async (): Promise<string> => {
    if (tripId) return tripId;
    const trip = await createTrip({ destination: tripState.destination || 'Unset' });
    setTripId(trip.id);
    return trip.id;
  };

  const handleSend = async (overrideMessage?: string) => {
    const userContent = overrideMessage ?? input;
    if (!userContent.trim() || isStreaming) return;

    // Special nav action
    if (userContent === '__dashboard__') {
      if (tripId) navigate(`/dashboard/${tripId}`);
      return;
    }

    const token = localStorage.getItem('travvy_token');
    if (!token) {
      setPendingMessage(userContent);
      setShowAuth(true);
      return;
    }

    if (!overrideMessage) setInput('');
    setChoiceDismissed(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userContent };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', isStreaming: true }]);

    let latestTripState = tripState;
    let latestTripId = tripId;

    try {
      const currentTripId = await ensureTripId();
      latestTripId = currentTripId;

      await streamChat(
        currentTripId,
        userContent,
        (chunk: ChatChunk) => {
          if (chunk.type === 'text_delta') {
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk.content } : m)
            );
          } else if (chunk.type === 'tool_start') {
            if (chunk.tool !== 'update_trip_info') {
              setActiveTools((prev) => [...prev, { tool: chunk.tool, status: chunk.status }]);
            }
          } else if (chunk.type === 'tool_result') {
            setActiveTools((prev) => prev.filter((t) => t.tool !== chunk.tool));
          } else if (chunk.type === 'trip_state_update') {
            latestTripState = chunk.state;
            setTripState(chunk.state);
          } else if (chunk.type === 'calendar_update') {
            setTripState((prev) => ({ ...prev, calendar_events: chunk.events }));
          } else if (chunk.type === 'budget_update') {
            setTripState((prev) => ({ ...prev, budget: chunk.breakdown }));
          }
        },
        () => {
          setIsStreaming(false);
          setActiveTools([]);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
          );
          if ((latestTripState.flights?.length ?? 0) > 0 && latestTripId) {
            setTimeout(() => navigate(`/dashboard/${latestTripId}`), 1500);
          }
        }
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false }
            : m
        )
      );
      setIsStreaming(false);
      setActiveTools([]);
    }
  };

  const afterAuth = async () => {
    onAuthChange(true);
    setShowAuth(false);
    try {
      const trips = await getTrips();
      if (trips.length > 0) {
        navigate(`/dashboard/${trips[0].id}`);
        return;
      }
    } catch {
      // new user
    }
    if (pendingMessage) {
      const msg = pendingMessage;
      setPendingMessage('');
      handleSend(msg);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
        await afterAuth();
      } else {
        const result = await signup(authEmail, authPassword);
        if (result.access_token) {
          await afterAuth();
        } else {
          setAuthMessage(result.message || 'Check your email to confirm your account.');
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : authMode === 'login' ? 'Invalid email or password' : 'Signup failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const choicePrompt = choiceDismissed ? null : getChoicePrompt(messages, tripState, isStreaming);

  const tripInfoFields = [
    { icon: MapPin, label: 'Destination', value: tripState.destination },
    { icon: Calendar, label: 'Dates', value: tripState.departure_date ? `${tripState.departure_date}${tripState.return_date ? ' → ' + tripState.return_date : ''}` : undefined },
    { icon: Users, label: 'Travelers', value: tripState.num_travelers ? String(tripState.num_travelers) : undefined },
    { icon: DollarSign, label: 'Budget', value: tripState.budget_total ? `$${tripState.budget_total.toLocaleString()}` : undefined },
  ];
  const filledFields = tripInfoFields.filter((f) => f.value);

  return (
    <div className="min-h-screen bg-navy flex">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="p-6 text-center flex-shrink-0 relative">
          {!isAuthenticated && (
            <Link to="/login" className="absolute right-6 top-6 text-xs text-slate-muted hover:text-amber transition-colors">
              Sign in
            </Link>
          )}
          <h1 className="font-serif text-4xl text-slate-text mb-2">Where do you want to go?</h1>
          <p className="text-slate-muted text-sm">Tell me your dream destination and I'll plan everything.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-amber text-navy font-medium rounded-br-sm'
                  : 'bg-white/5 border border-white/10 text-slate-text rounded-bl-sm backdrop-blur-sm'
              }`}>
                {msg.isStreaming && !msg.content ? (
                  <div className="flex gap-1.5 py-1">
                    <span className="typing-dot w-2 h-2 rounded-full bg-slate-muted" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-slate-muted" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-slate-muted" />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {activeTools.length > 0 && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-muted">
                <Loader2 size={12} className="animate-spin text-amber" />
                <span>{activeTools[activeTools.length - 1]?.status}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Choice popup panel */}
        {choicePrompt && (
          <div className="mx-4 mb-3 bg-navy-card border border-amber/20 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
              <p className="text-xs font-medium text-slate-muted uppercase tracking-wider">{choicePrompt.title}</p>
              <button onClick={() => setChoiceDismissed(true)} className="p-1 rounded hover:bg-white/10 transition-colors">
                <X size={12} className="text-slate-muted" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {choicePrompt.options.map((opt) => (
                <button
                  key={opt.sendAs}
                  onClick={() => handleSend(opt.sendAs)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber/40 hover:bg-amber/5 text-left transition-all group"
                >
                  {opt.emoji && <span className="text-2xl flex-shrink-0">{opt.emoji}</span>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-text group-hover:text-amber transition-colors truncate">{opt.label}</p>
                    {opt.description && <p className="text-xs text-slate-muted truncate mt-0.5">{opt.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="p-4 border-t border-slate-border flex-shrink-0">
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Or type your own answer..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm"
            />
            <button
              onClick={() => handleSend()}
              disabled={isStreaming || !input.trim()}
              className="w-11 h-11 rounded-xl bg-amber text-navy flex items-center justify-center hover:bg-amber-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Trip info sidebar */}
      {filledFields.length > 0 && (
        <div className="w-72 flex-shrink-0 p-6 hidden lg:flex flex-col gap-3">
          <h3 className="text-xs font-medium text-slate-muted uppercase tracking-wider mb-1">Your Trip</h3>
          {tripInfoFields.map(({ icon: Icon, label, value }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${value ? 'border-white/10 bg-white/5' : 'border-white/5 opacity-30'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${value ? 'bg-amber/20' : 'bg-white/5'}`}>
                <Icon size={16} className={value ? 'text-amber' : 'text-slate-muted'} />
              </div>
              <div>
                <p className="text-xs text-slate-muted">{label}</p>
                <p className={`text-sm font-medium ${value ? 'text-slate-text' : 'text-slate-muted'}`}>{value || '—'}</p>
              </div>
            </div>
          ))}
          {tripId && tripState.flights && (
            <button
              onClick={() => navigate(`/dashboard/${tripId}`)}
              className="mt-2 w-full py-2.5 rounded-xl bg-amber text-navy text-sm font-medium hover:bg-amber-light transition-colors"
            >
              View Dashboard →
            </button>
          )}
        </div>
      )}

      {/* Auth modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-navy/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-navy-card border border-slate-border rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-serif text-2xl text-slate-text mb-1">{authMode === 'login' ? 'Sign in' : 'Create account'}</h2>
            <p className="text-sm text-slate-muted mb-5">Save your trip and continue planning.</p>
            {authError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{authError}</div>}
            {authMessage && <div className="mb-4 p-3 rounded-lg bg-amber/10 border border-amber/30 text-sm text-amber">{authMessage}</div>}
            {!authMessage && (
              <form onSubmit={handleAuth} className="space-y-3">
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm" />
                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm" />
                <button type="submit" disabled={isAuthLoading} className="w-full py-3 rounded-xl bg-amber text-navy font-medium hover:bg-amber-light disabled:opacity-50 transition-colors text-sm">
                  {isAuthLoading ? (authMode === 'login' ? 'Signing in...' : 'Creating account...') : (authMode === 'login' ? 'Continue' : 'Create account')}
                </button>
              </form>
            )}
            <div className="mt-3 flex flex-col items-center gap-1">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthMessage(''); }} className="text-xs text-slate-muted hover:text-slate-text transition-colors">
                {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
              <button onClick={() => setShowAuth(false)} className="text-xs text-slate-muted hover:text-slate-text transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
