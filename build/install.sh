#!/bin/bash

if [ ! -e totem.tar ]; then
    echo 'Installation failed: totem.tar not found'
    exit 0
fi


echo -e "Installing TOTEM...\n"


if [ -e Totem ]; then
    read -r -p "Would you like to clear the database? Data will be kept if you enter N  [y/N] " response
    case $response in
        [yY][eE][sS]|[yY]) 
            rm -r Totem
	    mkdir Totem
            mkdir Totem/image
	    mkdir Totem/data
            ;;
        *)
	    rm -r Totem/image
            mkdir Totem/image
            ;;
    esac
else
	mkdir Totem
        mkdir Totem/image
	mkdir Totem/data
fi


docker load < totem.tar

mv totem.tar Totem/image/totem.tar

echo -e "Moving files around...\n"

echo '#!/bin/bash

CURRENT_INSTANCE=$(docker ps -q --filter ancestor=totem)

if [ "$CURRENT_INSTANCE" != "" ]; then
    echo "Stopping an existing TOTEM instance..."
	docker stop "$CURRENT_INSTANCE"
	echo "Previous instance stopped"
fi

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

DATA_PATH="$CURRENT_DIR""/data"

docker run --restart unless-stopped -p 51220:8080 -v "$DATA_PATH":/data/db -d totem

echo "TOTEM running at http://localhost:51220/"' >Totem/Run.sh

chmod +x Totem/Run.sh



echo '#!/bin/bash

echo Stopping...

CURRENT_INSTANCE=$(docker ps -q --filter ancestor=totem)

docker stop "$CURRENT_INSTANCE"

echo TOTEM stopped ' >Totem/Stop.sh

chmod +x Totem/Stop.sh


rm install.sh

echo -e "\nInstallation Successfully Complete!"
