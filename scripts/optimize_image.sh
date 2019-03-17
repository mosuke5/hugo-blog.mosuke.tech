#!/bin/bash
#find ./static/image/ -name "*.png" | xargs optipng -o7
#find ./static/image/ -name "*.jpg" -type f -exec jpegtran -copy none -optimize -outfile {} {} \;

files=`git diff --name-only HEAD^`
for i in $files
do
    if [[ ${i} =~ ^(static/).*(.png) ]]; then
        optiping -o7 ${i}
    elif [[ ${i} =~ ^(static/).*(.jpg|.jpeg) ]]; then
        jpegtran -copy none -optimize -outfile ${i} ${i}
    fi
done