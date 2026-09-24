-- Anket cevapları ve iletişim bilgileri ayrı tablolarda tutulur:
-- analiz sırasında cevaplarla çalışırken kişisel veriye dokunmak gerekmez.

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  version text not null,
  answers jsonb not null,
  other jsonb not null default '{}'::jsonb,
  duration_sec integer,
  source text
);

create table if not exists public.survey_contacts (
  response_id uuid primary key references public.survey_responses(id) on delete cascade,
  created_at timestamptz not null default now(),
  email text not null,
  beta boolean not null default false,
  interview boolean not null default false,
  consent_at timestamptz not null
);

-- RLS açık ve hiç politika yok: anon/authenticated roller okuyamaz, yazamaz.
-- Yazma sadece sunucudaki API route'undan service role anahtarıyla yapılır.
alter table public.survey_responses enable row level security;
alter table public.survey_contacts enable row level security;

create index if not exists survey_responses_created_at_idx on public.survey_responses (created_at);
