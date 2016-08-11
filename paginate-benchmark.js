'use strict';

var mongoose = require('mongoose'),
    async = require('async'),
    pretty = require('pretty-time'),
    articleModel = require('./article.model.js');

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
    for (var i = 0; i < 10000; i++) {
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
        return mongoose.model('Article').find({}).skip(5000).limit(20).exec(function (err, c) {
            return cb();
        })
    }, next);
};

module.exports.strategy2 = function (next) {
    return module.exports.timing(function (cb) {
        // to do.. dummy waiting
        setTimeout(function() {
            return cb();
        }, 3000);
    }, next);
};

module.exports.benchmark = function (docs, next) {
    return async.series(
        {
            "strategy1": module.exports.strategy1,
            "strategy2": module.exports.strategy2
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