#!/bin/bash
# Params $1: cloud_flare zone id
# Params $2: cloud_flare email
# Params $3: cloud_flare api key
# Params $4: git commit id

# Add array to uris to purge contents uri
uris=("/")
files=`git diff --name-only HEAD^`
for i in $files
do
    if [[ ${i} =~ ^(content/).*(.md) ]]; then
        # "content/xxxx/aiueo.md" => "/xxxx/aiueo/"
        uris+=("${i:7:-3}/")
    fi
done

# Create arg param
base_url="https://blog.mosuke.tech"
for uri in "${uris[@]}"
do
    response=`curl -LI "${base_url}${uri}" -o /dev/null -w '%{http_code}\n' -s`
    if [ $response -ne 200 ]; then
        echo "${uri}: error(http status is ${response})"
        exit 1
    fi
done