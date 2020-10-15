import pkg from 'aws-amplify';
const { Auth, API } = pkg;

import aws_exports from './aws-exports.js';

Amplify.configure(aws_exports);

const posts = [
    {
        id: 'lorem-ipsum',
        title: 'Lorem ipsum',
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    },
    {
        id: 'dolor-sit',
        title: 'Dolor sit',
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    },
    {
        id: 'consectetur-adipisicing',
        title: 'Consectetur adipisicing',
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    }
];


async function signIn() {
    try {
        await Auth.signIn('reblevins', 'jolanda1');
        /* Once the user successfully signs in, update the form state to show the signed in state */
        seedBlogPosts();
    } catch (err) { console.log({ err }); }
}

async function seedBlogPosts() {
    await posts.forEach(async (post, i) => {
        try {
            await API.graphql({
                query: createPost,
                variables: {
                    input: {
                        blogID: 'simpel-cms',
                        ...post
                    }
                }
            })
            console.log('Done');
        } catch(err) {
            console.log(err);
        }
    });
}

// seedBlogPosts();
