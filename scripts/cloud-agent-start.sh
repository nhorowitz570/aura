#!/usr/bin/env bash
# Per-boot startup for a Cloud Agent environment: bring up the local Supabase
# stack, apply migrations, seed data, and write .env.local for the Next.js app.
# Safe to run repeatedly (idempotent).
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. Force the fuse-overlayfs storage driver (see cloud-agent-install.sh).
sudo mkdir -p /etc/docker
echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null

# 2. Start the Docker daemon (detached) if it is not already running.
if ! sudo docker info >/dev/null 2>&1; then
  sudo bash -c 'setsid dockerd >/tmp/dockerd.log 2>&1 < /dev/null &'
  for _ in $(seq 1 60); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 1
  done
  sudo docker info >/dev/null 2>&1 || { echo "dockerd failed to start"; tail -20 /tmp/dockerd.log; exit 1; }
fi

# 3. Let same-bridge container traffic bypass netfilter. Docker's nftables rules
#    are only partially installed in the nested VM, which otherwise drops
#    inter-container packets and breaks Supabase's Postgres <-> service links.
echo 0 | sudo tee /proc/sys/net/bridge/bridge-nf-call-iptables >/dev/null 2>&1 || true
echo 0 | sudo tee /proc/sys/net/bridge/bridge-nf-call-ip6tables >/dev/null 2>&1 || true

# 4. Start the local Supabase stack (idempotent; applies supabase/migrations).
sudo supabase start

# 5. Resolve the Postgres container name and apply the extra migrations that
#    live under db/migrations (outside the supabase/migrations directory).
DB_CONTAINER="$(sudo docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
for f in db/migrations/v3_ai_prefs_features.sql db/migrations/v4_access_codes.sql; do
  sudo docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f" >/dev/null
done

# 6. Seed the exercise catalog (idempotent). The app's seed script relies on an
#    ON CONFLICT target that the partial unique index does not satisfy, so seed
#    directly via generated SQL instead.
node -e '
const fs=require("fs");
const items=JSON.parse(fs.readFileSync("supabase/seed/exercises.json","utf8"));
const esc=s=>String(s).replace(/'"'"'/g,"'"'"''"'"'");
const vals=items.map(i=>`(null,'"'"'${esc(i.name)}'"'"','"'"'${esc(i.type)}'"'"','"'"'${esc(i.muscle_group)}'"'"','"'"'${esc(i.equipment)}'"'"')`).join(",\n");
process.stdout.write(`insert into public.exercises (owner_id,name,type,muscle_group,equipment) values\n${vals}\non conflict do nothing;\n`);
' | sudo docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null

# 7. Write .env.local from the running stack (keys are deterministic local
#    defaults). OPENROUTER_API_KEY is optional and enables the AI assistant.
eval "$(sudo supabase status -o env | sed 's/^/SUPA_/')"
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=${SUPA_API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPA_PUBLISHABLE_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPA_SECRET_KEY}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
EOF

echo "cloud-agent-start: Supabase is up and .env.local written"
