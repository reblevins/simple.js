const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        app: './src/index.js',
        // simpel: './simpel.js'
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist',
    },
    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new HtmlWebpackPlugin({
            title: 'Output Management',
        }),
    ],
    module: {
        rules: [
            { test: /\.hbs$/, loader: "handlebars-loader" },
            { test: /\.html$/, loader: "html-loader" }
        ]
    },
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    }
};
