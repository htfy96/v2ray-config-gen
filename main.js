$(function() {
    console.log('initing...');

    services = new Vue({
        el: '#main',
        data: {
            services: [
                {
                    type: 'vmess',
                    users: [
                        {
                            uuid: '5165165-sdfafdf',
                            alterid: 100
                        }
                    ],
                    ports: [
                        {
                            number: 12345,
                            dynamic: true,
                            dynrange: "10000-10010",
                            iskcp: true
                        }
                    ]
                }
            ]
        },
        methods: {
            addPort: function(ports) {
                ports.push({});
            },
            addUser: function(users) {
                users.push({});
            },
            removePort: function(ports, idx) {
                ports.splice(idx, 1);
            },
            removeUser: function(users, idx) {
                users.splice(idx, 1);
            }
        }
    });
});
