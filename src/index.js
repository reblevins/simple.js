import { Simpel } from './simpel.js';
import { SimpelRouter } from './simpel-router.js'
import './style.scss';

import aws_exports from './aws-exports.js';

var App = require('./App.html');

new Simpel({
    template: App,
    apiName: 'SimpleCMSAPI',
    apiConfig: aws_exports,
    router: new SimpelRouter()
}).init()
