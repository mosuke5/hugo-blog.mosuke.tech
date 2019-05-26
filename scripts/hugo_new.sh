#/bin/bash
if [ -z $1 ]; then
    echo "No an argument. Please input file name."
    exit 1
fi
hugo new `date +/entry/%Y/%m/%d/$1.md` 