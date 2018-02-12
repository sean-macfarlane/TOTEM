#!/bin/bash

# Checks mongodb process and initializes 
# it in another terminal window if not running already.

if pgrep -x mongod > /dev/null
then
	echo "Database is ready, starting TOTEM.."
else
	echo "Initializing database.."
	sudo -H gnome-terminal -x sh -c " mongod; bash"

	i="0"

	while ! pgrep -x mongod > /dev/null && [ $i -lt 4 ]
	do
		echo "Checking database connection.."
		sleep 1
		
		i=$[$i+1]
		
		if [ $i == 3 ]
		then
			echo "Database connection failed."
			exit 1
		fi
	done

	sleep 2
fi

# Starts the node application
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd "${DIR}"

node Server.js