var express = require('express');
var path = require('path');
var app = express();
var port = process.env.PORT || 5000;
var host = process.env.HOST || 'localhost';
var server = require('substance/util/server');
var CollabHub = require('substance/util/CollabHub');
var Storage = require('./hub/ChangesStore');
var http = require('http');
var WebSocketServer = require('ws').Server;
var api = require('./api');
var knexConfig = require('./knexfile');

var store = new Storage({config: knexConfig});

// Serve app in development mode
// ----------------

server.serveStyles(app, '/app.css', path.join(__dirname, 'notepad', 'app.scss'));
server.serveJS(app, '/app.js', path.join(__dirname, 'notepad', 'app.js'));
var config = { port: port, host: host };
server.serveHTML(app, '/', path.join(__dirname, 'notepad', 'index.html'), config);

app.use(express.static(path.join(__dirname, 'notepad')));
app.use('/fonts', express.static(path.join(__dirname, 'node_modules/font-awesome/fonts')));

// Connect http api
app.use('/api', api(store));

// Connect Substance
// ----------------

var httpServer = http.createServer();
var wss = new WebSocketServer({ server: httpServer });

var hub = new CollabHub(wss, store);

// Delegate http requests to express app
httpServer.on('request', app);

httpServer.listen(port, function() { console.log('Listening on ' + httpServer.address().port); });

// Export app for requiring in test files
module.exports = app;