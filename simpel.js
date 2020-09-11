import _ from 'lodash';
const path = require('path');
import { parse } from 'node-html-parser';
const locationChangedEvent = new Event('locationChanged')

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
		if (model !== 'undefined') {
            this.getComponentData(model).then(async (data) => {
    			this.controllers[model] = {
    				data,
    				elements: await this.render(data, this.router.routerElement)
    			}
    			console.log(this.controllers);
    			this.assignProxy(model)
    		})
            // .catch(err => {
            //     console.log(err);
            // })
        }
    }

	render(data, parentNode, elements = {}, binding = null) {
        // console.log(parentNode.childNodes);
        // childNodes.forEach(node => {
        for (let i = 0; i < parentNode.childNodes.length; i++) {
            let node = parentNode.childNodes.item(i)
            // console.log(data, parentNode.childNodes, node);
			if (node.nodeType === 3) {
                if (!node.parentNode.hasAttribute('list'))
    				elements = this.getTextNodes(data, parentNode, node, elements)
			}
            // if (node.getAttribute) console.log(node, node.hasAttribute('list'));
            if (node.nodeType === 1 && node.hasAttribute('list')) {
                var model = node.getAttribute('list')
                if (model === this.router.historyState.model) {
                    data[model] = data
                }
                if (Array.isArray(data[model])) {
                    data[model].forEach((itemData, index) => {
                        let listElement = document.createElement(node.tagName.toLowerCase())
                        if (listElement.hasAttributes()) {
                            for (let attr in listElement.attributes) {
                                if (listElement.attributes[attr] && listElement.attributes[attr].name && listElement.attributes[attr].value) {
                                    listElement.setAttribute(listElement.attributes[attr].name, listElement.attributes[attr].value)
                                }
                            }
                        }
                        let binding = `${model}[${index}]`
                        listElement.setAttribute('model', binding)
                        if (listElement.hasAttribute('hide-if')) {
                            let boundValue = listElement.hasAttribute('hide-if')
                            listElement.setAttribute('hide-if', `${binding}.${boundValue}`)
                        }
                        if (listElement.hasAttribute('show-if')) {
                            let boundValue = listElement.hasAttribute('show-if')
                            listElement.setAttribute('show-if', `${binding}.${boundValue}`)
                        }
                        listElement.innerHTML = node.innerHTML
                        console.log(listElement);
                        console.log(parentNode);
						elements = this.getTextNodes(data, listElement, listElement, elements, binding)
						elements = this.getInputs(data, listElement, elements, binding)
                        node.parentNode.appendChild(listElement)
                        elements = this.showHide(node, data, elements)
                    })
                }
                if (node.parentNode)
                    node.parentNode.removeChild(node);
            } else if (node.nodeType === 1) {
				switch (node.tagName.toLowerCase()) {
					case 'input':
						if (node.getAttribute('model')) {
							elements = this.getInputs(data, parentNode, elements, binding)
                            elements = this.showHide(node, data, elements)
						}
						break;
					default:
						break;
				}
			}

            if (node.childNodes.length > 0) {
                // console.log(data, node, elements);
                elements = this.render(data, node, elements)
            }
        };
		return elements
	}

	getTextNodes(data, parentNode = null, node, elements, binding = null) {
		console.log(data);
		var model, boundValue
        Array.prototype.slice.call(parentNode.getElementsByTagName('simpel-link')).map(link => {
            var route = link.getAttribute('route')
            var textNodes = route.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
            if (textNodes && textNodes.length > 0) {
                textNodes.forEach((node, i) => {
                    var boundValue = node.replace(/(\{\{)\s*|\s*(\}\})/gi, '')
                    boundValue = (binding) ? `${binding}.${boundValue}` : boundValue;
                    console.log(binding, boundValue);
                    route = route.replace(node, _.get(data, boundValue))
                })
            }
            link.setAttribute('route', route);
        })
		let dataNodes = node.textContent.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
		if (dataNodes && dataNodes.length > 0) {
			dataNodes.forEach((dataNode, i) => {
				model = dataNode.replace(/(\{\{)\s*|\s*(\}\})/gi, '');
				boundValue = (binding) ? `${binding}.${model}` : model;
                console.log(binding, boundValue);
                let dataPoint = _.get(data, boundValue)
                parentNode.innerHTML = parentNode.innerHTML.replace(dataNode, `<simpel-text model="${boundValue}">${dataPoint}</simpel-text>`);
				if (!elements[boundValue]) {
					elements[`${boundValue}`] = {
						elements: [],
						instances: [],
						hide: [],
						show: []
					};
				}
			});
		}
		Array.prototype.slice.call(parentNode.querySelectorAll(`simpel-text[model="${boundValue}"]`)).map(simpelTextElement => {
			let textNode = document.createTextNode(_.get(data, boundValue))
			elements[boundValue].elements.push(textNode);
            console.log(data, boundValue, simpelTextElement);
			simpelTextElement.parentNode.replaceChild(textNode, simpelTextElement)
		})
		return elements;
	}

	getInputs(data, parentNode, elements, binding = null) {
		for (let i = 0; i < parentNode.childNodes.length; i++) {
			let node = parentNode.childNodes.item(i);
			if (node.nodeType === 1 && node.tagName.toLowerCase() == 'input' && node.getAttribute('model')) {
				var model = node.getAttribute('model');
				var boundValue = (binding) ? `${binding}.${model}` : model

				let dataPoint = _.get(data, boundValue)
				// console.log(dataPoint);
				if (node.getAttribute('type') == 'checkbox' && dataPoint === true) {
					node.setAttribute('checked', 'checked')
					node.value = model
				} else {
					node.value = dataPoint
				}
				node.setAttribute('model', boundValue)

				if (!elements[boundValue]) {
					elements[`${boundValue}`] = {
						elements: [],
						instances: [],
						hide: [],
						show: []
					};
				}
				elements[boundValue].elements.push(node);
			}
		}
		return elements;
	}

    showHide(node, data, elements) {
        if (node.hasAttribute('hide-if')) {
            let boundValue = node.getAttribute('hide-if')
            if (!_.get(elements, boundValue)) {
                _.set(elements, boundValue, {
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            let hidden = document.createElement('simpel-hidden-element')
            _.get(elements, boundValue).hide.push({
                element: node,
                // display: window.getComputedStyle(node).getPropertyValue('display'),
                parent: node.parentNode,
                replacementElement: hidden
            })
            if (_.get(data, boundValue)) {
                // element.style.display = 'none';
                node.parentNode.replaceChild(hidden, node)
                // element.parentNode.removeChild(element)
            }
        }
        if (node.hasAttribute('show-if')) {
            let boundValue = node.getAttribute('show-if')
            if (!_.get(elements, boundValue)) {
                _.set(elements, boundValue, {
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            let hidden = document.createElement('simpel-hidden-element')
            _.get(elements, boundValue).show.push({
                element: node,
                // display: window.getComputedStyle(node).getPropertyValue('display'),
                parent: node.parentNode,
                replacementElement: hidden
            })
            if (!_.get(data, boundValue)) {
                // element.style.display = 'none';
                node.parentNode.replaceChild(hidden, node)
                // element.parentNode.removeChild(element)
            }
        }
        return elements
    }

    getComponentData(tag) {
        return new Promise((resolve, reject) => {
            if (tag === 'undefined') reject('Error')
            // fetch(this.api + `/${tag}?_page=1&_limit=10`).then(response => {
            fetch(this.api + `/${tag}`).then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    reject(response)
                }
            }).then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
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
	                element.addEventListener('input', (event) => {
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
