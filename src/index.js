import { Simpel } from './simpel.js';
import { SimpelRouter } from './simpel-router.js'
import { Auth, Amplify, API } from 'aws-amplify';
import './style.scss';

import aws_exports from './aws-exports.js';
Amplify.configure(aws_exports);

async function signIn() {
    try {
        var user = await Auth.signIn('reblevins', 'Jolanda_1');
        if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
            await Auth.completeNewPassword(
                user,               // the Cognito User Object
                'Jolanda_1'
            ).then(user => {
                // at this time the user is logged in if no MFA required
                console.log(user);
            }).catch(e => {
                console.log(e);
            });
        } else {
            // other situations
        }
        await seedPages();
    } catch (err) { console.log({ err }); }
}

async function getPage() {
    // await pages.forEach(async (page, i) => {
        let response = await API.get('SimpleCMSAPI', '/pages/home')
        console.log(response);
    // });

}

getPage()

var App = require('./App.html');

new Simpel({
    template: App,
    apiName: 'SimpleCMSAPI',
    apiConfig: aws_exports,
    router: new SimpelRouter()
}).init()
