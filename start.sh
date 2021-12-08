#!/bin/bash

KALI_DIRECTORY="/home/kali"
HAK_DIRECTORY="$KALI_DIRECTORY/HakEngine"

cd $KALI_DIRECTORY/scripts/Automap
git pull

cd $KALI_DIRECTORY/scripts/Webmap
git pull

cd $HAK_DIRECTORY/HakEngine-setup
git pull
cp $HAK_DIRECTORY/.env $HAK_DIRECTORY/HakEngine-setup/
yarn

cd $KALI_DIRECTORY/scans
# node $HAK_DIRECTORY/HakEngine-setup/index.js