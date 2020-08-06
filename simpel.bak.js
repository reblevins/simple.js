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
        this.data = null
        this.appDiv = document.createElement('div');
        this.appDiv.innerHTML = this.template;
        document.body.appendChild(this.appDiv);

        this.getComponentsHTML()
        // this.getTextNodes()
        // this.getBindings()

        window.save = (event) => {
            console.log(this.proxy['todos']);
        }
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
                    console.log(data);
                    this.data = data
                    var controllerFunction = new Function(`return function ${tag}Controller() { this[tag] = data }`)
                    if (!this.components[tag]) {
                        this.components[tag] = {
                            factory: controllerFunction,
                            instances: [],
                            elements: []
                        }
                    }
                    this.components[tag].elements.push(newElement)

                    Array.prototype.slice.call(newElement.querySelectorAll('[list]')).map(subElement => {
                        var boundValue = subElement.getAttribute('list');
                        var parentListElement = subElement.parentNode
                        if (Array.isArray(data)) {
                            data.forEach((item, index) => {
                                var listElement = document.createElement(subElement.tagName.toLowerCase())
                                listElement.innerHTML = subElement.innerHTML
                                if (subElement.hasAttributes()) {
                                    for (let attr in subElement.attributes) {
                                        if (subElement.attributes[attr] && subElement.attributes[attr].name && subElement.attributes[attr].value) {
                                            listElement.setAttribute(subElement.attributes[attr].name, subElement.attributes[attr].value)
                                        }
                                    }
                                }
                                this.replaceTextNodes(listElement, item, `${tag}[${index}]`)
                                parentListElement.appendChild(listElement)
                                this.getBindings(listElement, item, `${tag}[${index}]`)
                            })
                        }
                        parentListElement.removeChild(subElement)
                    })

                    var ctrl = new this.components[tag].factory();
                    this.components[tag].instances.push(ctrl);
                    // this.replaceTextNodes(element, data)
                    this.assignProxy(ctrl)
                    console.log(this.proxy);
                })
            })
        }
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
            let path = elementWithModel.getAttribute('model');
            if (elementWithModel.tagName.toLowerCase() == 'simpel-text') {
                let textNode = document.createTextNode(elementWithModel.innerHTML)
                let parentDiv = elementWithModel.parentNode
                parentDiv.replaceChild(textNode, elementWithModel)
                elementWithModel = textNode
            } else if (elementWithModel.type == "checkbox") {
                // elementWithModel.value = path
                // console.log(path, data);
                if (data[path])
                    elementWithModel.setAttribute('checked', 'checked');
            } else {
                elementWithModel.value = data[path]
                elementWithModel.setAttribute('value', data[path]);
            }
            // console.log(path);
            let boundValue = `${binding}.${path}`
            if (!this.bindings[boundValue]) {
                this.bindings[boundValue] = {
                    boundValue: boundValue,
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                }
            }
            this.bindings[boundValue].elements.push(elementWithModel);
        });
        if (element.hasAttribute('hide-if')) {
            let path = element.getAttribute('hide-if')
            let boundValue = `${binding}.${path}`
            if (!this.bindings[boundValue]) {
                this.bindings[boundValue] = {
                    boundValue: boundValue,
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                }
            }
            let hidden = document.createElement('simple-hidden-text')
            this.bindings[boundValue].hide.push({
                element: element,
                display: window.getComputedStyle(element).getPropertyValue('display'),
                parent: element.parentNode,
                // comment: comment
            })
            if (data[path]) {
                element.style.display = 'none';
                element.parentNode.replaceChild(hidden, element)
                // element.parentNode.removeChild(element)
            }
        }
        if (element.hasAttribute('show-if')) {
            let path = element.getAttribute('show-if')
            let boundValue = `${binding}.${path}`
            if (!this.bindings[boundValue]) {
                this.bindings[boundValue] = {
                    boundValue: boundValue,
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                }
            }
            this.bindings[boundValue].show.push({
                element: element,
                display: window.getComputedStyle(element).getPropertyValue('display'),
                parent: element.parentNode
            })
            if (!data[path]) {
                element.style.display = 'none';
                // element.parentNode.removeChild(element)
            }
        }
    }

    assignProxy(ctrl) {
        // Update DOM element bound when controller property is set
        let proxyHandler = {
            get: (target, prop, receiver) => {
                // console.log(receiver);
                return this.data;
            },
            set: (target, prop, value, receiver) => {
                var bind = this.bindings[prop]
                if (bind) {
                    bind.elements.forEach((element) => {
                        if (element.nodeType == 3) {
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
                    bind.hide.forEach((hidden, index) => {
                        if (typeof value === 'boolean') {
                            if (!value) {
                                hidden.element.style.display = null
                            } else {
                                hidden.element.style.display = 'none'
                            }
                        }
                    });
                    bind.show.forEach((show, index) => {
                        if (typeof value === 'boolean') {
                            console.log(show.display, value);
                            if (value) {
                                show.element.style.display = null
                                console.log(show.element.style);
                            } else {
                                show.element.style.display = 'none'
                            }
                            // show.parent.prepend(show.element)
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
        Object.keys(bindings).forEach((boundValue) => {
            var bind = bindings[boundValue]
            if (!bindings[boundValue].boundValue) {
                this.addListeners(proxy, bindings[boundValue], boundValue)
                return
            }
            bind.elements.forEach((element) => {
                element.addEventListener('input', (event) => {
                    var value = (event.target.type == 'checkbox') ? event.target.checked : event.target.value
                    proxy[bind.boundValue] = value;
                })
            })
            bind.hide.forEach((element, index) => {
                if (typeof prop === 'boolean') {
                    // console.log(prop, value);
                }
            })
        })
    }
}

class SimpleHiddenText extends HTMLElement {
    constructor() {
        super()

        // Create a shadow root
        const shadow = this.attachShadow({mode: 'open'});
        console.log(this.innerHTML);

        // const textNode = document.createComment(' ')
        // shadow.appendChild(textNode)
    }
}
customElements.define('simple-hidden-text', SimpleHiddenText);
