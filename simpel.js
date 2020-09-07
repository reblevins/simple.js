import _ from 'lodash';
const path = require('path');
import { parse } from 'node-html-parser';
const locationChangedEvent = new Event('locationChanged')

// const get = (object, path, value) => {
// 	const pathArray = Array.isArray(path) ? path : path.split('.').filter(key => key)
// 	const pathArrayFlat = pathArray.flatMap(part => typeof part === 'string' ? part.split('.') : part)
//
// 	return pathArrayFlat.reduce((obj, key) => obj && obj[key], object) || value
// }

const get = (obj, path, defaultValue) => path.split(".")
.reduce((a, c) => (a && a[c] ? a[c] : (defaultValue || null)), obj)

const set = (obj, path, value) => {
    if (Object(obj) !== obj) return obj; // When obj is not an object
    // If not yet an array, get the keys from the string-path
    if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
    path.slice(0,-1).reduce((a, c, i) => // Iterate all of them except the last one
         Object(a[c]) === a[c] // Does the key exist and is its value an object?
             // Yes: then follow that path
             ? a[c]
             // No: create the key. Is the next key a potential array-index?
             : a[c] = Math.abs(path[i+1])>>0 === +path[i+1]
                   ? [] // Yes: assign a new array object
                   : {}, // No: assign a new plain object
         obj)[path[path.length-1]] = value; // Finally assign the value to the last key
    return obj; // Return the top-level object to allow chaining
};

export class Simpel {
    constructor(config) {
        for (let key in config) {
            this[key] = config[key]
        }
    }

    init() {
        this.bindings = {}
		this.components = {}
        this.controllers = {}
        this.proxy = {}
        this.componentsHTML = {};
        this.data = null
        this.appDiv = document.createElement('div');
        this.appDiv.innerHTML = this.template;
        document.body.appendChild(this.appDiv);

        if (this.router) {
            this.router.locationChanged().then(() => {
                this.getComponentsHTML()
            })
            window.handleLinkClick = (event) => {
                console.log(event);
            }

            // const event = new Event('locationChanged');
            window.addEventListener('popstate', (event) => {
                this.router.locationChanged().then(() => {
                    this.getComponentsHTML()
                })
            });

            document.addEventListener('locationChanged', (event) => { this.router.locationChanged().then(() => {
                this.getComponentsHTML()
            })}, false)
        } else {
            this.getComponentsHTML()
        }

        window.save = (event) => {
            let apiRoute = event.split('/').shift()
            console.log(apiRoute);
            fetch(this.api + `/${apiRoute[0]}`, {
                method: 'POST',
                body: JSON.stringify(this.proxy[apiRoute[0]])
            }).then(obj => console.log(obj))
        }
    }

    getComponentsHTML() {
        if (Object.keys(this.componentsHTML).length == 0) {
            // create a 'cache' where we can store our built up HTML from our fragments

            // here, we're creating an anonymous function that loads up our HTML fragments
            // then it adds them to our cache object
            const importAll = requireContext => requireContext.keys().forEach(key => this.componentsHTML[_.kebabCase(key.replace('./', '').replace('.html', ''))] = requireContext(key));

            // next, we call our importAll() function to load the files
            // notice how this is where we call the require.context() function
            // it uses our file path, whether to load subdirectories and what file type to get
            importAll(require.context('./src/templates/', false, /.html$/));
        }

        var parsedHTML = parse(this.router.routerElement.innerHTML, { comment: true });
        // console.log(parsedHTML);
        // this.appDiv.appendChild(parsedHTML.childNodes[0])
		// console.log(parsedHTML);

		var model;
		if (this.router) {
			model = this.router.historyState.model
			model += (this.router.historyState.id) ? '/' + this.router.historyState.id : ''
		}
		this.getComponentData(model).then(async (data) => {
			this.controllers[model] = {
				data,
				elements: await this.render(data, this.router.routerElement)
			}
		})

        for (let tag in this.componentsHTML) {
            Array.prototype.slice.call(this.appDiv.getElementsByTagName(tag)).map(element => {
                var newElement = document.createElement('div')
                newElement.innerHTML = this.componentsHTML[tag]
                var parent = element.parentNode
                parent.replaceChild(newElement, element)

                let model = tag
                let apiRoute = model
                if (this.router) {
                    model = apiRoute = this.router.historyState.model
                    apiRoute += (this.router.historyState.id) ? '/' + this.router.historyState.id : ''
                }
                this.getComponentData(apiRoute).then(data => {
                    var controllerFunction = new Function(`return function ${model}Controller() { this[model] = data }`)
                    if (!this.components[model]) {
                        this.components[model] = {
                            data: {},
                            elements: []
                        }
                    }
                    this.components[model].data = data
                    this.components[model].elements.push(newElement)
                    Array.prototype.slice.call(newElement.querySelectorAll('[list]')).map(subElement => {
                        var boundValue = subElement.getAttribute('list');
                        var parentListElement = subElement.parentNode
						let values = get(this.components[model].data, boundValue, null)
                        if (Array.isArray(values)) {
                            values.forEach((item, index) => {
                                var listElement = document.createElement(subElement.tagName.toLowerCase())
                                listElement.innerHTML = subElement.innerHTML
                                if (subElement.hasAttributes()) {
                                    for (let attr in subElement.attributes) {
                                        if (subElement.attributes[attr] && subElement.attributes[attr].name && subElement.attributes[attr].value) {
                                            listElement.setAttribute(subElement.attributes[attr].name, subElement.attributes[attr].value)
                                        }
                                    }
                                }
                                this.replaceTextNodes(listElement, item, `${model}[${index}]`)
                                parentListElement.appendChild(listElement)
                                this.getBindings(listElement, item, `${model}[${index}]`)
                            })
                        }
                        parentListElement.removeChild(subElement)
                    })
                    this.replaceTextNodes(this.appDiv, data, `${model}`)
                    this.assignProxy(this.components[model].data)
                    // console.log(this.proxy['todos']);
                })
            })
        }
    }

