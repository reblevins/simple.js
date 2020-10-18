import _ from 'lodash';
const path = require('path');
import { parse } from 'node-html-parser';
const locationChangedEvent = new Event('locationChanged')

import { Auth, Amplify, API } from 'aws-amplify';

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
        this.authState = 'signIn';
        this.formInputState = { username: '', password: '' };

        Amplify.configure(this.apiConfig);

        if (this.router) {
            this.router.locationChanged().then(() => {
                this.getComponentsHTML()
            })
            window.handleLinkClick = (event) => {
                // console.log(event);
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
            // console.log(apiRoute);
            fetch(this.api + `/${apiRoute[0]}`, {
                method: 'POST',
                body: JSON.stringify(this.proxy[apiRoute[0]])
            })
            // .then(obj => console.log(obj))
        }
    }

    onChange(e) {
        this.formInputState = { ...this.formInputState, [e.target.name]: e.target.value };
    }

	async signIn() {
	    try {
	        user = await Auth.signIn('reblevins', 'Jolanda_1');
	        if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
	            await Auth.completeNewPassword(
	                user,               // the Cognito User Object
	                'Jolanda_1'
	            ).then(user => {
	                // at this time the user is logged in if no MFA required
	                console.log(user);
	            }).catch(e => {
	                console.log(e);
	            });
	        } else {
	            // other situations
	        }
	        await seedBlogPosts();
	        getBlogPosts();
	    } catch (err) { console.log({ err }); }
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
			// console.log(this.router.routerElement);
		}
		if (model !== 'undefined') {
            this.getComponentData(model).then(async (data) => {
    			this.controllers[model] = {
    				data,
    				elements: {}
    			}
                this.render({ model, parentNode: this.router.routerElement }).then(() => {
                    this.renderLists({ model, parentNode: this.router.routerElement }).then(() => {
                        // setTimeout(() => {
                        // console.log(model, this.controllers[model]);
                            this.assignProxy(model)
                        // }, 5000)
                    })
                })
    		})
        }
    }

	render(options) {
        return new Promise((resolve, reject) => {
            var { model, parentNode, binding = null } = options
            var { data = null } = this.controllers[model]

            // childNodes.forEach(node => {
            // var childNodes = parentNode.querySelectorAll('*')
            var childNodes = parentNode.childNodes

            let promises = []
            for (let i = 0; i < childNodes.length; i++) {
                promises[i] = new Promise(async (resolve, reject) => {

                    // let node = childNodes.item(i).cloneNode(true)
                    let node = childNodes.item(i)
        			if (node.nodeType === 3 && !parentNode.hasAttribute('list')) {
                        await this.getTextNodes({ model, parentNode, node })
        			} else if (node.nodeType === 1 && !parentNode.hasAttribute('list')) {
        				switch (node.tagName.toLowerCase()) {
        					case 'input':
        						if (node.getAttribute('model')) {
        							await this.getInputs({ model, parentNode, node, binding })
        						}
        						break;
        					default:
        						break;
        				}
        			}

                    if (node.childNodes.length > 0 && !parentNode.hasAttribute('list')) {
                        await this.render({ model, parentNode: node })
                    }
                    resolve()
                })
            }
            Promise.all(promises).then(() => {
                resolve();
            })
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
                        let listElement = document.createElement(node.tagName.toLowerCase());
                        let attributes = [ 'class', 'hide-if', 'show-if' ]
                        // if (node.hasAttributes()) {
                        //     await attributes.forEach((attr, i) => {
                        //         if (node.getAttribute(attr)) listElement.setAttribute(node.attributes[attr].name, node.attributes[attr].value)
                        //     });
                        // }
                        if (node.getAttribute('class')) listElement.setAttribute('class', node.getAttribute('class'))
                        let binding = `${localModel}[${index}]`
                        listElement.setAttribute('model', binding)
                        if (node.hasAttribute('hide-if')) {
                            let boundValue = node.getAttribute('hide-if')
                            listElement.setAttribute('hide-if', `${binding}.${boundValue}`)
                        }
                        if (node.hasAttribute('show-if')) {
                            let boundValue = node.getAttribute('show-if')
                            listElement.setAttribute('show-if', `${binding}.${boundValue}`)
                        }
                        listElement.innerHTML = node.innerHTML
                        if (node.parentNode)
                            node.parentNode.appendChild(listElement)

                        await this.getTextNodes({ model, parentNode: listElement, node: listElement, binding })
                        await this.showHide({ model, node: listElement, data: itemData })
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

	getTextNodes(options) {
        return new Promise(async (resolve, reject) => {
            var { model, parentNode = null, node, binding = null } = options
            var { data = null } = this.controllers[model]
    		var localModel, boundValue
            await Array.prototype.slice.call(parentNode.getElementsByTagName('simpel-link')).map(link => {
                // console.log(link, parentNode, binding);
    			// First check if the parent node is a list that hasn't been rendered yet
    			if (!link.parentNode.hasAttribute('list')) {
    	            var route = link.getAttribute('route')
    	            var textNodes = route.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
    	            if (textNodes && textNodes.length > 0) {
    	                textNodes.forEach((node, i) => {
    	                    var boundValue = node.replace(/(\{\{)\s*|\s*(\}\})/gi, '')
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
    			let div = document.createElement("div");
                simpelTextElement.parentNode.replaceChild(div, simpelTextElement)
                div.outerHTML = simpelTextElement.innerHTML
    			this.controllers[model].elements[boundValue].elements.push(div);
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

            var localModel = node.getAttribute('model');
            if (localModel.indexOf('[') == -1) {
                var boundValue = (binding) ? `${binding}.${localModel}` : localModel
                // console.log(node.parentNode, boundValue);

                let dataPoint = _.get(data, boundValue)
                if (parentNode.tagName == 'LI') console.log(node);

                // console.log(dataPoint);
                if (node.getAttribute('type') == 'checkbox' && dataPoint === true) {
                    node.setAttribute('checked', 'checked')
                    node.value = localModel
                } else {
                    node.value = dataPoint
                }
                node.setAttribute('model', boundValue)

                if (!this.controllers[model].elements[boundValue]) {
                    this.controllers[model].elements[`${boundValue}`] = {
                        elements: [],
                        instances: [],
                        hide: [],
                        show: []
                    };
                }
                this.controllers[model].elements[boundValue].elements.push(node);
            }
            resolve()
        }).catch(err => {
            console.log(err);
            reject(err)
        })
	}
	// getInputs(options) {
    //     return new Promise(async (resolve, reject) => {
    //         var { model, parentNode = null, node, binding = null } = options
    //         var { data = null } = this.controllers[model]
    //         var childNodes = parentNode.querySelectorAll('input')
    //         // console.log(childNodes);
    //         let promises = []
    //         for (let i = 0; i < childNodes.length; i++) {
    //             promises[i] = new Promise((resolve, reject) => {
    //                 let element = childNodes.item(i)
    //                 // let element = key
    // 				var localModel = element.getAttribute('model');
    //                 if (localModel.indexOf('[') == -1) {
    //     				var boundValue = (binding) ? `${binding}.${localModel}` : localModel
    //                     // console.log(element.parentNode, boundValue);
    //
    //     				let dataPoint = _.get(data, boundValue)
    //     				// console.log(dataPoint);
    //     				if (element.getAttribute('type') == 'checkbox' && dataPoint === true) {
    //     					element.setAttribute('checked', 'checked')
    //     					element.value = localModel
    //     				} else {
    //     					element.value = dataPoint
    //     				}
    //     				element.setAttribute('model', boundValue)
    //
    //     				if (!this.controllers[model].elements[boundValue]) {
    //     					this.controllers[model].elements[`${boundValue}`] = {
    //     						elements: [],
    //     						instances: [],
    //     						hide: [],
    //     						show: []
    //     					};
    //     				}
    //     				this.controllers[model].elements[boundValue].elements.push(element);
    //                 }
    //                 resolve()
    //             })
    // 		}
    //         Promise.all(promises).then(() => {
    //             resolve()
    //         })
    //     }).catch(err => {
    //         console.log(err);
    //         reject(err)
    //     })
	// }

    showHide(options) {
        var { model, node } = options
        var { data = null } = this.controllers[model]
        return new Promise((resolve, reject) => {
            if (node.hasAttribute('hide-if') && !node.hasAttribute('list')) {
                console.log(node);
                let boundValue = node.getAttribute('hide-if')
                console.log(boundValue);
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
                    // node.style.display = 'none';
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
                    // node.style.display = 'none';
                    if (node.parentNode) {
                        node.parentNode.replaceChild(hidden, node)
                    } else {
                        // console.log("node", node);
                    }
                    // element.parentNode.removeChild(element)
                }
            }
            resolve()
        })
    }

    async getAllPosts() {
        return new Promise(async (resolve, reject) => {
            try {
                let response = await API.get(this.apiName, '/posts')
                resolve(response);
            } catch (err) {
                reject(err);
            }
        });
    }

    getComponentData(tag) {
        return new Promise(async (resolve, reject) => {
            if (tag === 'undefined') reject('Error')
            try {
                let response = await API.get(this.apiName, `/${tag}`)
                console.log(response);
                let returnData = {};
                if (Array.isArray(response)) {
                    returnData[tag] = response
                } else {
                    returnData = response
                }
                resolve(returnData)
            } catch (err) {
                reject(err)
            }
        })
    }

    assignProxy(model) {
        // console.log(JSON.parse(JSON.stringify(this.controllers[model].elements)));
		var controller = this.controllers[model]
        // Update DOM element bound when controller property is set
        let proxyHandler = {
            set: (target, prop, value, receiver) => {
				// console.log(prop, value);
                var bind = _.get(this.controllers[model].elements, prop)
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
        // console.log(this.controllers[model]);
        this.addListeners({ model, proxy: this.proxy })

        // Fill proxy with model data
        // and return proxy, not the data!
        Object.assign(this.proxy, this.controllers[model].data);
    }

    addListeners(options) {
        var { model, proxy, parent = null } = options
        for (let key in this.controllers[model].elements) {
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
