export type GiveawayStatus = 'draft' | 'open' | 'closed' | 'drawn';
export type WinStatus = 'pending' | 'contacted' | 'claimed' | 'forfeited';

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'user' | 'admin';
  notifications_opt_in: boolean;
  created_at: string;
};

export type Giveaway = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  product_url: string | null;
  wc_product_id: number | null;
  retail_price_ron: number;
  giveaway_price_ron: number;
  opens_at: string;
  closes_at: string;
  status: GiveawayStatus;
  entry_count: number;
  winner_display: string | null;
  notified_at: string | null;
  created_at: string;
};

export type Win = {
  id: string;
  giveaway_id: string;
  draw_id: string;
  user_id: string | null;
  status: WinStatus;
  coupon_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  user_id: string;
  from_admin: boolean;
  giveaway_id: string | null;
  title: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};
