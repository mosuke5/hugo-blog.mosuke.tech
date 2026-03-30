FROM mcr.microsoft.com/devcontainers/base:bookworm

ARG HUGO_VERSION=0.152.2
ARG NODE_MAJOR=24

RUN apt-get update && apt-get install -y --no-install-recommends \
    golang \
    imagemagick \
    optipng \
    libjpeg-turbo-progs \
    ca-certificates \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-${ARCH}.deb" \
      -o /tmp/hugo.deb && \
    dpkg -i /tmp/hugo.deb && \
    rm /tmp/hugo.deb

RUN hugo version && node --version && npm --version
