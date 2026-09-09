-- Stage 1: VHFReady core schema + RLS
-- Educational text columns store supplied JSON verbatim (no silent normalisation).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = uid
      and ar.revoked_at is null
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profiles & admin
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  disabled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  unique (user_id, role)
);

create index admin_roles_user_id_idx on public.admin_roles (user_id)
  where revoked_at is null;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Imports
-- ---------------------------------------------------------------------------

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  content_type text not null check (
    content_type in ('question_bank', 'flashcards', 'mock_exams', 'mixed')
  ),
  dry_run boolean not null default false,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  imported_count integer not null default 0,
  rejected_count integer not null default 0,
  warning_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports (id) on delete cascade,
  severity text not null check (severity in ('error', 'warning', 'info')),
  code text not null,
  message text not null,
  record_index integer,
  payload_excerpt text,
  created_at timestamptz not null default timezone('utc', now())
);

create index import_errors_import_id_idx on public.import_errors (import_id);

-- ---------------------------------------------------------------------------
-- Qualifications / sections
-- ---------------------------------------------------------------------------

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  code text not null,
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default false,
  needs_review boolean not null default true,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (country_code, code)
);

create trigger qualifications_set_updated_at
before update on public.qualifications
for each row execute function public.set_updated_at();

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (qualification_id, label)
);

create table public.subsections (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (section_id, label)
);

-- ---------------------------------------------------------------------------
-- Canonical educational content
-- ---------------------------------------------------------------------------

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications (id),
  section text not null,
  subsection text not null,
  question_text text not null,
  correct_answer text not null,
  explanation text not null,
  source text not null,
  content_hash text not null,
  source_filename text,
  import_batch_id uuid references public.imports (id),
  active boolean not null default true,
  quarantine boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (qualification_id, content_hash)
);

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create index questions_qualification_id_idx on public.questions (qualification_id);
create index questions_section_idx on public.questions (qualification_id, section, subsection);
create index questions_active_idx on public.questions (qualification_id) where active and not quarantine;

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_index integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (question_id, sort_index)
);

create index question_options_question_id_idx on public.question_options (question_id);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications (id),
  section text not null,
  subsection text not null,
  prompt text not null,
  answer text not null,
  content_hash text not null,
  source_filename text,
  import_batch_id uuid references public.imports (id),
  related_question_id uuid references public.questions (id),
  active boolean not null default true,
  quarantine boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (qualification_id, content_hash)
);

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row execute function public.set_updated_at();

create index flashcards_qualification_id_idx on public.flashcards (qualification_id);
create index flashcards_section_idx on public.flashcards (qualification_id, section, subsection);

create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications (id),
  title text not null,
  pass_mark_text text not null,
  total_questions integer not null check (total_questions > 0),
  time_limit_seconds integer,
  content_hash text not null,
  source_filename text,
  import_batch_id uuid references public.imports (id),
  active boolean not null default true,
  quarantine boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (qualification_id, content_hash)
);

create trigger mock_exams_set_updated_at
before update on public.mock_exams
for each row execute function public.set_updated_at();

-- option_order stores the exact Options array from the mock JSON for that paper
create table public.mock_exam_questions (
  id uuid primary key default gen_random_uuid(),
  mock_exam_id uuid not null references public.mock_exams (id) on delete cascade,
  question_id uuid references public.questions (id),
  question_number integer not null,
  option_order jsonb not null,
  unresolved boolean not null default false,
  unresolved_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (mock_exam_id, question_number)
);

create index mock_exam_questions_exam_idx on public.mock_exam_questions (mock_exam_id);
create index mock_exam_questions_question_idx on public.mock_exam_questions (question_id);

-- ---------------------------------------------------------------------------
-- Review metadata (separate from canonical content)
-- ---------------------------------------------------------------------------

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (
    content_type in ('question', 'flashcard', 'mock_exam', 'qualification')
  ),
  content_id uuid not null,
  review_status text not null default 'needs_review' check (
    review_status in (
      'needs_review',
      'under_review',
      'reviewed_ok',
      'source_update_required',
      'disabled'
    )
  ),
  review_notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (content_type, content_id)
);

