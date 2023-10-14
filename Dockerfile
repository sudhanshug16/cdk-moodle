FROM php:8.2-apache

COPY ./moodle /var/www/html/

RUN apt-get update 

RUN apt-get install -y libsodium-dev libzip-dev libonig-dev
RUN docker-php-ext-install sodium
RUN docker-php-ext-install iconv
RUN docker-php-ext-install mbstring
RUN apt-get install -y libcurl4-openssl-dev
RUN docker-php-ext-install curl
RUN apt-get install -y libxml2-dev
# if this errors out, maybe a stable version of xmlrpc-beta is out
RUN pecl install xmlrpc-beta
RUN echo "extension=xmlrpc.so" >> /usr/local/etc/php/php.ini
RUN docker-php-ext-install soap
RUN docker-php-ext-install ctype
RUN docker-php-ext-install zip
RUN apt-get install -y libpng-dev
RUN docker-php-ext-install gd
RUN docker-php-ext-install simplexml
RUN docker-php-ext-install dom
RUN docker-php-ext-install xml
RUN docker-php-ext-install intl
RUN docker-php-ext-install mysqli

RUN mkdir /mnt/moodledata
RUN chmod 777 /mnt/moodledata

RUN echo max_input_vars = 5000 >> /usr/local/etc/php/php.ini
EXPOSE 80
