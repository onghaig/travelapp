import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import { login, streamChat, createTrip } from '../lib/api';
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

interface Props {
  onAuthChange: (auth: boolean) => void;
}

export default function Chat({ onAuthChange }: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Travvy, your AI travel planner. Tell me where you'd like to go and I'll plan your perfect trip — flights, hotels, activities, and budget. \n\nWhere do you want to go?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolIndicator[]>([]);
  const [tripState, setTripState] = useState<TripState>({});
  const [tripId, setTripId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ensureTripId = async (): Promise<string> => {
    if (tripId) return tripId;
    const trip = await createTrip({ destination: tripState.destination || 'Unset' });
    setTripId(trip.id);
    return trip.id;
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const token = localStorage.getItem('travvy_token');
    if (!token) {
      setShowAuth(true);
      return;
    }

    const userContent = input;
    setInput('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', isStreaming: true }]);

    try {
      const currentTripId = await ensureTripId();

      await streamChat(
        currentTripId,
        userContent,
        (chunk: ChatChunk) => {
          if (chunk.type === 'text_delta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk.content }
                  : m
              )
            );
          } else if (chunk.type === 'tool_start') {
            setActiveTools((prev) => [...prev, { tool: chunk.tool, status: chunk.status }]);
          } else if (chunk.type === 'tool_result') {
            setActiveTools((prev) => prev.filter((t) => t.tool !== chunk.tool));
          } else if (chunk.type === 'trip_state_update') {
            setTripState(chunk.state);
          }
        },
        () => {
          setIsStreaming(false);
          setActiveTools([]);
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
          );

          // If trip has destination and dates, offer to go to dashboard
          if (tripState.destination && (tripState.departure_date || tripState.flights)) {
            setTimeout(() => {
              if (tripId) navigate(`/dashboard/${tripId}`);
            }, 1000);
          }
        }
      );
    } catch (err) {
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    try {
      await login(authEmail, authPassword);
      onAuthChange(true);
      setShowAuth(false);
      // Retry the pending message
      handleSend();
    } catch {
      setAuthError('Invalid email or password');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const tripInfoFields = [
    { icon: MapPin, label: 'Destination', value: tripState.destination },
    { icon: Calendar, label: 'Dates', value: tripState.departure_date ? `${tripState.departure_date}${tripState.return_date ? ' → ' + tripState.return_date : ''}` : undefined },
    { icon: Users, label: 'Travelers', value: tripState.num_travelers ? String(tripState.num_travelers) : undefined },
    { icon: DollarSign, label: 'Budget', value: tripState.budget_total ? `$${tripState.budget_total.toLocaleString()}` : undefined },
  ];

  const filledFields = tripInfoFields.filter((f) => f.value);

  return (
    <div className="min-h-screen bg-navy flex">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="p-6 text-center flex-shrink-0">
          <h1 className="font-serif text-4xl text-slate-text mb-2">
            Where do you want to go?
          </h1>
          <p className="text-slate-muted text-sm">
            Tell me your dream destination and I'll plan everything.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-amber text-navy font-medium rounded-br-sm'
                    : 'bg-white/5 border border-white/10 text-slate-text rounded-bl-sm backdrop-blur-sm'
                }`}
              >
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

          {/* Active tools */}
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

        {/* Input bar */}
        <div className="p-4 border-t border-slate-border flex-shrink-0">
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Tell me your travel plans..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="w-11 h-11 rounded-xl bg-amber text-navy flex items-center justify-center hover:bg-amber-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isStreaming ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Trip info sidebar */}
      {filledFields.length > 0 && (
        <div className="w-72 flex-shrink-0 p-6 hidden lg:flex flex-col gap-3">
          <h3 className="text-xs font-medium text-slate-muted uppercase tracking-wider mb-1">
            Your Trip
          </h3>
          {tripInfoFields.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                value
                  ? 'border-white/10 bg-white/5'
                  : 'border-white/5 opacity-30'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${value ? 'bg-amber/20' : 'bg-white/5'}`}>
                <Icon size={16} className={value ? 'text-amber' : 'text-slate-muted'} />
              </div>
              <div>
                <p className="text-xs text-slate-muted">{label}</p>
                <p className={`text-sm font-medium ${value ? 'text-slate-text' : 'text-slate-muted'}`}>
                  {value || '—'}
                </p>
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
            <h2 className="font-serif text-2xl text-slate-text mb-1">Sign in</h2>
            <p className="text-sm text-slate-muted mb-5">Save your trip and continue planning.</p>
            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                {authError}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-3">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm"
              />
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 rounded-xl bg-amber text-navy font-medium hover:bg-amber-light disabled:opacity-50 transition-colors text-sm"
              >
                {isAuthLoading ? 'Signing in...' : 'Continue'}
              </button>
            </form>
            <button
              onClick={() => setShowAuth(false)}
              className="mt-3 w-full text-center text-xs text-slate-muted hover:text-slate-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
