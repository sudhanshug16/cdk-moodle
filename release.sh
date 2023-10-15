source .env

# Define commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)

# Build the Docker image
SCRIPT_DIR=$(dirname "$0")
docker build -t $MOODLE_IMAGE_NAME:$COMMIT_HASH "." 

# Tag the Docker image
docker tag $MOODLE_IMAGE_NAME:$COMMIT_HASH $MOODLE_IMAGE_HOST/$MOODLE_IMAGE_NAME:$COMMIT_HASH

# Push the Docker image
docker push $MOODLE_IMAGE_HOST/$MOODLE_IMAGE_NAME:$COMMIT_HASH

# Write the new commit hash to .env
COMMIT_HASH_LINE="MOODLE_IMAGE_TAG=$COMMIT_HASH"
if grep -q "^MOODLE_IMAGE_TAG=" .env; then
    sed -i'' -e "/^MOODLE_IMAGE_TAG=/c\\
$COMMIT_HASH_LINE
" .env
else 
    echo "$COMMIT_HASH_LINE" >> .env
fi
