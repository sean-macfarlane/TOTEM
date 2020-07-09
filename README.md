# TOTEM: Risk Assessment Tool

## Prerequisites

- [Node.js and npm](nodejs.org) 
- [MongoDB](https://www.mongodb.org/)

## Set up environment:
		
	Install Dependencies 
		`npm install`	

    Have MongoDB running
        `mongod`

## Development Environment:

### Run :	
    Run the Server using Node
	    `node Server.js`

    TOTEM will be accessible via the URL 
        `localhost:8080`

## Production Environment:

### Build :

    Run build.sh inside the build directory of the repo. Enter an empty output directory when prompted to place the generated .zip file in.
        `cd build`
        `sudo bash build.sh`

    Copy the .zip file from the output directory you entered in the previous step to the workstation or server you want to run on.

    Unzip the .zip file
        `unzip TOTEM.zip`

    Use new created directory TOTEM
        `cd TOTEM`

    Run install.sh file
        `sudo bash install.sh`

### Run :

    Navigate to the directory TOTEM/Totem/ and run the docker container
        `cd Totem`
        `sudo bash Run.sh`

    To stop the container run the Stop.sh script
        `sudo bash Stop.sh`
