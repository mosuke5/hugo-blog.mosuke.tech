[![deploy](https://github.com/mosuke5/hugo-blog.mosuke.tech/actions/workflows/deploy.yaml/badge.svg)](https://github.com/mosuke5/hugo-blog.mosuke.tech/actions/workflows/deploy.yaml)

# hugo file of blog.mosuke.tech
This is the blog.mosuke.tech's hugo repository.
When pushing this repository, execute wercker ci/cd processes and deploy to 'mosuke5-lab/mosuke5-lab.github.io'.

Following are ci/cd steps.

1. Build: execute `hugo` and check if build succeed or not.
2. Deploy: deploy to 'mosuke5-lab/mosuke5-lab.github.io' by using 'lvivier/step-gh-pages'.
3. After Deploy: clear cache in cloudflare and update gillsearch(search engine) database.

# How to use
```text
// set up. This site uses original theme.
$ git submodule update --init --recursive
$ hugo server

// update submodule
$ git submodule update --remote
```

```text
// resize image
// mogrify is included in ImageMagick package
$ mogrify -resize 700 ./static/image/xxxxx.png
```

# How to modify design
This blog site uses customized [purehugo(mosuke5/purehugo)](https://github.com/mosuke5/purehugo).
If modifying or changing design, commit to mosuke5/purehugo repo.
