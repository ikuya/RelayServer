
/**
 * MODULE DEPENDENCIES
 */

var app = require('../app');
var fs = require('fs');
var util = require('util');
var path = require('path');
var url = require('url');
var formidable = require('formidable');
var exec = require('child_process').exec;

/**
 * CONSTANTS
 */

const IMAGE_DIR = path.join('public', 'images');
const THUMBNAIL_DIR = path.join(IMAGE_DIR, 'thumbnail');

/*
 * REQUEST HANDLING
 */

exports.chat = function(req, res) {
    res.render('chat');
};

exports.status = function(req, res) {
    var ips = app.wss.ips;
    res.render('status', {
        ips: ips
    });
};

exports.list = function(req, res) {
    var Photo = require('../model/photo');
    var query = Photo.find({});
    query.sort('-date').exec(function(err, docs) {
        if (err) {
            console.error(err);
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
        } else {
            // remove duplicates from a image list
            var photos = [];
            var unique = {};
            docs.forEach(function(item) {
                if (!unique[item.name]) {
                    photos.push(item);
                    unique[item.name] = item;
                }
            });
            // show list page
            res.render('list', {
                photos: photos
            });
        }
    });
};

exports.screenshot = function(req, res) {
    var url_parts = url.parse(req.url, true);
    var imageName = url_parts.query['name'];
    fs.readFile(path.join('public', 'images', 'screenshot', imageName),
                function(err, data) {
        if (err) console.error(err);
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(data, 'binary');
    });
}

exports.thumbnail = function(req, res) {
    var url_parts = url.parse(req.url, true);
    var imageName = url_parts.query['name'];
    var thumbnail = "th_" + url_parts.query['name'];
    fs.readFile(path.join(THUMBNAIL_DIR, thumbnail), function(err, data) {
        if (err) {
            console.log("no thumbnail of %s", imageName);
            fs.readFile(path.join(IMAGE_DIR, imageName), function(err, image) {
                if (err) console.error(err);
                res.writeHead(200, { "Content-Type": "image/jpeg" });
                res.end(image, 'binary');
            });
        } else {
            res.writeHead(200, { "Content-Type": "image/jpeg" });
            res.end(data, 'binary');
        }
    });
}

exports.rawImage = function(req, res) {
    var url_parts = url.parse(req.url, true);
    var imageName = url_parts.query['name'];
    fs.readFile(path.join(IMAGE_DIR, imageName), function(err, data) {
        if (err) console.error(err);
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(data, 'binary');
    });
}

exports.connectivity_test = function(req, res) {
    res.writeHead(200, { "Content-Type": "plain/text" });
    res.end("It works.");
};

exports.upload_photo = function(req, res) {
    // save uploaded image
    function saveImage(uploadedPath, filename) {
        var imageDst = path.join(IMAGE_DIR, filename);
        fs.rename(uploadedPath, imageDst, function(err) {
            if (err) {
                console.error(err);
            } else {
                console.log('image: %s', imageDst);
                // create thumbnail
                createThumbnail(imageDst, filename);
            }
        });
    }

    // create a thumbnail file
    function createThumbnail(imagePath, filename) {
        var thumbDst = path.join(THUMBNAIL_DIR, 'th_' + filename);
        exec(path.join(__dirname, 'PhotoResize.exe') + ' -o -w250 ' + imagePath,
             function(err, stdout, stderr) {
            if (err) {
                console.error(err);
            } else if (stderr) {
                console.error(stderr);
            } else {
                var imageName = (imagePath.lastIndexOf('.') > 0) ? imagePath.substring(0, imagePath.lastIndexOf('.')) : imagePath;
                fs.rename(imageName + '-W250.jpg', thumbDst, function(err) {
                    console.log('thumbnail: %s', thumbDst);
                    // create new recoad for mongodb
                    storeRecord(filename);
                });
            }
        });
    }

    // insert a new record into mongodb
    function storeRecord(filename) {
        // new DB record
        var Photo = require('../model/photo');
        var photo = new Photo();
        photo.name = filename;
        photo.file = path.join(IMAGE_DIR, filename);
        photo.date = new Date();
        photo.save(function(err) {
            if (err) console.error(err);
            // console.log('stored image info: %s', filename);
            notify(filename);
        });
    }

    // emit a notification event
    function notify(filename) {
        app.io.sockets.emit('received-new-photo', { name: filename });
    }

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if (err) {
            console.error(err);
            res.writeHead(500, { "Content-Type": "plain/text" });
            res.end("Internal Server Error.");
        } else {
            if (files.upfile !== undefined && files.upfile.size != 0) {
                var uploadedPath = files.upfile.path;
                var filename = files.upfile.name;
                fs.readFile(uploadedPath, function(err, data) {
                    if (err) {
                        console.error(err);
                    } else {
                        // broadcast image data to all WebSocket clients
                        app.wss.broadcast(data);
                        console.log("sent image: %s", filename);
                        // save the image file
                        saveImage(uploadedPath, filename);
                    }
                });
                res.writeHead(200, { "Content-Type": "application/json"});
                res.end(util.inspect(files));
            } else {
                console.error("received empty file.");
                res.writeHead(400);
                res.end();
            }
        }
    });
};
