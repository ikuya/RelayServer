var mongoose = require('mongoose');
var app = require('../app');

var url = 'mongodb://localhost/' + app.db;
mongoose.connect(url);

var Schema = mongoose.Schema;
var Photo = mongoose.model('photo', new Schema({
    name: String,
    file: String,
    date: Date
}));

module.exports = Photo;
