import _ from 'lodash';
const path = require('path');

export class Simpel {
    constructor(config) {
        for (let key in config) {
            this[key] = config[key]
        }
    }

    init() {
        this.bindings = {}
        this.components = {}
        this.proxy = {}
        this.appDiv = document.createElement('div');
        this.appDiv.innerHTML = this.template;
        document.body.appendChild(this.appDiv);

        this.getComponentsHTML()
        // this.getTextNodes()
        // this.getBindings()
    }

    getComponentsHTML() {
        // create a 'cache' where we can store our built up HTML from our fragments
        this.componentsHTML = {};

        // here, we're creating an anonymous function that loads up our HTML fragments
        // then it adds them to our cache object
        const importAll = requireContext => requireContext.keys().forEach(key => this.componentsHTML[_.kebabCase(key.replace('./', '').replace('.html', ''))] = requireContext(key));

        // next, we call our importAll() function to load the files
        // notice how this is where we call the require.context() function
        // it uses our file path, whether to load subdirectories and what file type to get
        importAll(require.context('./src/templates/', false, /.html$/));

        for (let tag in this.componentsHTML) {
            Array.prototype.slice.call(this.appDiv.getElementsByTagName(tag)).map(element => {
                var newElement = document.createElement('div')
                newElement.innerHTML = this.componentsHTML[tag]
                var parent = element.parentNode
                parent.replaceChild(newElement, element)
                // element.outerHTML = this.componentsHTML[tag]

                this.getComponentData(tag).then(data => {
                    var controllerFunction = new Function(`return function ${tag}Controller() { this[tag] = data }`)
                    if (!this.components[tag]) {
                        this.components[tag] = {
                            factory: controllerFunction,
                            instances: [],
                            elements: []
                        }
                    }
                    this.components[tag].elements.push(newElement)

                    console.log(newElement);
                    Array.prototype.slice.call(newElement.querySelectorAll('[list]')).map(subElement => {
                        var boundValue = subElement.getAttribute('list');
                        console.log(subElement)
                        var parentListElement = subElement.parentNode
                        if (Array.isArray(data)) {
                            data.forEach((item, index) => {
                                var listElement = document.createElement(subElement.tagName.toLowerCase())
                                listElement.innerHTML = subElement.innerHTML
                                this.replaceTextNodes(listElement, item, `tag[${index}]`)
                                parentListElement.appendChild(listElement)
                                this.getBindings(listElement, item, `tag[${index}]`)
                            })
                        }
                        parentListElement.removeChild(subElement)
                    })

                    console.log(this.bindings);
                    var ctrl = new this.components[tag].factory();
                    this.components[tag].instances.push(ctrl);
                    // this.replaceTextNodes(element, data)
                    this.assignProxy(ctrl)
                    console.log(this.proxy);
                })
            })
        }
        console.log(this.components);
    }

    getComponentData(tag) {
        return new Promise((resolve, reject) => {
            fetch(this.api + `/${tag}?_page=1&_limit=10`).then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    reject(response)
                }
            }).then(data => {
                resolve(data)
            })
        })
    }

    replaceTextNodes(element, data, binding) {
        this.textNodes = element.innerHTML.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
        if (this.textNodes && this.textNodes.length > 0) {
            this.textNodes.forEach((node, i) => {
                var boundValue = node.replace(/(\{\{)\s*|\s*(\}\})/gi, '');
                element.innerHTML = element.innerHTML.replace(node, `<simpel-text model="${boundValue}">${data[boundValue]}</simpel-text>`)
            });
        }
    }

    getBindings(element, data, binding) {
        Array.prototype.slice.call(element.querySelectorAll('[model]'))
        .map((elementWithModel) => {
            var path = elementWithModel.getAttribute('model');
            if (elementWithModel.tagName.toLowerCase() == 'simpel-text') {
                var textNode = document.createTextNode(elementWithModel.innerHTML)
                var parentDiv = elementWithModel.parentNode
                parentDiv.replaceChild(textNode, elementWithModel)
                elementWithModel = textNode
            } else {
                elementWithModel.value = data[path]
                elementWithModel.setAttribute('value', data[path]);
            }
            // console.log(path);
            var boundValue = `${binding}.${path}`
            if (!this.bindings[boundValue]) {
                this.bindings[boundValue] = {
                    boundValue: boundValue,
                    elements: [],
                    instances: []
                }
            }
            this.bindings[boundValue].elements.push(elementWithModel);
        });
        Array.prototype.slice.call(element.querySelectorAll('[hide-if]'))
        .map(elementWithCondition => {
            var path = elementWithModel.getAttribute('hide-if');
            
        })
    }

    assignProxy(ctrl) {
        // Update DOM element bound when controller property is set
        let proxyHandler = {
            set: (target, prop, value, receiver) => {
                // if (typeof ctrl[prop] === 'object') {
                //     return new Proxy(ctrl[prop], proxyHandler)
                // }
                // var bind = _.get(this.bindings, prop);
                var bind = this.bindings[prop]
                if (bind) {
                    bind.elements.forEach(function (element) {
                        console.log(element.getAttribute('type'));
                        if (element.nodeType == 3) {
                            console.log(receiver);
                            element.textContent = value
                        } else if (element.tagName.toLowerCase() == 'input') {
                            if (element.getAttribute('type') == "checkbox") {
                                element.checked = value
                            } else {
                                element.value = value;
                                element.setAttribute('value', value);
                            }
                        } else {
                            element.innerHTML = value

                        }
                    });
                }
                // appDiv.childNodes[0].textContent = value
                return Reflect.set(target, prop, value);
            }
        }
        this.proxy = new Proxy(ctrl, proxyHandler);
        // console.log(proxy);
        // Listen for DOM element update to set the controller property
        this.addListeners(this.proxy, this.bindings)

        // Fill proxy with ctrl properties
        // and return proxy, not the ctrl!
        Object.assign(this.proxy, ctrl);
    }

    addListeners(proxy, bindings, parent = null) {
        Object.keys(bindings).forEach(function(boundValue) {
            var bind = bindings[boundValue]
            if (!bindings[boundValue].boundValue) {
                this.addListeners(proxy, bindings[boundValue], boundValue)
                return
            }
            bind.elements.forEach(function (element) {
                element.addEventListener('input', function (event) {
                    var value = (event.target.type == 'checkbox') ? event.target.checked : event.target.value
                    console.log(event);
                    proxy[bind.boundValue] = value;
                })
            })
        })
    }
}
