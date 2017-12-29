#!/bin/sh
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$1/purge_cache" \
     -H "X-Auth-Email: $2" \
     -H "X-Auth-Key: $3" \
     -H "Content-Type: application/json" \
     --data '{"files": ["https://blog.mosuke.tech/"]}'
