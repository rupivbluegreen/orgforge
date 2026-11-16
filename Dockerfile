# web/ imports ../src, ../fixtures directly.
FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY fixtures ./fixtures
COPY web ./web
WORKDIR /repo/web
RUN npm ci
RUN npm run build

FROM nginx:alpine
COPY --from=build /repo/web/dist /usr/share/nginx/html
EXPOSE 80
