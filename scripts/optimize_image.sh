#!/bin/sh
find ./static/image/ -name "*.png" | xargs optipng -o7
find ./static/image/ -name "*.jpg" -type f -exec jpegtran -copy none -optimize -outfile {} {} \;
