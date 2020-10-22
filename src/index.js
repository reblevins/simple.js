import { Simpel } from './simpel.js';
import { SimpelRouter } from './simpel-router.js'
import { Auth, Amplify, API } from 'aws-amplify';
import './style.scss';

import aws_exports from './aws-exports.js';
Amplify.configure(aws_exports);

var pages = [
    {
        objectType: 'pages',
        linkName: 'home',
        title: 'Home',
        published: true,
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    },
    {
        objectType: 'pages',
        linkName: 'about',
        title: 'About',
        published: true,
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    },
    {
        objectType: 'pages',
        linkName: 'router',
        title: 'Simpel Router',
        published: true,
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    }
]

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

async function getPages() {
    // await pages.forEach(async (page, i) => {
        let response = await API.get('SimpelCMSAPI', '/pages/home')
        console.log(response);
    // });

}

// getPages()

var App = require('./App.html');

new Simpel({
    template: App,
    apiName: 'SimpelCMSAPI',
    apiConfig: aws_exports,
    router: new SimpelRouter({
        rootResource: 'pages',
        defaultRoute: '/pages/home'
    })
}).init()
