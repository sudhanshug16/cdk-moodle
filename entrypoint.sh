#!/bin/sh

# Export environment variables to a file
env | while IFS='=' read -r name value ; do
    printf 'export %s="%s"\n' "$name" "$value"
done > /root/project_env.sh

# Start the cron service
service cron start

# Run the setup script
chmod +x /setup.sh && /setup.sh

# Execute the main command
exec docker-php-entrypoint apache2-foreground "$@"
