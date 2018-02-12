#!/bin/bash
 
nohup mongod &
 
while [ -z $(pidof mongod) ]; do
    sleep 1
done

sleep 2
 
node Server.js