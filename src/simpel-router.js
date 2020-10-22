import _ from 'lodash';
const path = require('path');

export class SimpelRouter {
    constructor(config) {
        for (let key in config) {
            this[key] = config[key]
        }
        this.routes = {}
        this.historyState = {}
        const importAll = requireContext => requireContext.keys().forEach(key => {
            let routePath = key.replace('./', '').split('/')
            if (routePath.length == 1) {
                if (!this.routes[routePath[0]]) this.routes[_.kebabCase(routePath[0].replace('./', '').replace('.html', ''))] = requireContext(key)
            } else if (routePath. length > 1) {
                if (!this.routes[routePath[0]]) this.routes[routePath[0]] = []
                this.routes[routePath[0]][_.kebabCase(routePath[1].replace('./', '').replace('.html', ''))] = requireContext(key)
            }
        });
        importAll(require.context('./routes/', true, /.html$/));

        this.upateRoute()
    }

    upateRoute() {
        // console.log('upateRoute');
        this.route = window.location.pathname.split('/').filter(part => part != '')
    }

    locationChanged() {
        return new Promise((resolve, reject) => {
            this.upateRoute()
            if (!this.routerElement) {
                this.routerElement = document.createElement('div')
                this.routerElement.classList.add('router')
                Array.prototype.slice.call(document.getElementsByTagName('routes')).map(element => {
                    // console.log(element);
                    element.parentNode.replaceChild(this.routerElement, element)
                })
            } else {
                this.routerElement = document.querySelectorAll('.router')[0]
            }
            if (this.route.length == 0) {
                // We're at the root, load routes/Index.html
                this.routerElement.innerHTML = this.routes['index']
            } else if (this.route.length == 1) {
                if (!this.routes[this.route[0]]) {
                    console.log(this.routes);
                    this.routerElement.innerHTML = this.routes['index']
                    this.route[0] = this.rootResource + '/' + this.route[0]
                } else {
                    this.routerElement.innerHTML = this.routes[this.route[0]]['index']
                }
            } else {
                // console.log('load ${[this.route[0]]} id', this.routes[this.route[0]]['id']);
                this.routerElement.innerHTML = this.routes[this.route[0]]['id']
            }
            // this.renderRoute()
            this.historyState = (history.state) ? history.state : {
                model: this.route[0],
				id: this.route[1]
            }
            resolve()
        })
    }

    renderRoute() {

    }
}
