import { Simpel } from '../simpel.js';
import { SimpelRouter } from '../simpel-router.js'

var App = require('./App.html');

new Simpel({
    template: App,
    api: 'https://jsonplaceholder.typicode.com',
    router: new SimpelRouter()
}).init()
