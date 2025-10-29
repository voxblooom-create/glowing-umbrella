-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roblox_username TEXT NOT NULL,
  robux_amount INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  email TEXT,
  pix_code TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON public.orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Since this is not a user authentication system, we'll disable RLS
-- and handle security through API routes with password protection
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
