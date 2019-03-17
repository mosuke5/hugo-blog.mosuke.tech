#!/bin/bash

set -e
files=`git diff --name-only HEAD^`
for i in $files
do
    if [[ ${i} =~ ^(static/).*(.png) ]]; then
        optipng -o7 ${i}
    elif [[ ${i} =~ ^(static/).*(.jpg|.jpeg) ]]; then
        jpegtran -copy none -optimize -outfile ${i} ${i}
    fi
done
