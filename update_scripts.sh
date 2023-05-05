#!/usr/bin/env bash

# Setup script for updating to the latest script base from github.
# Script is assumed to run as the user running blocks, normally pixi-server, or blocks.


# Set the names of the directories to be archived as backups
dirs_to_archive=(
  "driver"
  "driver-archive"
  "user"
  "user-archive"
)
echo "Creating backups of the common user directories in case of overwriting customized files"

# Set the name of the zip file
zip_file="user_driver_backup_$(date +%Y-%m-%d_%H-%M-%S).zip"


# Archive each directory and add it to the zip file
for dir in "${dirs_to_archive[@]}"; do
  # Get the base name of the directory
  dir_name="$(basename "${dir}")"

  # Add the directory to the zip file
  zip -r -q "${zip_file}" "${dir_name}"
done

git  clone https://github.com/jerrymattias/blocks-script.git

echo "Merging new files into the script directory"
cp -r  blocks-script/* .

echo "Cleaning up"
rm -r -f blocks-script
echo "A backupfile was created from the old directory before the merge: "$zip_file
