#!/bin/sh

service cron start
chmod +x /setup.sh && /setup.sh
exec docker-php-entrypoint apache2-foreground "$@"
