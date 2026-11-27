CREATE TABLE IF NOT EXISTS public.mobile_students (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    student_number text NOT NULL DEFAULT 'Not linked',
    program text NOT NULL DEFAULT 'Awaiting clinic verification',
    year_level integer NOT NULL DEFAULT 1 CHECK (year_level BETWEEN 1 AND 8),
    phone text NOT NULL DEFAULT '',
    theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark'))
);
CREATE TABLE IF NOT EXISTS public.mobile_visits (
    id uuid PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.mobile_students(id),
    reference text UNIQUE NOT NULL,
    date date NOT NULL,
    period text NOT NULL CHECK (period IN ('morning','afternoon')),
    service text NOT NULL CHECK (service IN ('physical_exam','xray_verification','dental_consultation','tooth_extraction')),
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','checked_in','completed','cancelled','no_show')),
    notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mobile_visits_one_period ON public.mobile_visits(user_id,date,period) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS mobile_visits_capacity ON public.mobile_visits(date,period) WHERE status <> 'cancelled';
CREATE TABLE IF NOT EXISTS public.mobile_clearances (
    id uuid PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.mobile_students(id),
    school_year text NOT NULL,
    year_level integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','incomplete','cleared')),
    physical_exam boolean NOT NULL DEFAULT false,
    documents_received boolean NOT NULL DEFAULT false,
    xray_verified boolean NOT NULL DEFAULT false,
    reviewed_at date,
    notes text NOT NULL DEFAULT 'Awaiting clinic review. This is a connected prototype record.',
    exam jsonb,
    UNIQUE(user_id,school_year)
);
CREATE TABLE IF NOT EXISTS public.mobile_announcements (
    id text PRIMARY KEY,
    category text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    body text NOT NULL,
    icon text NOT NULL DEFAULT 'megaphone-outline',
    color text NOT NULL DEFAULT 'green'
);
CREATE TABLE IF NOT EXISTS public.mobile_reads (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.mobile_students(id),
    announcement_id text NOT NULL REFERENCES public.mobile_announcements(id),
    UNIQUE(user_id,announcement_id)
);
CREATE TABLE IF NOT EXISTS public.mobile_schedule (
    id date PRIMARY KEY,
    morning integer NOT NULL DEFAULT 24 CHECK (morning BETWEEN 0 AND 24),
    afternoon integer NOT NULL DEFAULT 24 CHECK (afternoon BETWEEN 0 AND 24),
    daily integer NOT NULL DEFAULT 48 CHECK (daily BETWEEN 0 AND 48),
    closed boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.mobile_sync (
    id text PRIMARY KEY,
    revision bigint NOT NULL DEFAULT 0
);
INSERT INTO public.mobile_sync(id) VALUES ('*') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.mobile_signal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text;
BEGIN
    IF TG_TABLE_NAME = 'mobile_students' THEN
        owner_id := COALESCE(NEW.id,OLD.id);
    ELSIF TG_TABLE_NAME IN ('mobile_visits','mobile_clearances','mobile_reads') THEN
        owner_id := COALESCE(NEW.user_id,OLD.user_id);
    ELSE
        owner_id := '*';
    END IF;
    INSERT INTO public.mobile_sync(id,revision) VALUES(owner_id,1)
    ON CONFLICT(id) DO UPDATE SET revision=mobile_sync.revision+1;
    IF TG_TABLE_NAME = 'mobile_visits' THEN
        UPDATE public.mobile_sync SET revision=revision+1 WHERE id='*';
    END IF;
    RETURN NULL;
END $$;
DO $$ DECLARE table_name text; BEGIN
    FOREACH table_name IN ARRAY ARRAY['mobile_students','mobile_visits','mobile_clearances','mobile_reads','mobile_schedule','mobile_announcements'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname=table_name||'_signal') THEN
            EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.mobile_signal()',table_name||'_signal',table_name);
        END IF;
    END LOOP;
END $$;
INSERT INTO public.mobile_announcements(id,category,title,summary,body,icon,color) VALUES
('connected-prototype','PROTOTYPE UPDATE','Your student space is connected.','Appointments and contact details now sync through Neon.','This is the connected NEU Health prototype. Reservations are stored in its shared test schedule. The staff portal is still separate; contact the clinic for an official appointment. Never enter real medical information during testing.','cloud-done-outline','green'),
('clinic-hours','CLINIC ADVISORY','Plan your visit ahead.','Morning and afternoon periods share the daily capacity.','Prototype scheduling offers morning (8 AM–12 PM) and afternoon (1–4 PM) visits on weekdays. Clinic staff confirm actual clinic availability. Bring your student identification and requested documents.','calendar-outline','blue')
ON CONFLICT(id) DO NOTHING;
