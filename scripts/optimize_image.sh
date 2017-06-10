#!/bin/sh
find ./static/image/ -name "*.png" | xargs optipng -o5
find ./static/image/ -name "*.jpg" -type f -exec jpegtran -copy none -optimize -outfile {} {} \;
