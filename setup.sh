# Ensure directory exists
[ -d "/moodle-efs/moodledata" ] || mkdir -p "/moodle-efs/moodledata"

# Configure permissions and ownership
chown www-data:root /moodle-efs/moodledata
chmod 775 -R /moodle-efs/moodledata
find /moodle-efs/moodledata -type f -exec chmod 664 {} \;

