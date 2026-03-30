#!/bin/bash
# Apply all SQL migrations to Supabase in order.
# Usage: bun run db:migrate

set -e

PROJECT_ID="jjomkrlwakrtshdnsrtu"
SQL_DIR="src/api/sql"

MIGRATIONS=$(find "$SQL_DIR" -maxdepth 1 -name '*.sql' -type f | sort)
COUNT=$(echo "$MIGRATIONS" | wc -l | tr -d ' ')

echo "Applying $COUNT migrations to project $PROJECT_ID..."

# Clean up rooms before migrating
echo "  Cleaning up rooms..."
npx supabase db query --linked -c "
  -- Kill stale rooms: in_progress with no activity for 1h+
  update public.rooms set status = 'finished'
  where status = 'in_progress'
    and updated_at < now() - interval '1 hour';
  -- Kill rooms in lobby with no activity for 1h+
  update public.rooms set status = 'finished'
  where status = 'lobby'
    and updated_at < now() - interval '1 hour';
  -- Delete rooms with no players at all
  delete from public.rooms
  where id not in (select distinct room_id from public.room_players);
" 2>/dev/null || true

for path in $MIGRATIONS; do
  file=$(basename "$path")
  echo "  Applying $file..."
  npx supabase db query --linked -f "$path"
done

echo "Done. Regenerating types..."
npx supabase gen types typescript --project-id "$PROJECT_ID" > src/api/database.types.ts
echo "Types updated."
