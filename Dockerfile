FROM php:8.2-apache

RUN apt-get update 

RUN apt-get install -y libsodium-dev libzip-dev libonig-dev libcurl4-openssl-dev libxml2-dev libpng-dev cron libjpeg-dev libwebp-dev
RUN docker-php-ext-install sodium iconv mbstring curl soap ctype zip simplexml dom xml intl mysqli exif opcache
RUN pecl install redis && docker-php-ext-enable redis
# if this errors out, maybe a stable version of xmlrpc-beta is out
RUN pecl install xmlrpc-beta && docker-php-ext-enable xmlrpc
RUN docker-php-ext-configure gd --enable-gd --with-webp --with-jpeg

COPY setup.sh /setup.sh
RUN chmod +x /setup.sh && /setup.sh

COPY ./moodle /var/www/html/

RUN echo max_input_vars = 5000 >> /usr/local/etc/php/php.ini
EXPOSE 80

COPY cron.sh /cron.sh
RUN chmod +x /cron.sh
RUN echo "*/1 * * * * root bash /cron.sh" >> /etc/crontab

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
