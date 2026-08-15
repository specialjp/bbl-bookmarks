#!/usr/bin/env bash
# Mechanical transcript redaction. Usage: ./redact.sh <in.jsonl> <out.jsonl>
# The local username is taken from the environment so this script never
# hardcodes the very string it exists to remove.
set -euo pipefail

IN="$1"; OUT="$2"
LOCAL_USER="${LOCAL_USER:-$(whoami)}"
# Prefix form catches partial fragments (e.g. an email local-part that is a
# prefix of the account name) without hardcoding either string.
USER_PREFIX="${LOCAL_USER:0:8}"

sed -E \
  -e "s/${LOCAL_USER}/REDACTED_USER/g" \
  -e "s/${USER_PREFIX}[A-Za-z0-9]*/REDACTED_USER/g" \
  -e 's/dev-yg\.us\.auth0\.com/AUTH0_DOMAIN_REDACTED/g' \
  -e 's/dev-yg[^ "]*auth0[^ "]*com/AUTH0_DOMAIN_REDACTED/g' \
  -e 's/dev-yg/AUTH0_TENANT_REDACTED/g' \
  -e 's/H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA/AUTH0_CLIENT_ID_REDACTED/g' \
  -e 's/H9F6QG5[A-Za-z0-9]*/AUTH0_CLIENT_ID_REDACTED/g' \
  -e 's#https://bbl-candidate-test-api#AUTH0_AUDIENCE_REDACTED#g' \
  -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/JWT_REDACTED/g' \
  -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/EMAIL_REDACTED/g' \
  -e 's#/Users/[A-Za-z0-9._-]+#/Users/REDACTED#g' \
  -e 's/-Users-[A-Za-z0-9_-]+-Desktop/-Users-REDACTED-Desktop/g' \
  "$IN" > "$OUT"

echo "redacted: $IN -> $OUT"
