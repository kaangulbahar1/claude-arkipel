-- Aynı kaynaktan gelen art arda gönderimleri sınırlamak için tuzlanmış IP hash'i.
-- IP adresinin kendisi hiçbir yerde saklanmaz.
alter table public.survey_responses add column if not exists ip_hash text;

create index if not exists survey_responses_ip_hash_idx
  on public.survey_responses (ip_hash, created_at)
  where ip_hash is not null;
