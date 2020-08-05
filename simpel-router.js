import _ from 'lodash';
const path = require('path');

export class SimpelRouter {
    constructor() {
        this.routes = {}
        const importAll = requireContext => requireContext.keys().forEach(key => {
            let routePath = key.replace('./', '').split('/')
            if (routePath.length == 1) {
                if (!this.routes[routePath[0]]) this.routes[_.kebabCase(routePath[0].replace('./', '').replace('.html', ''))] = requireContext(key)
            } else if (routePath. length > 1) {
                if (!this.routes[routePath[0]]) this.routes[routePath[0]] = []
                this.routes[routePath[0]][_.kebabCase(routePath[1].replace('./', '').replace('.html', ''))] = requireContext(key)
            }
        });
        importAll(require.context('./src/routes/', true, /.html$/));

        this.route = window.location.pathname.split('/').filter(part => part != '')
    }
}
