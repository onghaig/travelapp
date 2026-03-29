import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { streamChatChange } from '../lib/api';
import { ChatChunk, TripState } from '../lib/types';

interface FloatingChatProps {
  tripId: string;
  onStateUpdate?: (state: TripState) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function FloatingChat({ tripId, onStateUpdate }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Ask me to change anything about your trip — flights, hotels, budget, or activities.' }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      await streamChatChange(
        tripId,
        input,
        (chunk: ChatChunk) => {
          if (chunk.type === 'text_delta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk.content } : m
              )
            );
          } else if (chunk.type === 'tool_start') {
            setActiveTools((prev) => [...prev, chunk.status]);
          } else if (chunk.type === 'trip_state_update') {
            onStateUpdate?.(chunk.state);
          } else if (chunk.type === 'tool_result') {
            setActiveTools([]);
          }
        },
        () => {
          setIsStreaming(false);
          setActiveTools([]);
        }
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
            : m
        )
      );
      setIsStreaming(false);
      setActiveTools([]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 bg-navy-card border border-slate-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center">
                <MessageCircle size={14} className="text-amber" />
              </div>
              <span className="text-sm font-medium text-slate-text">Ask for changes...</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={16} className="text-slate-muted" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${
                    msg.role === 'user'
                      ? 'bg-amber text-navy font-medium'
                      : 'bg-white/5 border border-white/10 text-slate-text'
                  }`}
                >
                  {msg.content || (msg.role === 'assistant' && isStreaming ? (
                    <span className="flex gap-1">
                      <span className="typing-dot w-1 h-1 rounded-full bg-slate-muted" />
                      <span className="typing-dot w-1 h-1 rounded-full bg-slate-muted" />
                      <span className="typing-dot w-1 h-1 rounded-full bg-slate-muted" />
                    </span>
                  ) : '')}
                </div>
              </div>
            ))}
            {activeTools.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-muted">
                <Loader2 size={12} className="animate-spin" />
                <span>{activeTools[activeTools.length - 1]}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Change my hotel..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="p-2 rounded-lg bg-amber text-navy hover:bg-amber-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-amber text-navy shadow-lg hover:bg-amber-light hover:scale-105 transition-all duration-200 flex items-center justify-center"
        >
          <MessageCircle size={20} />
        </button>
      )}
    </div>
  );
}
