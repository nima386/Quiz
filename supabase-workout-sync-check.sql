-- Optional verification/fix for workout set upserts.
-- Run only if Supabase reports an onConflict/unique constraint error.

alter table public.workout_sets
  add constraint workout_sets_day_exercise_set_unique
  unique (workout_day_id, exercise_id, set_index);
