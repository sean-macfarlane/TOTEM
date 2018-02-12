FROM node:latest

RUN mkdir -p /usr/src/app
RUN mkdir -p /data/db

WORKDIR /usr/src/app

COPY package.json /usr/src/app

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list 
RUN apt-get update
RUN apt-get -y install mongodb-org
RUN apt-get -y install libpcap-dev git

RUN npm install
RUN npm install https://github.com/mranney/node_pcap.git

COPY . /usr/src/app

EXPOSE 8080

CMD bash -C 'run_docker.sh';'bash'
