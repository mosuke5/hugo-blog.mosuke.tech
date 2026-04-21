#!/bin/bash
set -e

REPO="mosuke5-lab/mosuke5-lab.github.io"
TOKEN="$1"
TIMEOUT=300
INTERVAL=15

elapsed=0
while [ $elapsed -lt $TIMEOUT ]; do
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))

  status=$(curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/$REPO/pages/builds/latest" \
    | jq -r '.status')

  echo "Pages build status: $status (${elapsed}s elapsed)"

  if [ "$status" = "built" ]; then
    echo "GitHub Pages deploy completed."
    exit 0
  elif [ "$status" = "errored" ]; then
    echo "GitHub Pages build errored!"
    exit 1
  fi
done

echo "Timeout waiting for GitHub Pages deploy."
exit 1
