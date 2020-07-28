import _ from 'lodash';
const path = require('path');
const Handlebars = require("handlebars");

export const init = (data) => {
    console.log('Simpel!');

    var appTemplate = require('./src/App.hbs');
    console.log(data);
    var div = document.createElement('div');
    div.innerHTML = appTemplate(data);
    document.body.appendChild(div);
}
    // var controllers = {};
    // var debug = document.getElementById('debug')
    // var addController = function (name, constructor) {
    //     // Store controller constructor
    //     controllers[name] = {
    //         factory: constructor,
    //         instances: []
    //     };
    //
    //     // Look for elements using the controller
    //     var element = document.querySelector('[controller=' + name + ']');
    //     if (!element){
    //         return;
    //     }
    //
    //     // Create a new instance and save it
    //     var ctrl = new controllers[name].factory();
    //     controllers[name].instances.push(ctrl);
    //
    //     // console.log(controllers);
    //     // Get elements bound to properties
    //     var bindings = {};
    //     Array.prototype.slice.call(element.querySelectorAll('[model]'))
    //     .map(function (element) {
    //         var boundValue = element.getAttribute('model');
    //
    //         if (!bindings[boundValue]) {
    //             bindings[boundValue] = {
    //                 boundValue: boundValue,
    //                 elements: []
    //             }
    //         }
    //         bindings[boundValue].elements.push(element);
    //     });
    //
    //     // Update DOM element bound when controller property is set
    //     var proxy = new Proxy (ctrl, {
    //         set: function (target, prop, value) {
    //             var bind = bindings[prop];
    //             if (bind) {
    //                 // console.log(value);
    //                 bind.elements.forEach(function (element) {
    //                     console.log(element.tagName.toLowerCase());
    //                     switch (element.tagName.toLowerCase()) {
    //                         case 'textarea':
    //                         case 'input':
    //                             element.value = JSON.stringify(value);
    //                             element.setAttribute('value', JSON.stringify(value));
    //                             break;
    //                         default:
    //                             switch (Object.prototype.toString.call(value)) {
    //                                 case '[object Array]':
    //                                     handleArray(element, value);
    //                                     break;
    //                                 case '[object Object]':
    //                                     break;
    //                                 default:
    //                                     console.log('nuttin');
    //                             }
    //                             break;
    //                     }
    //                 });
    //             }
    //             return Reflect.set(target, prop, value);
    //         }
    //     });
    //
    //     // Listen for DOM element update to set the controller property
    //     Object.keys(bindings).forEach(function (boundValue) {
    //         var bind = bindings[boundValue];
    //         // console.log(bind);
    //         bind.elements.forEach(function (element) {
    //             element.addEventListener('input', function (event) {
    //                 console.log(event);
    //                 proxy[bind.boundValue] = event.target.value;
    //             });
    //         })
    //     });
    //
    //     // Fill proxy with ctrl properties
    //     // and return proxy, not the ctrl!
    //     Object.assign(proxy, ctrl);
    //     return proxy;
    // }
    //
    // // Export framework in window
    // this.simpel = {
    //     controller: addController
    // }
// })();
// var simpelApp = document.getElementById('simpel');

// if (simpelApp && data && typeof data === 'object') {
//     var elements = simpelApp.getElementsByTagName('*');
//     for (let key in elements) {
//         if (elements.hasOwnProperty(key)) {
//             let id = elements[key].id
//             if (data[id]) {
                // switch (Object.prototype.toString.call(data[id])) {
                //     case '[object Array]':
                //     handleArray(elements[key], data[id]);
                //     break;
                //     case '[object Object]':
                //     break;
                //     default:
                //     console.log('nuttin');
                // }
//             }
//         }
//     }
// }

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
