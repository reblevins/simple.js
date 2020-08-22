import { Simpel } from '../simpel.js';
import { SimpelRouter } from '../simpel-router.js'
import './style.scss';

var App = require('./App.html');

new Simpel({
    template: App,
    api: 'https://1hc6wchzzd.execute-api.us-east-2.amazonaws.com',
    router: new SimpelRouter()
}).init()
