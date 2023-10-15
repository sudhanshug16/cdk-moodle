# Variables
dir="/moodledata"
owner_user="www-data"
owner_group="root"
dir_mode="775"
file_mode="664"

# Ensure directory exists
[ -d "${dir}" ] || mkdir -p "${dir}"

# Configure permissions and ownership
if [[ "$(id -u)" = "0" ]]; then
    find -L "$dir" -printf ""
    if [[ -n $dir_mode ]]; then
        find -L "$dir" -type d ! -perm "$dir_mode" -print0 | xargs -r -0 chmod "$dir_mode"
    fi
    if [[ -n $file_mode ]]; then
        find -L "$dir" -type f ! -perm "$file_mode" -print0 | xargs -r -0 chmod "$file_mode"
    fi
    if [[ -n $owner_user ]] && [[ -n $owner_group ]]; then
        find -L "$dir" -print0 | xargs -r -0 chown "${owner_user}:${owner_group}"
    elif [[ -n $owner_user ]] && [[ -z $owner_group ]]; then
        find -L "$dir" -print0 | xargs -r -0 chown "${owner_user}"
    elif [[ -z $owner_user ]] && [[ -n $owner_group ]]; then
        find -L "$dir" -print0 | xargs -r -0 chgrp "${owner_group}"
    fi
else
    echo "$dir does not exist" >&2
fi
