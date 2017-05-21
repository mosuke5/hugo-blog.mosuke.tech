#!/bin/sh
hugo
cp -r ./public/* ../mosuke5-lab.github.io/
cd ../mosuke5-lab.github.io/
git add .
git commit -m "$1"
git push origin master
cd ../hugo-blog.mosuke.tech
