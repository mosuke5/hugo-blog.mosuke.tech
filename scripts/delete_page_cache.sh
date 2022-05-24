#!/bin/bash
set -e

# Params $1: cloud_flare zone id
# Params $2: cloud_flare email
# Params $3: cloud_flare api key

# functions
function purge_specific_cache () {
    sleep 10
    result=`curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$1/purge_cache" \
         -H "X-Auth-Email: $2" \
         -H "X-Auth-Key: $3" \
         -H "Content-Type: application/json" \
         --data "{\"files\": [$4]}" | jq '.success'`

    if [ $result = "false" ]; then
      exit 1
    fi
}

function purge_every_cache () {
    sleep 10
    curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$1/purge_cache" \
         -H "X-Auth-Email: $2" \
         -H "X-Auth-Key: $3" \
         -H "Content-Type: application/json" \
         --data "{\"purge_everything\": true}"
}

## Add array to uris to purge contents uri
# default uris
uris=("/" "/sitemap.xml" "/index.xml")

# changed files
files=`git diff --name-only HEAD^`

for i in $files
do
    if [[ ${i} =~ ^(content/).*(.md) ]]; then
        # convert: "content/xxxx/aiueo.md" => "/xxxx/aiueo/"
        uris+=("${i:7:-3}/")
    elif [[ ${i} =~ ^(static/) ]]; then
        # convert: "static/image/aiueo.png" => "/image/aiueo.png"
        uris+=("${i:6}")
    elif [[ ${i} =~ ^(layouts/|wercker.yml) ]]; then
        # if layout files change
        echo "purge every cache because layout files might change."
        purge_every_cache $1 $2 $3
        exit 0
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
purge_specific_cache $1 $2 $3 $files_param