create trigger content_reviews_set_updated_at
before update on public.content_reviews
for each row execute function public.set_updated_at();

create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  content_type text not null check (
    content_type in ('question', 'flashcard', 'mock_exam')
  ),
  content_id uuid not null,
  category text not null check (
    category in (
      'question_appears_incorrect',
      'answer_appears_incorrect',
      'explanation_unclear',
      'typo_or_formatting',
      'source_issue',
      'other'
    )
  ),
  comment text,
  status text not null default 'open' check (
    status in (
      'open',
      'under_review',
      'resolved_no_change',
      'resolved_source_update_required',
      'disabled'
    )
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger content_flags_set_updated_at
before update on public.content_flags
for each row execute function public.set_updated_at();

create index content_flags_status_idx on public.content_flags (status);
create index content_flags_content_idx on public.content_flags (content_type, content_id);

create table public.content_flag_events (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.content_flags (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- User progress
-- ---------------------------------------------------------------------------

create table public.user_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  chosen_option_text text not null,
  is_correct boolean not null,
  attempt_number integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create index user_question_attempts_user_idx
  on public.user_question_attempts (user_id, created_at desc);
create index user_question_attempts_question_idx
  on public.user_question_attempts (user_id, question_id);

create table public.user_question_review_state (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  marked_for_review boolean not null default false,
  last_result_correct boolean,
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, question_id)
);

create table public.user_flashcard_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  status text not null default 'unseen' check (
    status in ('unseen', 'seen', 'confident', 'needs_review')
  ),
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, flashcard_id)
);

create table public.user_mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mock_exam_id uuid not null references public.mock_exams (id) on delete cascade,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  score numeric(6, 2),
  percentage numeric(6, 2),
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unanswered_count integer not null default 0,
  passed boolean,
  created_at timestamptz not null default timezone('utc', now())
);

create index user_mock_attempts_user_idx
  on public.user_mock_attempts (user_id, started_at desc);

create table public.user_mock_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.user_mock_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  question_number integer not null,
  chosen_option_text text,
  is_correct boolean,
  answered_at timestamptz,
  unique (attempt_id, question_number)
);

-- ---------------------------------------------------------------------------
-- Seed draft qualification (inactive, needs review) — not marine VHF invention
-- ---------------------------------------------------------------------------

insert into public.qualifications (
  country_code, code, slug, name, description, active, needs_review, review_notes
) values (
  'IE',
  'HAREC',
  'ireland/harec',
  'Irish HAREC (Amateur Station Licence)',
  'Draft qualification inferred from supplied JSON exam titles and IRTS HAREC sources. Inactive until admin confirms. Not marine VHF SRC.',
  false,
  true,
  'Stage 0 product/content mismatch: platform brief is marine VHF; supplied JSON is HAREC. Confirm before activating.'
);

insert into public.content_reviews (content_type, content_id, review_status, review_notes)
select
  'qualification',
  q.id,
  'needs_review',
  'Auto-seeded from Stage 1 migration; confirm slug/routing and product scope before activation.'
from public.qualifications q
where q.slug = 'ireland/harec';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.imports enable row level security;
alter table public.import_errors enable row level security;
alter table public.qualifications enable row level security;
alter table public.sections enable row level security;
alter table public.subsections enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.flashcards enable row level security;
alter table public.mock_exams enable row level security;
alter table public.mock_exam_questions enable row level security;
alter table public.content_reviews enable row level security;
alter table public.content_flags enable row level security;
alter table public.content_flag_events enable row level security;
alter table public.user_question_attempts enable row level security;
alter table public.user_question_review_state enable row level security;
alter table public.user_flashcard_progress enable row level security;
alter table public.user_mock_attempts enable row level security;
alter table public.user_mock_answers enable row level security;

-- Profiles
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and disabled_at is null)
  with check (id = auth.uid());

-- Admin roles: readable by admins only; no self-insert via client
create policy admin_roles_select_admin on public.admin_roles
  for select to authenticated
  using (public.is_admin());

