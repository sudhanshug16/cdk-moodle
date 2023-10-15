
source .env

# Define commit hash
COMMIT_HASH=$(git rev-parse --short=7 HEAD)

# Write the new commit hash to .env
COMMIT_HASH_LINE="MOODLE_IMAGE_TAG=main-$COMMIT_HASH"
if grep -q "^MOODLE_IMAGE_TAG=" .env; then
  sed -i'' -e "/^MOODLE_IMAGE_TAG=/c\\
$COMMIT_HASH_LINE
" .env
else
  echo "$COMMIT_HASH_LINE" >>.env
fi

cd ./cdk && cdk deploy --all
