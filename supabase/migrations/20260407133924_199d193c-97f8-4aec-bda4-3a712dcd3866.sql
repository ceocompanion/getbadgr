
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  call_date date NOT NULL DEFAULT CURRENT_DATE,
  call_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name, call_date)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
ON public.rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits"
ON public.rate_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits"
ON public.rate_limits FOR UPDATE
USING (auth.uid() = user_id);

-- Service role function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_function_name text,
  p_max_calls integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  INSERT INTO public.rate_limits (user_id, function_name, call_date, call_count)
  VALUES (p_user_id, p_function_name, CURRENT_DATE, 1)
  ON CONFLICT (user_id, function_name, call_date)
  DO UPDATE SET call_count = rate_limits.call_count + 1
  RETURNING call_count INTO current_count;
  
  RETURN current_count <= p_max_calls;
END;
$$;
