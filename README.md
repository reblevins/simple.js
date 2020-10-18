# Simpel.js

*The easy JavaScript framework for people who don't want to code*

## Goals
- Implicit controllers
- Minimal JS coding
- Automatic route and component discovery
- Works with [AWS Amplify REST APIs](https://docs.amplify.aws/guides/api-rest/node-api/q/platform/js) out-of-the-box
- Automatic endpoint discovery

## Ok, but let me see some examples
*Ok, ok, here you go*

### Webpack example (so far the only way that works)
src/index.js

```
import { Simpel } from 'simpel';
import aws_exports from './aws-exports.js'; // Your Amplify API config file

var App = require('./App.html');

new Simpel({
    template: App,
    apiName: 'YourAmplifyAPIName',
    apiConfig: aws_exports,
    router: new SimpelRouter()
}).init();
```

And assuming a Post model that looks like this:
```
{
    linkName: any,
    title: any,
    content: *any
}
```

An an API endpoint that looks like this:
https://my-api-url.com/posts

Your src/App.html could look like this:
src/App.html
```
<h1>Ma Posts</h1>
<article list="posts">
	<h2>{{ title }}</h2>
	{{ content }}
</article>
```

## To-do
- [x] Implement router
- [ ] Two-way data-binding (almost there)
- [ ] Make it work with AWS Amplify
- [ ] Expose for `window` for import using a `script` tag
