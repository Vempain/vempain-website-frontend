FROM nginx:alpine

# The website backend (host:port) that requests of link-preview crawlers are proxied to (nginx.conf.template); the compose service name
# by default. NGINX_ENVSUBST_FILTER limits the template substitution to these placeholders, so nginx's own $variables stay untouched.
ENV VEMPAIN_BACKEND_ADDRESS=vempain-site-backend:8000 \
    NGINX_ENVSUBST_FILTER=^VEMPAIN_

COPY ./dist /usr/share/nginx/html

COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
