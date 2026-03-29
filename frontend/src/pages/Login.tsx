import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, signup } from '../lib/api';

interface Props {
  onAuthChange: (auth: boolean) => void;
}

export default function Login({ onAuthChange }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        await login(email, password);
        onAuthChange(true);
        navigate('/');
      } else {
        const result = await signup(email, password);
        if (result.access_token) {
          onAuthChange(true);
          navigate('/');
        } else {
          setMessage(result.message || 'Check your email to confirm your account.');
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'login'
          ? 'Invalid email or password'
          : 'Signup failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="font-serif text-3xl text-amber hover:text-amber-light transition-colors">
            Travvy
          </Link>
          <p className="text-slate-muted text-sm mt-2">Your AI travel planner</p>
        </div>

        <div className="bg-navy-card border border-slate-border rounded-2xl p-6">
          <h2 className="font-serif text-2xl text-slate-text mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-slate-muted mb-5">
            {mode === 'login'
              ? 'Sign in to continue planning your trip.'
              : 'Sign up to save and manage your trips.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}

          {message ? (
            <div className="mb-4 p-3 rounded-lg bg-amber/10 border border-amber/30 text-sm text-amber">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-text placeholder:text-slate-muted focus:outline-none focus:border-amber/50 transition-colors text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber text-navy font-medium hover:bg-amber-light disabled:opacity-50 transition-colors text-sm"
              >
                {loading
                  ? mode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-slate-muted">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setMessage('');
              }}
              className="text-amber hover:text-amber-light transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