	render(data, parentNode, binding = null) {
		console.log(data);
		parentNode.childNodes.forEach(node => {
			if (node.nodeType === 3) {
				// console.log(node);
				var boundValue
				let dataNodes = node.textContent.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
		        if (dataNodes && dataNodes.length > 0) {
		            dataNodes.forEach((dataNode, i) => {
		                boundValue = dataNode.replace(/(\{\{)\s*|\s*(\}\})/gi, '');
						boundValue = (binding) ? `${binding}['${boundValue}']` : boundValue
						if (!_.get(this.bindings, boundValue)) {
							// console.log(boundValue);
			                _.set(this.bindings, boundValue, {
			                    elements: [],
			                    instances: [],
			                    hide: [],
			                    show: []
			                })
			            }
		                parentNode.innerHTML = parentNode.innerHTML.replace(dataNode, `<simpel-text model="${boundValue}">${data[boundValue]}</simpel-text>`)
		            });
		        }
				// console.log(parentNode.querySelectorAll(`simpel-text[model="${boundValue}"]`));
				Array.prototype.slice.call(parentNode.querySelectorAll(`simpel-text[model="${boundValue}"]`)).map(node => {
					let textNode = document.createTextNode(data[boundValue])
					_.get(this.bindings, boundValue).elements.push(textNode);
					parentNode.replaceChild(textNode, node)
					// console.log(textNode);
				})
			} else if (node.nodeType === 1) {
				console.log(node.nodeType);
				switch (node.tagName.toLowerCase()) {
					case 'input':
						if (node.getAttribute('model')) {
							var boundValue = node.getAttribute('model')
							if (!_.get(this.bindings, boundValue)) {
				                _.set(this.bindings, boundValue, {
				                    elements: [],
				                    instances: [],
				                    hide: [],
				                    show: []
				                })
				            }
							node.value = data[boundValue]
							if (node.getAttribute('type') == 'checkbox' && data[boundValue])
								node.setAttribute('checked', 'checked')
							_.get(this.bindings, boundValue).elements.push(node);
						}
						break;
					default:
						if (node.getAttribute('list')) {
							var boundValue = node.getAttribute('list')
							if (!_.get(this.bindings, boundValue)) {
				                _.set(this.bindings, boundValue, {
				                    elements: [],
				                    instances: [],
				                    hide: [],
				                    show: []
				                })
				            }
							if (Array.isArray(data[boundValue])) {
								data[boundValue].forEach((item, index) => {
									// console.log(item);
									let listElement = document.createElement(node.tagName.toLowerCase())
									if (listElement.hasAttributes()) {
	                                    for (let attr in listElement.attributes) {
	                                        if (listElement.attributes[attr] && listElement.attributes[attr].name && listElement.attributes[attr].value) {
	                                            listElement.setAttribute(listElement.attributes[attr].name, listElement.attributes[attr].value)
	                                        }
	                                    }
	                                }
									// if (node.childNodes.length > 0) {
									// 	this.render(item, node, `${boundValue}[${index}]`)
									// }
									if (!_.get(this.bindings, boundValue[index])) {
						                _.set(this.bindings, boundValue, {
						                    elements: [],
						                    instances: [],
						                    hide: [],
						                    show: []
						                })
						            }
									_.get(this.bindings, boundValue).elements.push(node);
									console.log(parentNode);
									parentNode.appendChild(listElement)
									// console.log(list);
								})
								parentNode.removeChild(node)
							}
						}
						break;
				}
			}
			if (node.childNodes.length > 0) {
				this.render(data, node)
			}
		})
		// console.log(this.bindings);
	}

