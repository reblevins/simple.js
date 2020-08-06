import { Simpel } from '../simpel.js';
import { SimpelRouter } from '../simpel-router.js'
import './style.scss';

var App = require('./App.html');

new Simpel({
    template: App,
    api: 'https://jsonplaceholder.typicode.com',
    router: new SimpelRouter()
}).init()
