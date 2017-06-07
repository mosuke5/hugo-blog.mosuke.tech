#!/bin/sh
find ./static/image/ -name "*.png" | xargs optipng -o5
