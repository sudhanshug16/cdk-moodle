# Variables
dir="/mnt/moodledata"
owner_user="www-data"
owner_group="root"
dir_mode="775"
file_mode="664"

# Ensure directory exists
[ -d "${dir}" ] || mkdir -p "${dir}"

# Configure permissions and ownership
chown ${owner_user}:${owner_group} ${dir}
chmod ${dir_mode} ${dir}
find ${dir} -type f -exec chmod ${file_mode} {} \;