    getComponentData(tag) {
        // console.log(tag);
        return new Promise((resolve, reject) => {
            // fetch(this.api + `/${tag}?_page=1&_limit=10`).then(response => {
            fetch(this.api + `/${tag}`).then(response => {
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
        Array.prototype.slice.call(element.getElementsByTagName('simpel-link')).map(link => {
            var route = link.getAttribute('route')
            var textNodes = route.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
            if (textNodes && textNodes.length > 0) {
                textNodes.forEach((node, i) => {
                    var boundValue = node.replace(/(\{\{)\s*|\s*(\}\})/gi, '')
                    route = route.replace(node, data[boundValue])
                })
            }
            link.setAttribute('route', route);
        })
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
            let boundValue = `${binding}.${path}`
            if (!_.get(this.bindings, boundValue)) {
                _.set(this.bindings, boundValue, {
                    boundValue: boundValue,
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            _.get(this.bindings, boundValue).elements.push(elementWithModel);
        });
        if (element.hasAttribute('hide-if')) {
            let path = element.getAttribute('hide-if')
            let boundValue = `${binding}.${path}`
            if (!_.get(this.bindings, boundValue)) {
                _.set(this.bindings, boundValue, {
                    boundValue: boundValue,
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            let hidden = document.createElement('simpel-hidden-element')
            _.get(this.bindings, boundValue).hide.push({
                element: element,
                display: window.getComputedStyle(element).getPropertyValue('display'),
                parent: element.parentNode,
                replacementElement: hidden
            })
            if (data[path]) {
                // element.style.display = 'none';
                element.parentNode.replaceChild(hidden, element)
                // element.parentNode.removeChild(element)
            }
        }
        if (element.hasAttribute('show-if')) {
            let path = element.getAttribute('show-if')
            let boundValue = `${binding}.${path}`
            if (!_.get(this.bindings, boundValue)) {
                _.set(this.bindings, boundValue, {
                    boundValue: boundValue,
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            let hidden = document.createElement('simpel-hidden-element')
            _.get(this.bindings, boundValue).show.push({
                element: element,
                display: window.getComputedStyle(element).getPropertyValue('display'),
                parent: element.parentNode,
                replacementElement: hidden
            })
            if (!data[path]) {
                // element.style.display = 'none';
                element.parentNode.replaceChild(hidden, element)
                // element.parentNode.removeChild(element)
            }
        }
    }

    assignProxy(ctrl) {
		// console.log(ctrl);
        // Update DOM element bound when controller property is set
        let proxyHandler = {
            set: (target, prop, value, receiver) => {
				// console.log(prop);
                var bind = this.bindings[prop]
                if (bind) {
					// console.log(bind);
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
                                hidden.replacementElement.parentNode.replaceChild(hidden.element, hidden.replacementElement)
                                // hidden.element.style.display = null
                            } else {
                                hidden.element.parentNode.replaceChild(hidden.replacementElement, hidden.element)
                                // hidden.element.style.display = 'none'
                            }
                        }
                    });
                    bind.show.forEach((show, index) => {
                        if (typeof value === 'boolean') {
                            // console.log(show.display, value);
                            if (value) {
                                show.replacementElement.parentNode.replaceChild(show.element, show.replacementElement)
                                // show.element.style.display = null
                            } else {
                                show.element.parentNode.replaceChild(show.replacementElement, show.element)
                                // show.element.style.display = 'none'
                            }
                        }
                    });
                }
                return _.set(target, prop, value)
            }
        }
        this.proxy = new Proxy(ctrl, proxyHandler);
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
			// console.log(bind);
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

class SimpelHiddenElement extends HTMLElement {
    constructor() {
        super()

        // Create a shadow root
        const shadow = this.attachShadow({mode: 'open'});
    }
}
customElements.define('simpel-hidden-element', SimpelHiddenElement);

class SimpelLink extends HTMLElement {
    constructor() {
        super()

        // Create a shadow root
        const shadow = this.attachShadow({mode: 'open'});

        const textNode = document.createTextNode(this.innerText)
        shadow.appendChild(textNode)

        this.addEventListener('click', (event) => {
            var route = this.getAttribute('route').split('/')
            history.pushState({ model: route[1], id: route[2] }, 'Posts', this.getAttribute('route'))
            document.dispatchEvent(locationChangedEvent)
        })
    }
}
customElements.define('simpel-link', SimpelLink);
