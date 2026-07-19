-- Stores one "Run Pipeline" click: the samples submitted and the eventual results.
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null unique,
  github_run_id bigint,
  status text not null default 'pending', -- pending | running | completed | failed
  samples jsonb not null,                 -- [{label, code, language}]
  results jsonb,                          -- {label: {linesOfCode, error, warning, info, findings: [...]}}
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pipeline_runs_dispatch_id_idx on public.pipeline_runs (dispatch_id);

-- Stores the "why did you choose this output" answers logged for the final analysis.
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.pipeline_runs (id),
  chosen_label text not null,
  reasons jsonb not null,   -- {whyChosen, tradeoffs, confidence, notes, ...}
  logged_to_sheet boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pipeline_runs enable row level security;
alter table public.decisions enable row level security;

-- This is a single-user research tool with no auth, so allow the anon key
-- (used only through your Edge Functions) full access. Tighten this if you
-- ever add real user accounts.
create policy "anon full access - pipeline_runs" on public.pipeline_runs
  for all using (true) with check (true);

create policy "anon full access - decisions" on public.decisions
  for all using (true) with check (true);
