#!/usr/bin/env bash

# Setup script for updating to the latest script base from github.
# Script is assumed to run as the user running blocks, normally pixi-server, or blocks.

echo "Creating backups of the common user directories in case of overwriting customized files"

# Set the name of the zip file
zip_file="user_driver_backup_$(date +%Y-%m-%d_%H-%M-%S).zip"
# Add the directories to the zip file
zip -r -q "${zip_file}" driver driver-archive user user-archive

echo "Getting the latest script-base from Pixilab"
git clone https://github.com/jerrymattias/blocks-script.git

echo "Merging new files into the script directory"
cp -r  blocks-script/* .

echo "Cleaning up"
rm -r -f blocks-script
echo "Done. "
echo "A backupfile was created from the old directory before the merge: ${zip_file}"


