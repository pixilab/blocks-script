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

# Set the name of the zip file
zip_file="user_driver_backup_$(date +%Y-%m-%d_%H-%M-%S).zip"


# Archive each directory and add it to the zip file
for dir in "${dirs_to_archive[@]}"; do
  # Get the base name of the directory
  dir_name="$(basename "${dir}")"

  # Add the directory to the zip file
  zip -r "${zip_file}" "${dir_name}"
done

git clone https://github.com/jerrymattias/blocks-script.git

cp -r blocks-script/* .

rm -r -f blocks-script

