export interface User {
  id: string;
  email: string;
}

export interface Trip {
  id: string;
  user_id: string;
  destination: string;
  departure_date?: string;
  return_date?: string;
  num_travelers: number;
  budget_total?: number;
  budget_breakdown: Record<string, unknown>;
  status: 'planning' | 'confirmed' | 'completed';
  state_json: TripState;
  created_at: string;
  updated_at?: string;
}

export interface TripState {
  destination?: string;
  origin?: string;
  departure_date?: string;
  return_date?: string;
  num_travelers?: number;
  budget_total?: number;
  lodging_type?: 'airbnb' | 'hotel' | 'both';
  preferred_airlines?: string[];
  preferred_times?: 'morning' | 'afternoon' | 'evening' | 'any';
  interests?: string[];
  flights?: Flight[];
  selected_flight?: Flight;
  lodging?: Lodging[];
  selected_lodging?: Lodging;
  events?: TripEvent[];
  selected_events?: TripEvent[];
  budget?: BudgetBreakdown;
  calendar_events?: CalendarEvent[];
  verification?: VerificationResult;
}

export interface Flight {
  id: string;
  airline: string;
  airline_code: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  stop_city?: string;
  price_per_person: number;
  total_price: number;
  cabin_class: string;
  baggage_included: boolean;
  booking_url_params: Record<string, unknown>;
}

export interface Lodging {
  id: string;
  name: string;
  type: 'hotel' | 'airbnb';
  neighborhood: string;
  destination: string;
  rating: number;
  stars?: number;
  price_per_night: number;
  total_price: number;
  nights: number;
  check_in: string;
  check_out: string;
  amenities: string[];
  max_guests: number;
  booking_url_params: Record<string, unknown>;
}

export interface TripEvent {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  duration_hours: number;
  price_per_person: number;
  rating: number;
  destination: string;
  booking_url_params: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  trip_id: string;
  type: 'flight' | 'lodging' | 'event';
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  color: string;
  metadata: Record<string, unknown>;
}

export interface BudgetBreakdown {
  budget_total: number;
  total_estimated: number;
  remaining: number;
  over_budget: boolean;
  percentage_used: number;
  breakdown: Record<string, { total: number; items: { label: string; cost: number }[] }>;
  warnings: string[];
}

export interface VerificationResult {
  trip_id: string;
  status: 'approved' | 'needs_review';
  issues: string[];
  warnings: string[];
  checks_passed: string[];
  ready_to_book: boolean;
  summary: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  type: 'flight' | 'hotel' | 'airbnb' | 'event';
  status: 'pending' | 'confirmed' | 'cancelled';
  provider?: string;
  details: Record<string, unknown>;
  estimated_cost?: number;
  actual_cost?: number;
  booking_url?: string;
  confirmation_number?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type ChatChunk =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_start'; tool: string; status: string }
  | { type: 'tool_result'; tool: string; data: unknown }
  | { type: 'trip_state_update'; state: TripState }
  | { type: 'calendar_update'; events: CalendarEvent[] }
  | { type: 'budget_update'; breakdown: BudgetBreakdown }
  | { type: 'done' }
  | { type: 'error'; message: string };
