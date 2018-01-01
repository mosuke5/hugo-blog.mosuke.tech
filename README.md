[![wercker status](https://app.wercker.com/status/31dc441e8c206db6d149ddb22f0efa24/s/master "wercker status")](https://app.wercker.com/project/byKey/31dc441e8c206db6d149ddb22f0efa24)

# hugo file of blog.mosuke.tech
This is the blog.mosuke.tech's hugo repository.
When pushing this repository, execute wercker ci/cd processes and deploy to 'mosuke5-lab/mosuke5-lab.github.io'.

Following are ci/cd steps.

1. Build: execute `hugo` and check if build succeed or not.
2. Deploy: deploy to 'mosuke5-lab/mosuke5-lab.github.io' by using 'lvivier/step-gh-pages'.
3. After Deploy: clear cache in cloudflare.

# how to use
```
// resize image
$ mogrify -resize 600 ./static/image/xxxxx.png
```
