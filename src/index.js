import { Simpel } from '../simpel.js';

var appTemplate = require('./App.html');

new Simpel({
    template: appTemplate,
    api: 'https://jsonplaceholder.typicode.com'
}).init()

// init({
//     template: appTemplate,
//     data: {
//         title: 'Simpel',
//         hard: {
//             one: 'three',
//             two: 'four'
//         },
//         more: 'More',
//         todos: [
//             'one',
//             'two'
//         ]
//     }
// });
