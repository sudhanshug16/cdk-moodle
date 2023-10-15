#!/bin/bash

# Check if bucket name is passed as an argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 bucket_name"
    exit 1
fi

bucket_name="$1"

# Delete all objects
aws s3 rm s3://$bucket_name --recursive --include "*"

# Delete all object versions and delete markers
aws s3api delete-objects --bucket $bucket_name --delete "$(aws s3api list-object-versions --bucket $bucket_name --output=json --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"
aws s3api delete-objects --bucket $bucket_name --delete "$(aws s3api list-object-versions --bucket $bucket_name --output=json --query='{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"

# Delete the bucket
aws s3 rb s3://$bucket_name --force
