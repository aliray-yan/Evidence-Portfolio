FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# NEXT_PUBLIC_GATEWAY_URL gets inlined into the client JS bundle at BUILD
# time, not read at container runtime — because the fetch() calls run in
# the user's browser, not inside this container. It must therefore be a
# URL the browser can reach (the host's exposed port), not the Docker
# network's internal "gateway:8080" hostname, which only resolves between
# containers. Default assumes docker compose running on the same machine
# the browser is on — see README.md.
ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["npm", "start"]
