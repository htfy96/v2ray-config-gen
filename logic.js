requirejs(['jquery', 'vue', 'vue-clipboard', 'domReady'], function ($, Vue, vueClipboard) {
    console.log('initing...');
    Vue.use(vueClipboard);

    function uuid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function makeShadowsocks(service) {
        var result = [];
        result.push({
            "protocol": "shadowsocks",
            "port": service.port,
            "settings": {
                "method": service.method,
                "password": service.password,
                "udp": service.udp,
                "level": parseInt(service.level)
            }
        });
        return result;
    }

    function makeVMess(service) {
        var results = [];
        service.ports.forEach(function (elem) {
            results = results.concat(makeVMessSinglePort(elem.number, service.users, elem.dynamic, elem.dynrange, elem.iskcp));
        });
        return results;
    }

    // returns [Inbound]
    function makeVMessSinglePort(port, clients, isDynamic, dynRange, isKCP) {
        var result = [];

        var clientsConfig = clients.map(function (client) {
            return {
                "id": client.uuid,
                "level": 1,
                "alterId": parseInt(client.alterid)
            };
        });

        var baseInbound = {
            "port": port,
            "protocol": "vmess",
            "settings": {
                "clients": clientsConfig
            }
        };

        if (isKCP) {
            baseInbound["streamSettings"] = {
                "network": "kcp"
            };
        }

        if (isDynamic) {
            var extInbound = {
                "protocol": "vmess",
                "port": dynRange,
                "tag": "vmess-detour-" + parseInt(Math.random() * 1000000),
                "settings": {},
                "allocate": {
                    "strategy": "random",
                    "concurrency": 5,
                    "refresh": 5
                }
            };
            baseInbound["detour"] = {
                "to": extInbound.tag
            };
            if (isKCP)
                extInbound["streamSettings"] = {
                    "network": "kcp"
                };

            result.push(extInbound);
        }
        result.push(baseInbound);
        return result;
    }

    function configTransport(item, service) {
        if (service.transport && service.transport.tls) {
            item.streamSettings = item.streamSettings || {}
            item.streamSettings.security = 'tls'
            item.streamSettings.tlsSettings = {
                "serverName": service.transport.tlsServerName,
                "certificates": [{
                    "certificateFile": service.transport.tlsCertificateFile,
                    "keyFile": service.transport.tlsKeyFile
                }]
            }
        }
    }

    function makeService(service) {
        var result = null
        if (service.type === 'vmess')
            result = makeVMess(service)
        if (service.type === 'shadowsocks')
            result = makeShadowsocks(service)
        result.forEach(function(item) {
            configTransport(item, service)
        })
        return result
    }

    services = new Vue({
        el: '#app',
        template: '#template',
        data: {
            clientservice: 0,
            clientuser: undefined,
            clientMuxEnabled: false,
            clientserverport: null,
            services: [{
                type: 'vmess',
                users: [{
                    uuid: uuid(),
                    alterid: 100
                }],
                ports: [{
                    number: 12345,
                    dynamic: true,
                    dynrange: "10000-10010",
                    iskcp: true
                }],
                transport: {
                    tls: false,
                    tlsServerName: '',
                    tlsCertificateFile: '',
                    tlsKeyFile: ''
                }
            }]
        },
        methods: {
            addPort: function (ports) {
                ports.push({});
            },
            addUser: function (users) {
                users.push({
                    uuid: uuid()
                });
            },
            removePort: function (ports, idx) {
                ports.splice(idx, 1);
            },
            removeUser: function (users, idx) {
                users.splice(idx, 1);
            },
            addService: function (services) {
                services.push({
                    type: 'vmess',
                    users: [],
                    ports: [],
                    transport: {
                        tls: false
                    }
                });
            },
            removeService: function (services, idx) {
                services.splice(idx, 1);
            },
            genUserId: function (users, idx) {
                users[idx].uuid = uuid();
            }
        },
        computed: {
            serverjson: function () {
                var sj = {
                    "log": {
                        "access": "/var/log/v2ray/access.log",
                        "error": "/var/log/v2ray/error.log",
                        "loglevel": "warning"
                    },
                    "inbound": {},
                    "outbound": {
                        "protocol": "freedom",
                        "settings": {}
                    },
                    "inboundDetour": [],
                    "outboundDetour": [{
                        "protocol": "blackhole",
                        "settings": {},
                        "tag": "blocked"
                    }],
                    "routing": {
                        "strategy": "rules",
                        "settings": {
                            "rules": [{
                                "type": "field",
                                "ip": [
                                    "0.0.0.0/8",
                                    "10.0.0.0/8",
                                    "100.64.0.0/10",
                                    "127.0.0.0/8",
                                    "169.254.0.0/16",
                                    "172.16.0.0/12",
                                    "192.0.0.0/24",
                                    "192.0.2.0/24",
                                    "192.168.0.0/16",
                                    "198.18.0.0/15",
                                    "198.51.100.0/24",
                                    "203.0.113.0/24",
                                    "::1/128",
                                    "fc00::/7",
                                    "fe80::/10"
                                ],
                                "outboundTag": "blocked"
                            }]
                        }
                    }
                };

                var findResult = this.services.find(function (service) {
                    return service == undefined || service.ports == undefined || service.type == undefined || service.users == undefined;
                });
                if (findResult != undefined) {
                    return {
                        "err": "信息填写不完全"
                    };
                }

                inbounds = [];
                this.services.forEach(function (service) {
                    inbounds = inbounds.concat(makeService(service))
                });
                sj["inbound"] = inbounds;
                mainInbound = inbounds.find(function (elem) {
                    return !elem.tag;
                });
                inbounds.splice(inbounds.indexOf(mainInbound), 1);
                sj["inbound"] = mainInbound;
                sj["inboundDetour"] = inbounds;

                return sj;
            },
            clientusers: function () {
                var service = this.services[this.clientservice];
                return service.users.map(function (elem, idx) {
                    return {
                        value: idx,
                        name: elem.uuid
                    };
                });
            },
            clientserverports: function () {
                var service = this.services[this.clientservice];
                return service.ports.map(function (elem, idx) {
                    return {
                        value: idx,
                        name: elem.number
                    };
                });
            },
            clientjson: function () {
                if (this.clientserverport == undefined || this.clientuser == undefined || this.clientMuxEnabled === undefined) return {
                    "err": "信息不全"
                };
                var base = {
                    "log": {
                        "loglevel": "warning"
                    },
                    "inbound": {
                        "listen": "127.0.0.1",
                        "port": this.clientport,
                        "protocol": "socks",
                        "settings": {
                            "auth": "noauth",
                            "udp": true,
                            "ip": "127.0.0.1"
                        }
                    },
                    "outbound": {},
                    "outboundDetour": [{
                        "protocol": "freedom",
                        "settings": {},
                        "tag": "direct"
                    }],
                    "routing": {
                        "strategy": "rules",
                        "settings": {
                            "rules": [{
                                    "type": "field",
                                    "port": "54-79",
                                    "outboundTag": "direct"
                                },
                                {
                                    "type": "field",
                                    "port": "81-442",
                                    "outboundTag": "direct"
                                },
                                {
                                    "type": "field",
                                    "port": "444-65535",
                                    "outboundTag": "direct"
                                },
                                {
                                    "type": "field",
                                    "domain": [
                                        "gc.kis.scr.kaspersky-labs.com"
                                    ],
                                    "outboundTag": "direct"
                                },
                                {
                                    "type": "chinasites",
                                    "outboundTag": "direct"
                                },
                                {
                                    "type": "field",
                                    "ip": [
                                        "0.0.0.0/8",
                                        "10.0.0.0/8",
                                        "100.64.0.0/10",
                                        "127.0.0.0/8",
                                        "169.254.0.0/16",
                                        "172.16.0.0/12",
                                        "192.0.0.0/24",
                                        "192.0.2.0/24",
                                        "192.168.0.0/16",
                                        "198.18.0.0/15",
                                        "198.51.100.0/24",
                                        "203.0.113.0/24",
                                        "::1/128",
                                        "fc00::/7",
                                        "fe80::/10"
                                    ],
                                    "outboundTag": "direct"
                                },
                                {
                                    "type": "chinaip",
                                    "outboundTag": "direct"
                                }
                            ]
                        }
                    }
                };
                var s = this.services[this.clientservice];
                if (!s.ports[this.clientserverport]) return {
                    'err': '信息不全'
                };
                if (s && s.type == 'vmess') {
                    base.outbound = {
                        "protocol": "vmess",
                        "settings": {
                            "vnext": [{
                                "address": this.serveraddr,
                                "port": s.ports[this.clientserverport].number,
                                "users": [{
                                    "id": s.users[this.clientuser].uuid,
                                    "level": 1,
                                    "alterId": parseInt(s.users[this.clientuser].alterid)
                                }]
                            }]
                        }
                    };
                    if (s.ports[this.clientserverport].iskcp) {
                        base.outbound.streamSettings = {
                            'network': 'kcp'
                        };
                    }

                }
                if (base.outbound && this.clientMuxEnabled) {
                    base.outbound.mux = {
                        "enabled": true,
                        "concurrency": 8
                    }
                }

                if (s && s.transport && s.transport.tls) {
                    base.outbound.streamSettings = base.outbound.streamSettings || {}
                    base.outbound.streamSettings.security = true
                    base.outbound.streamSettings.tlsSettings = {
                        serverName: s.transport.tlsServerName,
                        allowInsecure: s.transport.tlsAllowInsecure
                    }
                }



                return base;
            },

            clientjsonstr: function () {
                return JSON.stringify(this.clientjson, null, 4);
            },
            serverjsonstr: function () {
                return JSON.stringify(this.serverjson, null, 4);
            }
        }
    });
});
