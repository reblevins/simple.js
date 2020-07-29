import {init} from '../simpel.js';

var appTemplate = require('./App.html');

init({ template: appTemplate, data: { title: 'Simpel', more: 'More' }});
