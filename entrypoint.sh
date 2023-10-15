#!/bin/sh

chmod +x /setup.sh && /setup.sh
exec docker-php-entrypoint apache2-foreground "$@"
