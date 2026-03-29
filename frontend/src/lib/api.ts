import { ChatChunk, Trip, Booking } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

function getToken(): string {
  return localStorage.getItem('travvy_token') || '';
}

function setToken(token: string): void {
  localStorage.setItem('travvy_token', token);
}

function clearToken(): void {
  localStorage.removeItem('travvy_token');
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

export async function login(email: string, password: string): Promise<{ user: { id: string; email: string }; access_token: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export async function signup(email: string, password: string): Promise<{ user?: { id: string; email: string }; access_token?: string; message?: string }> {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Signup failed');
  }
  const data = await res.json();
  if (data.access_token) setToken(data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  await authFetch('/api/auth/logout', { method: 'POST' });
  clearToken();
}

export async function getTrips(): Promise<Trip[]> {
  const res = await authFetch('/api/trips');
  if (!res.ok) throw new Error('Failed to fetch trips');
  const data = await res.json();
  return data.trips;
}

export async function createTrip(params: {
  destination: string;
  departure_date?: string;
  return_date?: string;
  num_travelers?: number;
  budget_total?: number;
}): Promise<Trip> {
  const res = await authFetch('/api/trips', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to create trip');
  const data = await res.json();
  return data.trip;
}

export async function getTrip(tripId: string): Promise<Trip> {
  const res = await authFetch(`/api/trips/${tripId}`);
  if (!res.ok) throw new Error('Failed to fetch trip');
  const data = await res.json();
  return data.trip;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
  const res = await authFetch(`/api/trips/${tripId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update trip');
}

export async function streamChat(
  tripId: string,
  message: string,
  onChunk: (chunk: ChatChunk) => void,
  onDone: () => void
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ trip_id: tripId, message }),
  });

  if (!res.ok) throw new Error('Chat request failed');

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n').filter((l) => l.startsWith('data: '));
    for (const line of lines) {
      const data = line.replace('data: ', '');
      if (data === '[DONE]') {
        onDone();
        return;
      }
      try {
        onChunk(JSON.parse(data) as ChatChunk);
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export async function streamChatChange(
  tripId: string,
  message: string,
  onChunk: (chunk: ChatChunk) => void,
  onDone: () => void
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/chat/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ trip_id: tripId, message }),
  });

  if (!res.ok) throw new Error('Change request failed');

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n').filter((l) => l.startsWith('data: '));
    for (const line of lines) {
      const data = line.replace('data: ', '');
      if (data === '[DONE]') {
        onDone();
        return;
      }
      try {
        onChunk(JSON.parse(data) as ChatChunk);
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export async function getBookings(tripId: string): Promise<Booking[]> {
  const res = await authFetch(`/api/bookings/${tripId}`);
  if (!res.ok) throw new Error('Failed to fetch bookings');
  const data = await res.json();
  return data.bookings;
}

export async function initiateBooking(
  tripId: string,
  bookingType: string,
  itemId: string,
  travelerInfo: Record<string, unknown>
): Promise<{ booking: Booking; result: Record<string, unknown> }> {
  const res = await authFetch(`/api/bookings/${tripId}/initiate`, {
    method: 'POST',
    body: JSON.stringify({ booking_type: bookingType, item_id: itemId, traveler_info: travelerInfo }),
  });
  if (!res.ok) throw new Error('Failed to initiate booking');
  return res.json();
}

export async function updateBooking(
  bookingId: string,
  updates: { status?: string; confirmation_number?: string; actual_cost?: number }
): Promise<void> {
  const res = await authFetch(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update booking');
}

export { getToken, setToken, clearToken };
