import {init} from '../simpel.js';

var appTemplate = require('./App.html');

init({
    template: appTemplate,
    data: {
        title: 'Simpel',
        hard: {
            one: 'three',
            two: 'four'
        },
        more: 'More',
        todos: [
            'one',
            'two'
        ]
    }
});
