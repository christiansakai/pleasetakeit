'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Item = mongoose.model('Item'),
    _ = require('lodash'),
    Q = require('q'),
    request = require('request'),
    fs = require('fs'),
    AWS = require('aws-sdk');

//loading access S3 access keys
AWS.config.loadFromPath(__dirname + '/aws.json');

/**
 * Find item by id
 */
exports.item = function(req, res, next, id) {
    Item.load(id, function(err, item) {
        if (err) return next(err);
        if (!item) return next(new Error('Failed to load item ' + id));
        req.item = item;
        next();
    });
};


exports.image_upload = function(req, res) {

};
/**
 * Create an item
 */
exports.create = function(req, res) {
    var item = new Item(req.body);
    console.log("this is body", req.body);
    // console.log("the req.file is ",req.image)

    //make sure form's input field is called "image"
    var file = req.files.picture;
    var filePath = file.path;

    //upload file to s3
    fs.readFile(filePath, function(err, data) {
        if (err) { throw err; }

        var s3 = new AWS.S3({ params: {Bucket: 'PleaseTakeIt', Key: file.name }});
        s3.putObject({
            Body: data
        }, function() {
            console.log('UPLOADED');
        });
    });
    //Set file path to URL in ItemSchema (baseURL+file.name)
    item.picture = "http://s3.amazonaws.com/PleaseTakeIt/" + file.name;

    //1) Change location information into appropriate string to send to GoogleMaps API
    var itemLocation = item.address.split(" ").join("+");
    var requestString = "https://maps.googleapis.com/maps/api/geocode/json?address=" + itemLocation + "&sensor=false";

    //2) set function to call geocoding API (translates to lat/long);
    var geoCodeRequest = function(url) {
        var deferred = Q.defer();
        request.get(url, function(err, response, data) {
          if (!err) {
            var googleResponse = JSON.parse(data);
            deferred.resolve(googleResponse);
          }
          else {
            deferred.reject("There was an error! Status code: " + data.status + error);
          }
        });
        return deferred.promise;
    };

    //3) Take response and parse it for latlng information
    geoCodeRequest(requestString).then(function(data){
        console.log("are we getting here?");
        var latitude = data.results[0].geometry.location.lat;
        var longitude = data.results[0].geometry.location.lng;

        item.lnglat = [longitude, latitude];
        item.save(function(err) {
            if (err) {
                return res.send('users/signup', {
                    errors: err.errors,
                    item: item
                });
            } else {
                res.send(JSON.stringify(item));
                console.log(item)
            }
        });

    })
};

/**
 * Update an item
 */
exports.update = function(req, res) {
    var item = req.item;

    item = _.extend(item, req.body);

    item.save(function(err) {
        if (err) {
            return res.send('users/signup', {
                errors: err.errors,
                item: item
            });
        } else {
            res.jsonp(item);
        }
    });
};

/**
 * Delete an item
 */
exports.destroy = function(req, res) {
    var item = req.item;

    item.remove(function(err) {
        if (err) {
            return res.send('users/signup', {
                errors: err.errors,
                item: item
            });
        } else {
            res.jsonp(item);
        }
    });
};

/**
 * Show an item
 */
exports.show = function(req, res) {
    res.jsonp(req.item);
};

//Find items by distance
exports.nearItems = function(req, res) {
    var miles = req.params.miles;

    var userLng = req.user.latlng.latitude;
    var userLat = req.user.latlng.longitude;


    var userCoord = [userLng, userLat]

    Item.find({lnglat:
       {$near: userCoord,
        $maxDistance:miles/69.17}
    }).exec(function(err, items){
        console.log(err, items);
        res.jsonp(items);
    });
};


/**
 * List of all items
 */

exports.all = function(req, res) {
    if (req.query.itemRadius) {
        var miles = req.query.itemRadius;
        console.log(miles)
        console.log(req.user)
        var userLng = req.user.lnglat[0];
        var userLat = req.user.lnglat[1];
        var userCoord = [userLng, userLat]

        Item.find({lnglat:
           {$near: userCoord,
            $maxDistance:miles/69.17}
        }).exec(function(err, items){
            console.log(err, items);
            res.jsonp(items);
        });
    }

    // else if (req.query.owned_by) {
    //     var user_id = req.query.owned_by;
    //     Item.find({owned_by: user_id})
    // } else if (req.query.wanted_by) {
    //     same shit
    // } else if (req.query.category)


    else {
    Item.find().sort('-created').populate('owned_by', 'name.first name.last username _id').exec(function(err, items) {
        if (err) {
            res.render('error', {
                status: 500
            });
        } else {
            res.jsonp(items);
        }
    });
    };
};


//Do not show items that are expired.
exports.notShowExpired = function(req, res) {
    var today = Date.now()

    var existingItems = [];
    Item.find({}, function(err, allItems){
        for (var i = 0; i < allItems.length; i ++) {
            if (allItems[i].startTime + 1000*3600*allItems[i].duration < today) {
                existingItems.push(allItems[i]);
            }
        }
        res.jsonp(existingItems);
    });
};

// //Show wanted items
exports.showWantedItems = function(req, res) {
    var userID = req.user._id;
    Item.find({ active: "wanted", wanted_by: userID }, function(err, wantItems){
        res.jsonp(wantItems);
    });
};


// Change status of item when wanted by a user
exports.wantItem = function(req, res) {
    var itemID = req.item;
    var userID = req.user._id;

    Item.findByIdAndUpdate(itemId, { active: "wanted", wanted_by: userID }, function(err, items){
        res.redirect('/home');
    });
};

// Find items by distance
// exports.nearItems = function(req, res) {
//     var miles = req.params.miles;
//     var userLng = req.user.lnglat[0];
//     var userLat = req.user.lnglat[1];
//     var userCoord = [userLng, userLat]

//     Item.find({lnglat:
//        {$near: userCoord,
//         $maxDistance:miles/69.17}
//     }).exec(function(err, items){
//         console.log(err, items);
//         res.jsonp(items);
//     });
// };



