
-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  job_title TEXT,
  company TEXT,
  email TEXT,
  linkedin_url TEXT,
  company_website TEXT,
  notes TEXT,
  voice_note_url TEXT,
  voice_transcript TEXT,
  badge_photo_url TEXT,
  event_name TEXT,
  event_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('badge-photos', 'badge-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', true);

-- Storage policies
CREATE POLICY "Users can upload badge photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'badge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Badge photos are public" ON storage.objects FOR SELECT USING (bucket_id = 'badge-photos');
CREATE POLICY "Users can upload voice notes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Voice notes are public" ON storage.objects FOR SELECT USING (bucket_id = 'voice-notes');
