// ── Supabase Database Row Types ──────────────────────────────────────────────
// These mirror the Supabase tables defined in SUPABASE_SETUP.sql.
// They are used by service files to type the responses from Supabase queries.

export interface UserRow {
  id: string; // uuid PK (same as auth.users.id)
  user_id: string; // app-level id for backward compat
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friend_phone: string | null;
  friend_avatar: string | null;
  status: string;
  created_at: string;
}

export interface InvitationRow {
  id: string;
  from_user_id: string;
  from_user_name: string;
  to_phone: string;
  to_name: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  message: string | null;
}

export interface ExpenseRow {
  id: string;
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  split_between: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  }[];
  split_type: string;
  splits: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
  category: string;
  date: string;
  group_id: string | null;
  receipt: string | null;
  location: { latitude: number; longitude: number; address: string } | null;
  recurring: { frequency: string; endDate?: string } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface GroupRow {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  members: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  }[];
  created_by: string;
  created_at: string;
  updated_at: string;
  simplify_debts: boolean;
  owner_id: string;
}

export interface SettlementRow {
  id: string;
  settlement_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  date: string;
  note: string | null;
  group_id: string | null;
  created_at: string;
  owner_id: string;
}
