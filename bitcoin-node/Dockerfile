FROM alpine:latest

RUN apk update && rm -rf /var/cache/apk/*
RUN apk add --no-cache bitcoin

COPY bitcoin.conf /etc/bitcoin.conf
COPY docker-entrypoint.sh .
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT [ "sh", "./docker-entrypoint.sh" ]
