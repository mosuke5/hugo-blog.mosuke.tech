#!/bin/bash

lang="ja"
while getopts "l:" opt; do
    case $opt in
        l) lang="$OPTARG" ;;
        *) echo "Usage: $0 [-l lang] <filename>"; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

if [ "$lang" != "ja" ] && [ "$lang" != "en" ]; then
    echo "Error: Unsupported language '$lang'. Use 'ja' or 'en'."
    exit 1
fi

if [ -z "$1" ]; then
    echo "No argument. Please input file name."
    echo "Usage: $0 [-l lang] <filename>"
    echo "  -l lang  Language code (default: ja). e.g. ja, en"
    exit 1
fi

# contentDir が content/ja/ 等のとき、先頭に lang を付けると content/ja/ja/entry のように二重になるため付けない
path="$(date +entry/%Y/%m/%d/$1.md)"
if [ "$lang" = "en" ]; then
    hugo new --contentDir content/en/ "$path"
else
    hugo new "$path"
fi
