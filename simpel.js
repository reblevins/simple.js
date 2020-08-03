import _ from 'lodash';
const path = require('path');
const Handlebars = require("handlebars");

export const init = ({ template, data = {}, methods = {}}) => {
    // _.mapKeys(data, function(value, key) {
    //     // return key + value;
    //     console.log(key);
    // })
    var appDiv = document.createElement('div');
    var templateDiv = document.createElement('div');
    appDiv.innerHTML = template;
    templateDiv.style.display = "none"
    document.body.appendChild(appDiv);

    var index = 0;
    var bindings = {};
    var end = template.length;
    var templateHTML = appDiv.innerHTML
    var textNodes = templateHTML.match(/\{\{((?:.|\r?\n)+?)\}\}?/g);
    textNodes.forEach((node, i) => {
        var boundValue = node.replace(/(\{\{)\s*|\s*(\}\})/gi, '');
        appDiv.innerHTML = appDiv.innerHTML.replace(node, `<simpel-text model="${boundValue}">${_.get(data, boundValue)}</simpel-text>`)
    });

    const name = "AppController"
    function AppController() {
        for (let key in data) {
            this[key] = data[key]
        }
    }

    for (let key in methods) {
        window[key] = methods[key]
    }

    // Store controller constructor
    var controllers = {};
    controllers[name] = {
        factory: AppController,
        instances: []
    };

    // Look for elements using the controller
    // var element = document.querySelector('[controller=' + name + ']');
    // if (!element){
    //     return;
    // }

    // Create a new instance and save it
    var ctrl = new controllers[name].factory();
    controllers[name].instances.push(ctrl);

    Array.prototype.slice.call(appDiv.querySelectorAll('[list]'))
    .map(element => {
        var boundValue = element.getAttribute('list');
        var listElement;
        if (Array.isArray(data[boundValue])) {
            data[boundValue].forEach(listElement => {

            })
        }
    })

    Array.prototype.slice.call(appDiv.querySelectorAll('[model]'))
    .map(function (element) {
        var path = element.getAttribute('model');
        if (element.tagName.toLowerCase() == 'simpel-text') {
            var textNode = document.createTextNode(element.innerHTML)
            var parentDiv = element.parentNode
            parentDiv.replaceChild(textNode, element)
            element = textNode
        }
        console.log(path);
        var boundValue = path
        if (!bindings[path]) {
            bindings[path] = {
                boundValue: boundValue,
                elements: []
            }
        }
        bindings[path].elements.push(element);
        // appDiv.appendChild(element);
    });
    console.log(bindings);

    // Update DOM element bound when controller property is set
    let proxyHandler = {
        set: function (target, prop, value, receiver) {
            // if (typeof ctrl[prop] === 'object') {
            //     return new Proxy(ctrl[prop], proxyHandler)
            // }
            console.log(prop);
            var bind = _.get(bindings, prop);
            if (bind) {
                bind.elements.forEach(function (element) {
                    // console.log(element);
                    if (element.nodeType == 3) {
                        console.log(receiver);
                        element.textContent = value
                    } else if (element.tagName.toLowerCase() == 'input') {
                        element.value = value;
                        element.setAttribute('value', value);
                    } else {
                        element.innerHTML = value

                    }
                });
            }
            // appDiv.childNodes[0].textContent = value
            return Reflect.set(target, prop, value);
        }
    }
    var proxy = new Proxy (ctrl, proxyHandler);
    // console.log(proxy);
    // Listen for DOM element update to set the controller property
    addListeners(proxy, bindings)

    // Fill proxy with ctrl properties
    // and return proxy, not the ctrl!
    Object.assign(proxy, ctrl);
    return proxy;
}

const flattenObject = (obj, parent = null) => {
  const flattened = {}

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
        console.log(key);
      Object.assign(flattened, flattenObject(obj[key], key))
    } else {
        var newKey = (parent) ? parent + '.' + key : key
      flattened[newKey] = obj[key]
    }
  })

  return flattened
}

