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
			// console.log(this.router);
		}
		this.getComponentData(model).then(async (data) => {
			this.controllers[model] = {
				data,
				elements: await this.render(data, this.router.routerElement)
			}
			// console.log(this.controllers);
			this.assignProxy(model)
		})
    }

	render(data, parentNode, elements = {}, binding = null) {
		Array.prototype.slice.call(parentNode.childNodes).map(node => {
			if (node.nodeType === 3) {
				var model, boundValue
				let dataNodes = node.textContent.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
		        if (dataNodes && dataNodes.length > 0) {
		            dataNodes.forEach((dataNode, i) => {
		                model = dataNode.replace(/(\{\{)\s*|\s*(\}\})/gi, '');
						let dataPoint = data[model]
		                parentNode.innerHTML = parentNode.innerHTML.replace(dataNode, `<simpel-text model="${model}">${dataPoint}</simpel-text>`);
						boundValue = (binding) ? `${binding}[${model}]` : model;
						if (!elements[boundValue]) {
							// console.log(boundValue);
			                elements[boundValue] = {
			                    elements: [],
			                    instances: [],
			                    hide: [],
			                    show: []
			                };
			            }
		            });
		        }
				Array.prototype.slice.call(parentNode.querySelectorAll(`simpel-text[model="${model}"]`)).map(simpelTextElement => {
					let textNode = document.createTextNode(data[model])
					elements[boundValue].elements.push(textNode);
					parentNode.replaceChild(textNode, simpelTextElement)
				})
			}
		});
		Array.prototype.slice.call(parentNode.getElementsByTagName('*')).map(node => {
			if (node.nodeType === 1) {
				switch (node.tagName.toLowerCase()) {
					case 'input':
						if (node.getAttribute('model')) {
							var model = node.getAttribute('model');

							let dataPoint = data[model]
							if (node.getAttribute('type') == 'checkbox' && dataPoint === true) {
								node.setAttribute('checked', 'checked')
								node.value = model
							} else {
								node.value = dataPoint
							}

							var boundValue = (binding) ? `${binding}[${model}]` : model
							if (!elements[boundValue]) {
				                elements[boundValue] = {
				                    elements: [],
				                    instances: [],
				                    hide: [],
				                    show: []
				                };
				            }
							elements[boundValue].elements.push(node);
						}
						break;
					default:
						if (node.getAttribute('list')) {
							var model = node.getAttribute('list')
							if (Array.isArray(data[model])) {
								data[model].forEach((itemData, index) => {
									// console.log(itemData);
									let listElement = document.createElement(node.tagName.toLowerCase())
									if (listElement.hasAttributes()) {
	                                    for (let attr in listElement.attributes) {
	                                        if (listElement.attributes[attr] && listElement.attributes[attr].name && listElement.attributes[attr].value) {
	                                            listElement.setAttribute(listElement.attributes[attr].name, listElement.attributes[attr].value)
	                                        }
	                                    }
	                                }
									listElement.innerHTML = node.innerHTML
									// if (!_.get(this.bindings, model[index])) {
						            //     _.set(this.bindings, model[index])
						            // }
									parentNode.appendChild(listElement)
									if (node.childNodes.length > 0) {
										elements = this.render(itemData, listElement, elements, `${model}[${index}]`)
									}
								})
								if (node.parentNode)
									parentNode.removeChild(node);
							}
						}
						break;
				}
			}
			if (node.childNodes.length > 0) {
				elements = this.render(data, node, elements)
			}
		});
		console.log(elements);
		return elements
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

    assignProxy(ctrl) {
		var controller = this.controllers[ctrl]
		console.log(controller);
        // Update DOM element bound when controller property is set
        let proxyHandler = {
            set: (target, prop, value, receiver) => {
				console.log(prop, value);
                var bind = _.get(controller.elements, prop)
                if (bind) {
					console.log(bind);
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
                            } else {
                                hidden.element.parentNode.replaceChild(hidden.replacementElement, hidden.element)
                            }
                        }
                    });
                    bind.show.forEach((show, index) => {
                        if (typeof value === 'boolean') {
                            if (value) {
                                show.replacementElement.parentNode.replaceChild(show.element, show.replacementElement)
                            } else {
                                show.element.parentNode.replaceChild(show.replacementElement, show.element)
                            }
                        }
                    });
                }
                return _.set(target, prop, value)
            }
        }
        this.proxy = new Proxy(controller.data, proxyHandler);
        // Listen for DOM element update to set the controller property
        this.addListeners(this.proxy, controller.elements)

        // Fill proxy with ctrl properties
        // and return proxy, not the ctrl!
        Object.assign(this.proxy, controller.data);
    }

    addListeners(proxy, bindings, parent = null) {
        Object.keys(bindings).forEach((boundValue) => {
            var bind = _.get(bindings, boundValue)
			if (Array.isArray(bind)) {
				bind.forEach(subBind => {
					this.addListeners(proxy, subBind)
				})
			} else {
	            bind.elements.forEach((element) => {
					console.log(element);
	                element.addEventListener('input', (event) => {
						console.log(event);
	                    var value = (event.target.type == 'checkbox') ? event.target.checked : event.target.value
	                    proxy[boundValue] = value;
	                })
	            })
	            bind.hide.forEach((element, index) => {
	                if (typeof prop === 'boolean') {
	                    // console.log(prop, value);
	                }
	            })
			}
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
