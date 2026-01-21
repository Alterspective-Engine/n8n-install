FROM pandoc/core:3.8.3

RUN apk add --no-cache nodejs

WORKDIR /app
COPY server.mjs ./server.mjs

ENV PORT=3030
EXPOSE 3030

# pandoc/core sets ENTRYPOINT to `pandoc`, so we must override it.
ENTRYPOINT ["node", "server.mjs"]
