
/**
 * MODULE DEPENDENCIES.
 */

var express = require('express');
var routes = require('./lib/router.js');
var http = require('http');
var path = require('path');
var io = require('socket.io');
var util = require('util');
var fs = require('fs');
var validator = require('validator');

var app = express();
var server = require('http').createServer(app)

/**
 * ENVIRONMENTS
 */
var configurationFile = 'config.json';
var config = JSON.parse(fs.readFileSync(configurationFile));

app.set('port', config.port || 3000);
app.set('wss_port', config.websocket_port || 3001);
app.set('db', config.db || 'images');
app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('default'));
app.use(express.json());
app.use(express.urlencoded());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

server.listen(app.get('port'));

exports.db = app.get('db');

/**
 * SOCKET.IO
 */

var io = io.listen(server);

// Socket.IO event listeners
io.sockets.on('connection', function(socket) {
    console.log("socket.io connected");
    
    // remove photo
    socket.on('remove-photo', function(data) {
        var Photo = require('./model/photo');
        var filename = data.name;
        Photo.remove({ name : filename }, function(err){
            if (err) console.error(err);
            console.log('removed image info from db: %s', filename);
            var imagePath = path.join(__dirname, 'public', 'images');
            var filepath = path.join(imagePath, filename);
            fs.unlink(filepath, function(err) {
                if (err) console.error(err);
                console.log("removed image: %s", filepath);
            });
            var thumbPath = path.join(imagePath, 'thumbnail', 'th_' + filename);
            fs.unlink(thumbPath, function(err) {
                if (err) console.error(err);
                console.log("removed thumbnail: %s", thumbPath);
            });
        });
    });

    // send photo data to all websocket clients
    socket.on('send-photo', function(data) {
        var Photo = require('./model/photo');
        Photo.findOne({ name: data.name }, function(err, data) {
            if (err) console.error(err);
            if (data == null) {
                console.error("The photo you've selected no longer exists.");
            } else {
                fs.readFile(data.file, function(err, image) {
                    if (err) console.error(err);
                    // broadcast image data to all WebSocket clients
                    wss.broadcast(image);
                    console.log("sent image: %s", data.name);
                });
            }
        });
    });
    
    socket.on('disconnect', function() {
        io.sockets.emit('disconnected');
    });
});

exports.io = io;

/**
 * WEBSOCKET
 */

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: app.get('wss_port') });

// WebSocket event listeners
wss.ips = [];
wss.on('connection', function(ws) {
    ws.ip = ws.upgradeReq.connection.remoteAddress;
    console.log("websocket connected: %s", ws.ip);
    io.sockets.emit('ws-connected', { ip : ws.ip });

    // keep ip addresses of connecting clients
    wss.ips.push(ws.ip);
    wss.ips = wss.ips.filter(function(x, i, self) {
        return self.indexOf(x) === i;
    });
    console.log("ws clients: %s", util.inspect(wss.ips));

    // Message Listener
    ws.on('message', function(message, flags) {
        if (flags.binary) {
            var screenshotFileName = ws.ip.replace(/\./g, '-') + '.jpg';
            fs.writeFile(path.join('public', 'images', 'screenshot', screenshotFileName), flags.buffer, function(err) {
                if (err) console.error(err);
            });

            var image = new Buffer(message, 'binary').toString('base64');
            io.sockets.emit('screenshot', {
                ip : ws.ip,
                image: image
            });
        } else if (validator.isJSON(message)) {
            var status = JSON.parse(message);
            io.sockets.emit('status-update', {
                ip  : ws.ip,
                cpu : status['CPU'],
                mem : status['Memory'],
                rd  : status['Read Disk'],
                wd  : status['Write Disk']
            });
        } else {
            console.log("ws message: %s", util.inspect(message));
        }
    });

    ws.on('close', function() {
        console.log("websocket closed: %s", ws.ip);
        io.sockets.emit('ws-closed', { ip: ws.ip });
        
        var wssClients = wss.clients.map(function(x, i, self) {
            return x.upgradeReq.connection.remoteAddress;
        });
        wss.ips = wssClients.filter(function(x, i, self) {
            return self.indexOf(x) === i;
        });
        console.log("wss clients: %s", util.inspect(wss.ips));
    });
});

// send the data to all websocket clients.
wss.broadcast = function(data) {
    this.clients.forEach(function(ws) {
        ws.send(data);
    });
};
// export websocket server
exports.wss = wss;

/**
 * ROUTING
 */

app.get('/', routes.list);                            // list of received photos
app.get('/chat', routes.chat);                        // upload test
app.get('/status', routes.status);                    // machine information page
app.get('/upload-photo', routes.connectivity_test);   // connectivity test
app.post('/upload-photo', routes.upload_photo);       // receive and send image data
app.get('/thumbnail', routes.thumbnail);              // get the thumbnail image
app.get('/rawImage', routes.rawImage);                // get the image
app.get('/screenshot', routes.screenshot);            // get the screenshot image
