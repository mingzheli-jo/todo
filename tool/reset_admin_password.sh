#!/usr/bin/env bash
#
# Reset the admin password directly in the running stack.
#
# Use when the admin can't log in — for example, because bootstrap.sh's
# bcrypt step failed and the DB ended up with a placeholder hash, or
# because the password was forgotten.
#
# Usage (run from the repo root, with the stack already up):
#
#     ./tool/reset_admin_password.sh                # uses ADMIN_USERNAME from .env
#     ./tool/reset_admin_password.sh someuser       # explicit username
#     ADMIN_USERNAME=alice ./tool/reset_admin_password.sh
#
# Compose project (and thus the api/postgres container names) is detected
# from the current directory. Override with COMPOSE_PROJECT=<name> if the
# stack was started with a different project name.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "ERROR: .env not found. Are you in the repo root?" >&2
    exit 1
fi

ADMIN_USERNAME=${1:-${ADMIN_USERNAME:-$(grep '^ADMIN_USERNAME=' .env | cut -d= -f2-)}}
if [ -z "$ADMIN_USERNAME" ]; then
    echo "ERROR: could not determine admin username. Pass it as the first arg." >&2
    exit 1
fi

PROJECT=${COMPOSE_PROJECT:-$(basename "$(pwd)" | tr -d '[:space:]')}
API_CONTAINER="${PROJECT}-api-1"
PG_CONTAINER="${PROJECT}-postgres-1"

for c in "$API_CONTAINER" "$PG_CONTAINER"; do
    if ! docker inspect "$c" >/dev/null 2>&1; then
        echo "ERROR: container '$c' not found. Is the stack up?" >&2
        echo "       Tip: set COMPOSE_PROJECT=<name> if your stack uses a different prefix." >&2
        exit 1
    fi
done

# Prompt for the new password (silent, confirmed).
while true; do
    read -rsp "New password for ${ADMIN_USERNAME}: " PW1; echo
    if [ ${#PW1} -lt 8 ]; then
        echo "Too short (min 8 chars), try again." >&2
        continue
    fi
    read -rsp "Confirm: " PW2; echo
    if [ "$PW1" != "$PW2" ]; then
        echo "Mismatch, try again." >&2
        continue
    fi
    break
done

# Hash inside the api container (bcrypt is already installed there).
HASH=$(printf '%s' "$PW1" \
    | docker exec -i "$API_CONTAINER" python -c \
        'import sys, bcrypt; sys.stdout.write(bcrypt.hashpw(sys.stdin.read().encode(), bcrypt.gensalt(12)).decode())' \
    | tr -d '\r')
unset PW1 PW2

if [ -z "$HASH" ] || [[ "$HASH" != \$2* ]]; then
    echo "ERROR: bcrypt produced unexpected output: '${HASH:0:8}...'" >&2
    exit 1
fi

# Pipe the SQL through stdin so the shell never sees the '$' chars in
# the bcrypt hash. asyncpg uses $1/$2 placeholders so we use psql's
# variable interpolation instead.
docker exec -i "$PG_CONTAINER" psql -U postgres -d toto \
    -v ON_ERROR_STOP=1 \
    -v username="$ADMIN_USERNAME" \
    -v hash="$HASH" \
    <<'SQL'
UPDATE users
   SET password_hash = :'hash'
 WHERE username = :'username';
SQL

echo "OK — '${ADMIN_USERNAME}' password updated."
