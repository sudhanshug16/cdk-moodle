#!/bin/bash
source /root/project_env.sh && env > /tmp/cron_env && php -q -f /var/www/html/admin/cli/cron.php
