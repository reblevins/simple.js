import { Simpel } from '../simpel.js';

var App = require('./App.html');

new Simpel({
    template: App,
    api: 'https://jsonplaceholder.typicode.com'
}).init()
