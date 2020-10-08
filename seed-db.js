import pkg from 'aws-amplify';
const { Amplify, API } = pkg;

import { createBlog, updateBlog, deleteBlog, createPost, updatePost, deletePost, createComment, updateComment, deleteComment} from './src/graphql/mutations.js';
import { listBlogs } from './src/graphql/queries.js';
// import creds from './src/aws-exports.js';
// const { apiCreds } = creds;
import aws_exports from './src/aws-exports.js';

Amplify.configure(aws_exports);

// const posts = [
//     {
//         linkName: 'lorem-ipsum',
//         title: 'Lorem ipsum',
//         content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
//     },
//     {
//         linkName: 'dolor-sit',
//         title: 'Dolor sit',
//         content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
//     },
//     {
//         linkName: 'consectetur-adipisicing',
//         title: 'Consectetur adipisicing',
//         content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
//     }
// ];
//

async function submitNewBlog() {
    try {
        await API.graphql({
            query: createBlog,
            variables: {
                input: {
                    id: 'simpel-cms',
                    name: 'Simpel CMS'
                }
            }
        })
        console.log('Done');
    } catch(err) {
        console.log(err);
    }
}

async function getBlogInfo() {
    try {
        const blogs = await API.graphql({
            query: listBlogs
        })
        console.dir(blogs.data.listBlogs.items);
    } catch(err) {
        console.log(err);
    }
}

getBlogInfo();
// posts.forEach(async (post, i) => {
//     const response = await fetch('https://unfspj5l5h.execute-api.us-east-2.amazonaws.com/dev/posts', {
//         method: 'POST', // *GET, POST, PUT, DELETE, etc.
//         // mode: 'cors', // no-cors, *cors, same-origin
//         // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
//         // credentials: 'same-origin', // include, *same-origin, omit
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         redirect: 'follow', // manual, *follow, error
//         // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
//         body: JSON.stringify(post) // body data type must match "Content-Type" header
//     });
//     console.log(response.json()); // parses JSON response into native JavaScript objects
// });
