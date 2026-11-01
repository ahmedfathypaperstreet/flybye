#!/usr/bin/env bash
# ============================================================================
# FlyBye admin CLI — verification queue + reports moderation
# ============================================================================
# Usage:
#   export DATABASE_URL='postgresql://postgres.<ref>:<service-role-pw>@<host>/postgres'
#   ./scripts/admin.sh queue                    # list pending selfies
#   ./scripts/admin.sh preview  <user_uuid>     # download selfie to /tmp
#   ./scripts/admin.sh approve  <user_uuid>
#   ./scripts/admin.sh reject   <user_uuid> "reason text"
#   ./scripts/admin.sh reports      # list open reports
#   ./scripts/admin.sh ban     <user_uuid>
#   ./scripts/admin.sh unban   <user_uuid>
#   ./scripts/admin.sh resolve <report_uuid> resolved|dismissed
#
# Get DATABASE_URL from Supabase dashboard → Project Settings → Database →
# Connection string (URI). Use the **direct connection** with the service-role
# password, not the pooled one.
# ============================================================================

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set. See top of $0 for instructions." >&2
  exit 1
fi

cmd="${1:-help}"
shift || true

case "$cmd" in
  queue)
    psql "$DATABASE_URL" -P pager=off -c "
      select user_id, display_name, birthdate, selfie_url, created_at
      from pending_verifications
      limit 50;"
    echo
    echo "Preview a selfie with: ./scripts/admin.sh preview <user_uuid>"
    ;;

  preview)
    [ $# -ge 1 ] || { echo "usage: preview <user_uuid>" >&2; exit 1; }
    if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
      echo "Set SUPABASE_PROJECT_REF (e.g. pngjuliouszzhylkimsd) to use preview." >&2
      exit 1
    fi
    if ! command -v supabase >/dev/null; then
      echo "supabase CLI not installed. brew install supabase/tap/supabase" >&2
      exit 1
    fi
    path=$(psql "$DATABASE_URL" -t -A -c "select selfie_url from pending_verifications where user_id = '$1';")
    [ -n "$path" ] || { echo "no pending selfie for $1" >&2; exit 1; }
    out="/tmp/flybye_selfie_$1.jpg"
    supabase storage download "verifications/$path" "$out" --project-ref "$SUPABASE_PROJECT_REF"
    echo "Saved to $out"
    command -v open >/dev/null && open "$out"
    ;;

  approve)
    [ $# -ge 1 ] || { echo "usage: approve <user_uuid>" >&2; exit 1; }
    psql "$DATABASE_URL" -c "select approve_verification('$1');"
    echo "✓ approved $1"
    ;;

  reject)
    [ $# -ge 2 ] || { echo "usage: reject <user_uuid> <reason>" >&2; exit 1; }
    uid="$1"; shift
    reason="$*"
    psql "$DATABASE_URL" -c "select reject_verification('$uid', \$\$$reason\$\$);"
    echo "✗ rejected $uid"
    ;;

  reports)
    psql "$DATABASE_URL" -P pager=off -c "
      select id, created_at, reason, reporter_name, reported_name, reported_is_banned
      from open_reports
      limit 50;"
    ;;

  ban)
    [ $# -ge 1 ] || { echo "usage: ban <user_uuid>" >&2; exit 1; }
    psql "$DATABASE_URL" -c "select ban_user('$1');"
    echo "✓ banned $1"
    ;;

  unban)
    [ $# -ge 1 ] || { echo "usage: unban <user_uuid>" >&2; exit 1; }
    psql "$DATABASE_URL" -c "select unban_user('$1');"
    echo "✓ unbanned $1"
    ;;

  resolve)
    [ $# -ge 2 ] || { echo "usage: resolve <report_uuid> resolved|dismissed" >&2; exit 1; }
    psql "$DATABASE_URL" -c "select resolve_report('$1', '$2');"
    echo "✓ resolved $1 → $2"
    ;;

  help|*)
    sed -n '4,18p' "$0"
    ;;
esac
