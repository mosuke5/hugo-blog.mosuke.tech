#!/bin/bash
# Params $1: cloud_flare zone id
# Params $2: cloud_flare email
# Params $3: cloud_flare api key
# Params $4: git commit id

# Add array to uris to purge contents uri
uris=("/" "sitemap.xml" "index.xml")
files=`git diff --name-only $4`
for i in $files
do
    if [[ ${i} =~ ^(content/).*(.md) ]]; then
        # "content/xxxx/aiueo.md" => "/xxxx/aiueo/"
        uris+=("${i:7:-3}/")
    elif [[ ${i} =~ ^(static/) ]]; then
        # "static/image/aiueo.png" => "/image/aiueo.png"
        uris+=("${i:6}")
    fi
done

# Create arg param
files_param=""
base_url="https://blog.mosuke.tech"
for uri in "${uris[@]}"
do
    echo "${base_url}${uri}"
    files_param+="\"${base_url}${uri}\","
done
files_param="${files_param:0:-1}" #delete last comma

# Exec CloudFlare API to purge cache
sleep 10
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$1/purge_cache" \
     -H "X-Auth-Email: $2" \
     -H "X-Auth-Key: $3" \
     -H "Content-Type: application/json" \
     --data "{\"files\": [${files_param}]}"