-- Qualifications: public can read active; admins read all
create policy qualifications_select_active on public.qualifications
  for select to anon, authenticated
  using (active = true or public.is_admin());

create policy qualifications_admin_write on public.qualifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy sections_select on public.sections
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.qualifications q
      where q.id = sections.qualification_id
        and (q.active = true or public.is_admin())
    )
  );

create policy subsections_select on public.subsections
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.sections s
      join public.qualifications q on q.id = s.qualification_id
      where s.id = subsections.section_id
        and (q.active = true or public.is_admin())
    )
  );

-- Educational content: active + not quarantined for users; admins full read
create policy questions_select_permitted on public.questions
  for select to authenticated
  using (
    public.is_admin()
    or (active = true and quarantine = false)
  );

create policy questions_admin_update_meta on public.questions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy question_options_select on public.question_options
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_options.question_id
        and (public.is_admin() or (q.active and not q.quarantine))
    )
  );

create policy flashcards_select_permitted on public.flashcards
  for select to authenticated
  using (public.is_admin() or (active = true and quarantine = false));

create policy flashcards_admin_update_meta on public.flashcards
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy mock_exams_select_permitted on public.mock_exams
  for select to authenticated
  using (public.is_admin() or (active = true and quarantine = false));

create policy mock_exams_admin_update_meta on public.mock_exams
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy mock_exam_questions_select on public.mock_exam_questions
  for select to authenticated
  using (
    exists (
      select 1 from public.mock_exams m
      where m.id = mock_exam_questions.mock_exam_id
        and (public.is_admin() or (m.active and not m.quarantine))
    )
  );

-- Imports / reviews: admin only
create policy imports_admin_all on public.imports
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy import_errors_admin_all on public.import_errors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_reviews_admin_all on public.content_reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Content flags: users insert own; read own; admins all
create policy content_flags_insert_own on public.content_flags
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy content_flags_select_own_or_admin on public.content_flags
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy content_flags_admin_update on public.content_flags
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_flag_events_select on public.content_flag_events
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.content_flags f
      where f.id = content_flag_events.flag_id and f.reporter_id = auth.uid()
    )
  );

create policy content_flag_events_admin_insert on public.content_flag_events
  for insert to authenticated
  with check (public.is_admin());

-- Progress: own rows only
create policy uqa_select_own on public.user_question_attempts
  for select to authenticated using (user_id = auth.uid());
create policy uqa_insert_own on public.user_question_attempts
  for insert to authenticated with check (user_id = auth.uid());

create policy uqrs_all_own on public.user_question_review_state
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy ufp_all_own on public.user_flashcard_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy uma_select_own on public.user_mock_attempts
  for select to authenticated using (user_id = auth.uid());
create policy uma_insert_own on public.user_mock_attempts
  for insert to authenticated with check (user_id = auth.uid());
create policy uma_update_own on public.user_mock_attempts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy umans_select_own on public.user_mock_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.user_mock_attempts a
      where a.id = user_mock_answers.attempt_id and a.user_id = auth.uid()
    )
  );
create policy umans_insert_own on public.user_mock_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_mock_attempts a
      where a.id = user_mock_answers.attempt_id and a.user_id = auth.uid()
    )
  );
create policy umans_update_own on public.user_mock_answers
  for update to authenticated
  using (
    exists (
      select 1 from public.user_mock_attempts a
      where a.id = user_mock_answers.attempt_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_mock_attempts a
      where a.id = user_mock_answers.attempt_id and a.user_id = auth.uid()
    )
  );

-- Admins may inspect user progress metadata
create policy uqa_admin_select on public.user_question_attempts
  for select to authenticated using (public.is_admin());
create policy uma_admin_select on public.user_mock_attempts
  for select to authenticated using (public.is_admin());
create policy ufp_admin_select on public.user_flashcard_progress
  for select to authenticated using (public.is_admin());
create policy uqrs_admin_select on public.user_question_review_state
  for select to authenticated using (public.is_admin());
