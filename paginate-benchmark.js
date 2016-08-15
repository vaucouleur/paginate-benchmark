'use strict';

var mongoose = require('mongoose'),
    async = require('async'),
    pretty = require('pretty-time'),
    articleModel = require('./article.model.js');

var _totalArticlesToSeed = 10000;
var _totalArticlesToQuery = 10000;
var _pageIndex = (250); // zero based index for use with Mongoose's .skip() method
var _take = 20;

module.exports.connect = function (next) {
    var uri = 'mongodb://localhost/paginate-benchmark';
    var options = {
        user: '',
        pass: ''
    };
    return mongoose.connect(uri, options, next);
};

module.exports.remove = function (next) {
    return mongoose.model('Article').remove({}, next);
};

module.exports.seed = function (commandResult, next) {

    var articles = [];
    for (var i = 0; i < _totalArticlesToSeed; i++) {
        articles.push({
            title: 'Dummy title ' + i,
            content: '1234567890 1234567890 1234567890 1234567890 1234567890'
        });
    }

    return mongoose.model('Article').insertMany(articles, next);
};

module.exports.timing = function (f, next) {
    var start = process.hrtime();
    return f(function () {
        var time = process.hrtime(start);
        var prettyTiming = pretty(time);
        return next(null, prettyTiming);
    });
};

module.exports.strategy1 = function (next) {
    return module.exports.timing(function (cb) {
        return mongoose.model('Article').find({}).skip(_pageIndex * _take).limit(_take).exec(function (err, c) {
            return cb();
        })
    }, next);
};

module.exports.strategy2 = function (next) {
    return module.exports.timing(function (cb) {
        var query = mongoose.model('Article').find({}).limit(_totalArticlesToQuery);

        return query.count(function (err, count) {
            query.skip(_pageIndex * _take).limit(_take).exec('find', function (err, articles) {
                return cb();
            });
        })
    }, next);
};

module.exports.strategy2_withSortOnIndexedField = function (next) {
    return module.exports.timing(function (cb) {
        var query = mongoose.model('Article').find({}).limit(_totalArticlesToQuery).sort('_id');

        return query.count(function (err, count) {
            query.skip(_pageIndex * _take).limit(_take).exec('find', function (err, articles) {
                return cb();
            });
        })
    }, next);
};

module.exports.benchmark = function (docs, next) {
    return async.series(
        {
            "strategy1": module.exports.strategy1,
            "strategy2": module.exports.strategy2,
            "strategy2_withSortOnIndexedField": module.exports.strategy2_withSortOnIndexedField
        }, next);
};

module.exports.report = function (benchmarks, next) {
    var names = Object.keys(benchmarks);
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var result = benchmarks[name];
        console.log(name + ' : ' + result);
    }
    return next();
};


module.exports.start = function (next) {
    return async.waterfall(
        [
            module.exports.connect,
            module.exports.remove,
            module.exports.seed,
            module.exports.benchmark,
            module.exports.report
        ], next
    );
};

module.exports.start(function(err) {
    if (err) {
        console.log(err);
        return process.exit(1);
    }
    return process.exit();
});