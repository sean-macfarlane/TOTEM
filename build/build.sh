#!/bin/bash

current_directory="$( cd "$( dirname "$0" )" && pwd )"
echo "Current Directory:" $current_directory
echo ""

echo -n "Enter an output directory: "
read output_directory

while [ ! -r "$output_directory" ] 
do
    echo -e "Error: '$output_directory' is not accessible. Try again...\n"

echo -n "Enter an output directory: "
    read output_directory
done

mkdir "$output_directory""/TOTEM"
cp "install.sh" "$output_directory""/TOTEM/install.sh"

#Jump to repo directory from the build folder.
cd ..

echo "Docker build running..."

docker build -t totem --no-cache=true .

echo "Docker exporting image..."

docker save totem > "$output_directory""/TOTEM/totem.tar"

echo "Compressing build..."

cd "$output_directory"

zip -r "TOTEM.zip" "TOTEM"

rm -r "$output_directory""/TOTEM"

echo "Build successfully complete!"