FROM php:8.2-apache

RUN apt-get update 

RUN apt-get install -y libsodium-dev libzip-dev libonig-dev libcurl4-openssl-dev libxml2-dev libpng-dev
RUN docker-php-ext-install sodium iconv mbstring curl soap ctype zip gd simplexml dom xml intl mysqli exif opcache
RUN pecl install redis && docker-php-ext-enable redis
# if this errors out, maybe a stable version of xmlrpc-beta is out
RUN pecl install xmlrpc-beta && docker-php-ext-enable xmlrpc

COPY setup.sh /setup.sh

COPY ./moodle /var/www/html/

RUN echo max_input_vars = 5000 >> /usr/local/etc/php/php.ini
EXPOSE 80
CMD chmod +x /setup.sh && /setup.sh
