const pcap = require('pcap');
const fs = require('fs');
const mongo = require('mongodb');

const protocols = {
    arp: require('pcap/decode/arp'),
    tcp: require('pcap/decode/tcp'),
    udp: require('pcap/decode/udp'),
    dns: require('pcap/decode/dns'),
    icmp: require('pcap/decode/icmp'),
    ethernet: require('pcap/decode/ethernet_packet'),
    ipv4: require('pcap/decode/ipv4'),
    ipv6: require('pcap/decode/ipv6')
};

const ConnectionsHelper = requireFromRoot('src/import/pcap/ConnectionsHelper.js');
const DevicesHelper = requireFromRoot('src/import/pcap/DevicesHelper.js');

module.exports = function (databaseLayer) {
    return {
        runImport: function (filePath, onCompleteCallback) {

            var pcapSession = null;
            const filter = 'not broadcast and not multicast';
        
            try {
                pcapSession = pcap.createOfflineSession(filePath, filter);
            } catch (err) {
                onCompleteCallback(null);
                return;
            }
    
            var pcapImporter = new PcapImporter();
    
            pcapSession.on('complete', function () {
                var pcapData = pcapImporter.computeFinalResult();
                // (TO-DO) save pcap data as devices and connections into the database separately
                onCompleteCallback(pcapData);
                fs.unlink(filePath);
            });
    
            pcapSession.on('packet', function (rawPacket) {
                try {
                    pcapImporter.processPacket(pcap.decode.packet(rawPacket));
                } catch (err) {} //Node_Pcap rare crash with "Error: Don't know how to process TCP option X"
            });
        }
    }
}


class PcapImporter {
    constructor(){
        this.connectionsHelper = new ConnectionsHelper();
        this._ipv4ToMac = {}; //Lookup table mapping ipv4 to mac addresses, determined through ARP packets
    }

    _createDevicesFromConnections(connectionsArray) {
        var devicesHelper = new DevicesHelper();

        for (var i = 0; i < connectionsArray.length; ++i) {
            var connection = connectionsArray[i];
            
            var sourceDevice = {
                ipv4Address: connection.source,
                macAddress: (connection.source in this._ipv4ToMac === true) ? this._ipv4ToMac[connection.source] : null
            };
            devicesHelper.createDevice(sourceDevice);

            var destinationDevice = {
                ipv4Address: connection.destination,
                macAddress: (connection.destination in this._ipv4ToMac === true) ? this._ipv4ToMac[connection.destination] : null
            }
            devicesHelper.createDevice(destinationDevice);
        }

        return devicesHelper.finalize().devices;
    }

    _pullAddressesFromInternetLayer(internetLayer) {
        var s = internetLayer.saddr.addr;
        var d = internetLayer.daddr.addr;

        return {
            s: s[0] + '.' + s[1] + '.' + s[2] + '.' + s[3],
            d: d[0] + '.' + d[1] + '.' + d[2] + '.' + d[3]
        };
    }
    
    _processUdpPacket(timestamp, internetLayer, transportLayer) {
        var addresses = this._pullAddressesFromInternetLayer(internetLayer);
        this.connectionsHelper.createConnection({
            source: addresses.s,
            destination: addresses.d,
            sourcePort: transportLayer.sport,
            destinationPort: transportLayer.dport,
            protocol: 'UDP',
            timestamp: timestamp
        });
    }

    _processTcpPacket(timestamp, internetLayer, transportLayer) {
        var addresses = this._pullAddressesFromInternetLayer(internetLayer);
        this.connectionsHelper.createConnection({
            source: addresses.s,
            destination: addresses.d,
            sourcePort: transportLayer.sport,
            destinationPort: transportLayer.dport,
            protocol: 'TCP',
            timestamp: timestamp
        });
    }

    _processArpPacket(internetLayer) {
        var createMapping = function (ipv4, mac) {
            var macAsString = mac[0] + ':' + mac[1] + ':' + mac[2] + ':' + mac[3] + ':' + mac[4] + ':' + mac[5];
            var ipv4AsString = ipv4[0] + '.' + ipv4[1] + '.' + ipv4[2] + '.' + ipv4[3];

            this._ipv4ToMac[ipv4AsString] = macAsString;
        }.bind(this);

        createMapping(internetLayer.sender_pa.addr, internetLayer.sender_ha.addr);
        createMapping(internetLayer.target_pa.addr, internetLayer.target_ha.addr);
    }

    _processIcmpPacket(timestamp, internetLayer, transportLayer) {
        var addresses = this._pullAddressesFromInternetLayer(internetLayer);
        this.connectionsHelper.createConnection({
            source: addresses.s,
            destination: addresses.d,
            sourcePort: null,
            destinationPort: null,
            protocol: 'ICMPv4',
            timestamp: timestamp
        });
    }

    _processDnsPacket(timestamp, internetLayer, transportLayer) {
        var addresses = this._pullAddressesFromInternetLayer(internetLayer);
        this.connectionsHelper.createConnection({
            source: addresses.s,
            destination: addresses.d,
            sourcePort: transportLayer.sport,
            destinationPort: transportLayer.dport,
            protocol: 'DNS',
            timestamp: timestamp
        });
    }

    processPacket(packet) {
        var timestamp = packet.pcap_header.tv_sec * 1000;
        var linkLayer = packet.payload;

        if (linkLayer instanceof protocols.ethernet) {
            var internetLayer = linkLayer.payload;

            if (internetLayer instanceof protocols.ipv4) {
                var transportLayer = internetLayer.payload;

                if (transportLayer instanceof protocols.tcp) {
                    if ((transportLayer.sport === 53) || (transportLayer.dport === 53)) {
                        this._processDnsPacket(timestamp, internetLayer, transportLayer);
                    } else {
                        this._processTcpPacket(timestamp, internetLayer, transportLayer);
                    }
                } else if (transportLayer instanceof protocols.udp) {
                    if ((transportLayer.sport === 53) || (transportLayer.dport === 53)) {
                        this._processDnsPacket(timestamp, internetLayer, transportLayer);
                    } else {
                        this._processUdpPacket(timestamp, internetLayer, transportLayer);
                    }
                } else if (transportLayer instanceof protocols.icmp) {
                    this._processIcmpPacket(timestamp, internetLayer, transportLayer);
                }
            } else if (internetLayer instanceof protocols.arp) {
                this._processArpPacket(internetLayer);
            }
        }
    }

    computeFinalResult() {
        var connectionsAsArray = [];

        var connections = this.connectionsHelper.connections();

        for (var key in connections) {
            connectionsAsArray.push(connections[key]);
        }
        
        return {
            devices: this._createDevicesFromConnections(connectionsAsArray),
            connections: connections
        };
    }
}