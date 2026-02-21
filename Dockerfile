FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY . .

RUN apk add --no-cache openjdk17

RUN npm install -g @angular/cli
RUN npm ci
RUN npm run build --configuration=production

FROM nginx:alpine
COPY --from=builder /app/dist/study-questions/browser/. /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
