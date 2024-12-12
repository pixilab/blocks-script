#!/usr/bin/env bash

# Script for updating drivers and script support files. It's designed to run from within the
# script directory found inside your Blocks root directory, so you must cd into that
# directory before running.
#
# Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
#

if [ ! -d "system_lib" ]; then
  echo "ABORTING. The current directory doesn't seem to be Blocks' script"
  echo "directory. Use the cd command to move into that directory first."
  exit
fi

echo "••• Stopping Blocks"
~/stop.sh

# Name of the zip file based on the current date
zip_file="backup_$(date +%Y-%m-%d_%H-%M-%S).zip"
echo "••• Backing up non-system script files to $zip_file"
zip -r -q "${zip_file}" driver driver-archive user user-archive lib lib-archive feed feed-archive files

echo "••• Downloading the update"
git clone -q https://github.com/pixilab/blocks-script.git

echo "••• Merging the update into the script directory"
cp -r  blocks-script/* .

#Cleaning up
rm -r -f blocks-script
echo "••• DONE."


