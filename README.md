# Gangemester

Et lite gangetabellspill for barnetrinnet.

## Innhold

- Gangestykker fra 0 x 0 til 10 x 10
- 60 sekunder per runde
- Fire svaralternativer
- Poeng og stjerner
- Highscore med bare `name` og `score`
- Supabase-støtte for felles highscore
- Admin-nullstilling via Supabase RPC-funksjon

## Kjør lokalt

1. Installer Node.js.
2. Pakk ut prosjektet.
3. Åpne terminal i prosjektmappen.
4. Kjør:

```bash
npm install
npm run dev
```

## Koble til Supabase

Lag en fil som heter `.env.local` i prosjektroten.

Bruk `.env.example` som mal:

```env
VITE_SUPABASE_URL=https://DIN-PROSJEKTREF.supabase.co
VITE_SUPABASE_ANON_KEY=LIM-INN-ANON-PUBLIC-KEY-HER
VITE_ADMIN_PIN_FALLBACK=1992
```

`anon public key` kan brukes i frontend. Ikke bruk `service_role`-nøkkelen i appen.

## SQL for Supabase

Kjør dette i Supabase SQL Editor hvis du ikke allerede har gjort det:

```sql
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 18),
  score int not null check (score >= 0)
);

alter table public.scores enable row level security;

grant select, insert on table public.scores to anon;

create policy "Alle kan se highscore"
on public.scores
for select
to anon
using (true);

create policy "Alle kan legge inn score"
on public.scores
for insert
to anon
with check (
  char_length(name) <= 18
  and score >= 0
);
```

## SQL for admin-nullstilling

```sql
create or replace function public.reset_scores(admin_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if admin_pin <> '1992' then
    raise exception 'Feil PIN';
  end if;

  delete from public.scores
  where id is not null;
end;
$$;

grant execute on function public.reset_scores(text) to anon;
```

## Publisering på Vercel

1. Lag et nytt GitHub-repo.
2. Last opp filene.
3. Gå til Vercel og velg "Import Project".
4. Velg repoet.
5. Legg inn disse Environment Variables i Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