function addListeners(proxy, bindings, parent = null) {
    Object.keys(bindings).forEach(function(boundValue) {
        var bind = bindings[boundValue]
        if (!bindings[boundValue].boundValue) {
            addListeners(proxy, bindings[boundValue], boundValue)
            return
        }
        bind.elements.forEach(function (element) {
            element.addEventListener('input', function (event) {
                proxy[bind.boundValue] = event.target.value;
            });
        })
    });
}

function handleArray(element, data) {
    let innerElements = []
    element.childNodes.forEach(node => {
        console.log(node);
        switch (node.nodeName.toLowerCase()) {
            case "#text":
                let tags = node.wholeText.match(/(\{\{\s*([a-z\.\s]*)\s*\}\})/gi);
                console.log(tags);
                break;
            case "input":
                break;
            case "textarea":
                break;
            default:

        }
    })
    var innerHTML = element.innerHTML
    element.innerHTML = ""
    // We're going to assume all the data is the same type
    switch (Object.prototype.toString.call(data[0])) {
        case '[object String]':
            console.log('string');
            break;
        case '[object Object]':
            var html = '';
            // console.log(element.getElementsByTagName('*'));
            let tags = innerHTML.match(/(\{\{\s*([a-z\.\s]*)\s*\}\})/gi);
            console.log(tags);
            if (tags && tags.length > 0) {
                let keys = tags.map(element => element.replace(/(\{\{)\s*|\s*(\}\})/gi, '').split(':'));
                data.forEach(arrayElement => {
                    var listElement = document.createElement(element.tagName)
                    Object.keys(element.attributes).forEach(key => {
                        if (element.attributes[key].name != "id")
                        listElement.setAttribute(element.attributes[key].name, element.attributes[key].value)
                    })
                    // listElement.innerHTML = innerHTML
                    keys.forEach((value, index) => {
                        let element = replaceTag(tags[index], arrayElement, value);
                        console.log(arrayElement);
                        listElement.append(element)
                        // if (!bindings[value]) {
                        //     bindings[value] = {
                        //         boundValue: value,
                        //         elements: []
                        //     }
                        // }
                        // bindings[value].elements.push(element);
                    })
                    html += listElement.outerHTML;
                })
                element.outerHTML = html;
            }
            break;
        default:
            console.log('nuttin');
    }
}

function replaceTag(tag, arrayElement, value) {
    console.log(tag);
    switch (Object.prototype.toString.call(arrayElement[value[0]])) {
        case '[object String]':
            return document.createTextNode(arrayElement[value[0]])
            break;
        case '[object Boolean]':
            console.log(value);
            let input = document.createElement('input');
            let uid = new ShortUniqueId();
            input.type = value[1];
            input.name = value[0] + '-' + value[1] + '-' + uid()
            if (arrayElement[value[0]])
                input.setAttribute("checked", "checked")
            return input
            break;
    }

}

// let allInputs = document.getElementsByTagName('input');
// for (let key in allInputs) {
//     if (allInputs.hasOwnProperty(key)) {
//         console.log(key);
//         allInputs[key].addEventListener("change", handleCheckboxChange);
//     }
// }
function handleCheckboxChange(event) {
    console.log(event);
}

class SimpleText extends HTMLElement {
    constructor() {
        super()

        // Create a shadow root
        const shadow = this.attachShadow({mode: 'open'});
        console.log(this.innerHTML);

        const textNode = document.createTextNode(this.innerHTML)
        shadow.appendChild(textNode)
    }
}
customElements.define('simple-text', SimpleText);

// class SimpleList extends HTMLElement {
//     constructor() {
//         super()
//
//         // Create a shadow root
//         const shadow = this.attachShadow({mode: 'open'});
//         console.log(this.innerHTML);
//
//         var tag = this.getAttribute('tag') || 'li'
//         var listElement = document.createElement(tag)
//         shadow.appendChild(listElement)
//     }
// }
// customElements.define('simple-list', SimpleList);
