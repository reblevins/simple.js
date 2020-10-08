const fetch = require('node-fetch');

fetch('https://oh1j84ptq6.execute-api.us-east-2.amazonaws.com/dev/post').then(data => {
    console.log(data);
    // return data.body.json()
})
// .then(response => {
//     console.log(response);
// })
