import { Simpel } from '../simpel.js';
import { SimpelRouter } from '../simpel-router.js'
import './style.scss';
import { Amplify, API } from 'aws-amplify';
// const { Amplify, API } = pkg;

import { createBlog, updateBlog, deleteBlog, createPost, updatePost, deletePost, createComment, updateComment, deleteComment } from './graphql/mutations.js';
// const { createBlog, updateBlog, deleteBlog, createPost, updatePost, deletePost, createComment, updateComment, deleteComment } = mutations
// import { listBlogs, listPosts } from './graphql/queries.js';
// const { listBlogs } = queries;
// import creds from './aws-exports.js';
// const { apiCreds } = creds;
import aws_exports from './aws-exports.js';

Amplify.configure(aws_exports);

const posts = [
    {
        linkName: 'dolor-sit',
        title: 'Dolor sit',
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    },
    {
        linkName: 'consectetur-adipisicing',
        title: 'Consectetur adipisicing',
        content: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'
    }
];


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

async function getAllPosts() {
    try {
        const blogs = await API.graphql({
            query: listPosts
        })
        console.dir(blogs.data.listPosts.items);
    } catch(err) {
        console.log(err);
    }
}

seedBlogPosts();

var App = require('./App.html');

new Simpel({
    template: App,
    api: 'https://1hc6wchzzd.execute-api.us-east-2.amazonaws.com',
    router: new SimpelRouter()
}).init()
