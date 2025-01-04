FROM nginx:1.27.2-alpine

COPY ./myconfig.conf /etc/nginx/conf.d/myconfig.conf
RUN rm /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# docker build -t nginx:v1 ./nginx

