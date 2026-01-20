FROM pandoc/core:3.8.3

RUN apk add --no-cache nodejs

WORKDIR /app
COPY server.mjs ./server.mjs

ENV PORT=3030
EXPOSE 3030

CMD ["node", "server.mjs"]
