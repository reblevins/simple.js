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
			console.log(this.router.routerElement);
		}
		if (model !== 'undefined') {
            this.getComponentData(model).then(async (data) => {
                console.log(data);
    			this.controllers[model] = {
    				data,
    				elements: {}
    			}
                console.log(model, this.controllers[model]);
                await this.render({ model, parentNode: this.router.routerElement })
                await this.renderLists({ model, parentNode: this.router.routerElement })
    			this.assignProxy(model)
    		})
            console.log(this.controllers);
            // .catch(err => {
            //     console.log(err);
            // })
        }
    }

	render(options) {
        return new Promise((resolve, reject) => {
            var { model, parentNode, binding = null } = options
            var { data = null } = this.controllers[model]
            // childNodes.forEach(node => {
            var childNodes = parentNode.getElementsByTagName('*')
            for (let i = 0; i < childNodes.length; i++) {
                let node = childNodes.item(i)
                // console.log(data, parentNode.childNodes, node);
    			if (node.nodeType === 3 && !node.parentNode.hasAttribute('list')) {
                    this.getTextNodes({ model, parentNode, node })
    			} else if (node.nodeType === 1 && !node.parentNode.hasAttribute('list')) {
    				switch (node.tagName.toLowerCase()) {
    					case 'input':
    						if (node.getAttribute('model')) {
                                // console.log(node);
    							this.getInputs({ model, parentNode, binding })
                                // this.showHide({ model, node })
    						}
    						break;
    					default:
    						break;
    				}
    			}

                if (node.childNodes.length > 0 && !node.parentNode.hasAttribute('list')) {
                    // console.log(data, node, elements);
                    this.render({ model, parentNode: node })
                }
            }
            resolve();
        }).catch(err => {
            console.log(err);
            reject(err)
        })
	}

    renderLists(options) {
        return new Promise(async (resolve, reject) => {
            var { model, parentNode } = options;
            var { data = null } = this.controllers[model];

            await Array.prototype.slice.call(parentNode.querySelectorAll('[list]')).map(node => {
                var localModel = node.getAttribute('list');
                if (Array.isArray(data[localModel])) {
                    data[localModel].forEach(async (itemData, index) => {
                        // console.log(data[localModel]);
                        let listElement = document.createElement(node.tagName.toLowerCase());
                        if (listElement.hasAttributes()) {
                            for (let attr in listElement.attributes) {
                                if (listElement.attributes[attr] && listElement.attributes[attr].name && listElement.attributes[attr].value) {
                                    listElement.setAttribute(listElement.attributes[attr].name, listElement.attributes[attr].value)
                                }
                            }
                        }
                        let binding = `${localModel}[${index}]`
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
                        // console.log(listElement);
                        // console.log("node", node);
                        if (node.parentNode)
                            node.parentNode.appendChild(listElement)

                        setTimeout(() => {
                            this.getInputs({ model, parentNode: listElement, binding })
                            this.getTextNodes({ model, parentNode: listElement, node: listElement, binding })
                            // await this.showHide({ model, node })
                        }, 1000)

                    })
                }
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            });
            resolve()
        }).catch(err => {
            console.log(err);
            reject(err)
        })
    }

	async getTextNodes(options) {
        return new Promise(async (resolve, reject) => {
            var { model, parentNode = null, node, binding = null } = options
            var { data = null } = this.controllers[model]
    		var localModel, boundValue
            await Array.prototype.slice.call(parentNode.getElementsByTagName('simpel-link')).map(link => {
    			// First check if the parent node is a list
    			if (!link.parentNode.hasAttribute('list')) {
    				// console.log(link, parentNode, binding);
    	            var route = link.getAttribute('route')
    				// console.log(data, route, textNodes);
    	            var textNodes = route.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
    	            if (textNodes && textNodes.length > 0) {
    	                textNodes.forEach((node, i) => {
    	                    var boundValue = node.replace(/(\{\{)\s*|\s*(\}\})/gi, '')
    						// console.log(binding, boundValue);
    	                    boundValue = (binding) ? `${binding}.${boundValue}` : boundValue;
    	                    route = route.replace(node, _.get(data, boundValue))
    	                })
    	            }
    	            link.setAttribute('route', route);
    			}
            })
    		let dataNodes = node.textContent.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
    		if (dataNodes && dataNodes.length > 0) {
    			dataNodes.forEach((dataNode, i) => {
    				localModel = dataNode.replace(/(\{\{)\s*|\s*(\}\})/gi, '');
    				boundValue = (binding) ? `${binding}.${localModel}` : localModel;
                    // console.log(binding, boundValue);
                    let dataPoint = _.get(data, boundValue)
                    parentNode.innerHTML = parentNode.innerHTML.replace(dataNode, `<simpel-text model="${boundValue}">${dataPoint}</simpel-text>`);
    				if (!this.controllers[model].elements[boundValue]) {
    					this.controllers[model].elements[`${boundValue}`] = {
    						elements: [],
    						instances: [],
    						hide: [],
    						show: []
    					};
    				}
    			});
    		}
    		await Array.prototype.slice.call(parentNode.querySelectorAll(`simpel-text[model="${boundValue}"]`)).map(simpelTextElement => {
    			let textNode = document.createTextNode(_.get(data, boundValue))
    			this.controllers[model].elements[boundValue].elements.push(textNode);
                console.log(textNode);
    			simpelTextElement.parentNode.replaceChild(textNode, simpelTextElement)
    		})
            resolve()
        }).catch(err => {
            console.log(err);
            reject(err)
        })
		// return elements;
        return;
	}

	getInputs(options) {
        return new Promise(async (resolve, reject) => {
            var { model, parentNode = null, node, binding = null } = options
            var { data = null } = this.controllers[model]
            var childNodes = parentNode.getElementsByTagName('input')
            // console.log(childNodes);
            for (let key of childNodes) {
                // console.log(key);
                let element = key
				var localModel = element.getAttribute('model');
				var boundValue = (binding) ? `${binding}.${localModel}` : localModel
                // console.log(element.parentNode, boundValue);

				let dataPoint = _.get(data, boundValue)
				// console.log(dataPoint);
				if (element.getAttribute('type') == 'checkbox' && dataPoint === true) {
					element.setAttribute('checked', 'checked')
					element.value = localModel
				} else {
					element.value = dataPoint
				}
				element.setAttribute('model', boundValue)

				if (!this.controllers[model].elements[boundValue]) {
					this.controllers[model].elements[`${boundValue}`] = {
						elements: [],
						instances: [],
						hide: [],
						show: []
					};
				}
				this.controllers[model].elements[boundValue].elements.push(element);
    		}
            // })
            resolve()
        }).catch(err => {
            console.log(err);
            reject(err)
        })
	}

    showHide(options) {
        var { model, node } = options
        var { data = null } = this.controllers[model]
        if (node.hasAttribute('hide-if') && !node.hasAttribute('list')) {
            let boundValue = node.getAttribute('hide-if')
            if (!_.get(this.controllers[model].elements, boundValue)) {
                _.set(this.controllers[model].elements, boundValue, {
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            let hidden = document.createElement('simpel-hidden-element')
            _.get(this.controllers[model].elements, boundValue).hide.push({
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
        if (node.hasAttribute('show-if') && !node.hasAttribute('list')) {
            let boundValue = node.getAttribute('show-if')
            if (!_.get(this.controllers[model].elements, boundValue)) {
                _.set(this.controllers[model].elements, boundValue, {
                    elements: [],
                    instances: [],
                    hide: [],
                    show: []
                })
            }
            let hidden = document.createElement('simpel-hidden-element')
            _.get(this.controllers[model].elements, boundValue).show.push({
                element: node,
                // display: window.getComputedStyle(node).getPropertyValue('display'),
                parent: node.parentNode,
                replacementElement: hidden
            })
            if (!_.get(data, boundValue)) {
                // element.style.display = 'none';
                if (node.parentNode) {
                    node.parentNode.replaceChild(hidden, node)
                } else {
                    console.log("node", node);
                }
                // element.parentNode.removeChild(element)
            }
        }
        // return elements
        return;
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
                var returnData = {}
                if (Array.isArray(data)) {
                    returnData[tag] = data
                } else {
                    returnData = data
                }
                resolve(returnData)
            }).catch(err => {
                reject(err)
            })
        })
    }

    assignProxy(model) {
		var controller = this.controllers[model]
        // Update DOM element bound when controller property is set
        let proxyHandler = {
            set: (target, prop, value, receiver) => {
				console.log(prop, value);
                var bind = _.get(this.controllers[model].elements, prop)
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
        this.proxy = new Proxy(this.controllers[model].data, proxyHandler);
        // Listen for DOM element update to set the controller property
        console.log(this.controllers[model]);
        this.addListeners({ model, proxy: this.proxy })

        // Fill proxy with model data
        // and return proxy, not the data!
        Object.assign(this.proxy, this.controllers[model].data);
    }

    addListeners(options) {
        var { model, proxy, parent = null } = options
        for (let key in this.controllers[model].elements) {
            console.log(key);
            let boundValue = key
            var bind = this.controllers[model].elements[boundValue];
            // console.log(key, boundValue);
			// if (Array.isArray(bind)) {
			// 	bind.forEach(subBind => {
			// 		this.addListeners(proxy, subBind)
			// 	})
			// } else {
            // console.log(boundValue, bind.elements);
	            bind.elements.forEach((element) => {
                    if (element.nodeType !== 3 && element.tagName == 'INPUT') {
    	                element.addEventListener('input', (event) => {
                            console.log(element);
    	                    var value = (event.target.type == 'checkbox') ? event.target.checked : event.target.value
    	                    proxy[boundValue] = value;
    	                })
                    }
	            })
	            bind.hide.forEach((element, index) => {
	                if (typeof prop === 'boolean') {
	                    // console.log(prop, value);
	                }
	            })
			// }
        }
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
        // const shadow = this.attachShadow({mode: 'open'});

        // const textNode = document.createTextNode(this.innerText)
        // shadow.appendChild(textNode)

        this.addEventListener('click', (event) => {
            var route = this.getAttribute('route').split('/')
            history.pushState({ model: route[1], id: route[2] }, 'Posts', this.getAttribute('route'))
            document.dispatchEvent(locationChangedEvent)
        })
    }
}
customElements.define('simpel-link', SimpelLink);
