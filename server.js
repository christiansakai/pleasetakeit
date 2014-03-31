'use strict';

/**
 * Module dependencies.
 */
var express = require('express'),
    fs = require('fs'),
    passport = require('passport'),
    nodemailer = require('nodemailer'),
    logger = require('mean-logger');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Load configurations
// Set the node environment variable if not set before
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Initializing system variables
var config = require('./config/config'),
    mongoose = require('mongoose');

// Bootstrap db connection
var db = mongoose.connect(config.db);

// Bootstrap models
var models_path = __dirname + '/app/models';
var walk = function(path) {
    fs.readdirSync(path).forEach(function(file) {
        var newPath = path + '/' + file;
        var stat = fs.statSync(newPath);
        if (stat.isFile()) {
            if (/(.*)\.(js$|coffee$)/.test(file)) {
                require(newPath);
            }
        } else if (stat.isDirectory()) {
            walk(newPath);
        }
    });
};
walk(models_path);

// Bootstrap passport config
require('./config/passport')(passport);

var app = express();
// Socket.io configuration
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// Express settings
require('./config/express')(app, passport, db);

// Bootstrap routes
var routes_path = __dirname + '/app/routes';
var walk = function(path) {
    fs.readdirSync(path).forEach(function(file) {
        var newPath = path + '/' + file;
        var stat = fs.statSync(newPath);
        if (stat.isFile()) {
            if (/(.*)\.(js$|coffee$)/.test(file)) {
                require(newPath)(app, passport);
            }
        // We skip the app/routes/middlewares directory as it is meant to be
        // used and shared by routes as further middlewares and is not a
        // route by itself
        } else if (stat.isDirectory() && file !== 'middlewares') {
            walk(newPath);
        }
    });
};
walk(routes_path);

// // Server side chatting
// io.sockets.on('connection', function(socket){
//     socket.on('send message', function(data){
//         io.sockets.emit('new message', data);
//     })
// })


// var smtpTransport = nodemailer.createTransport("SMTP",{
//    service: "Gmail",  // sets automatically host, port and connection security settings
//    auth: {
//        user: "pleasetakeitapp@gmail.com",
//        pass: "fullstack14"
//    }
// });

// smtpTransport.sendMail({  //email options
//    from: "PleaseTakeIt <pleasetakeitapp@gmail.com>", // sender address.  Must be the same as authenticated user if using Gmail.
//    to: "Kelvin Yu <kyu1012@gmail.com>", // receiver
//    subject: "Congrats, your item was purchased!", // subject
//    text: "Email Example with nodemailer" // body
// }, function(error, response){  //callback
//    if(error){
//        console.log(error);
//    }else{
//        console.log("Message sent: " + response.message);
//    }

//    smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.

// });





// Start the app by listening on <port>
var port = process.env.PORT || config.port;
// app.listen(port);
// console.log('Express app started on port ' + port);
server.listen(port, function(){
  console.log('Express server listening on port ' + port);
});

// Initializing logger
logger.init(app, passport, mongoose);

// Expose app
exports = module.exports = app;




