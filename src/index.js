import {init} from '../simpel.js';

var appTemplate = require('./App.html');

init({
    template: appTemplate,
    data: {
        title: 'Simpel',
        hard: {
            one: 'one',
            two: 'two'
        },
        more: 'More',
        todos: [
            'one',
            'two'
        ]
    }
});
