'use strict';

var mongoose = require('mongoose'),
    async = require('async'),
    pretty = require('pretty-time'),
    curry = require('curry'),
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

module.exports.seed = function (next) {
    var articles = [];
    for (var i = 0; i < _totalArticlesToSeed; i++) {
        articles.push({
            title: 'Dummy title ' + i,
            content: '1234567890 1234567890 1234567890 1234567890 1234567890'
        });
    }
    return mongoose.model('Article').insertMany(articles, next);
};


module.exports.doTiming = curry(function (f, next) {
    var start = process.hrtime();
    return f(function () {
        var elapsed = process.hrtime(start);
        var nano = elapsed[0] * 1e9 + elapsed[1];
        return next(null, nano);
    });
});

module.exports.timingWithCache = curry(function (f, next) {
    // Do 5 iterations, and ignore the first one
    var coll = [1, 2, 3, 4, 5];
    async.reduce(coll, 0, function (sum, item, cb) {
        return module.exports.doTiming(f, function (err, time) {
            if(err) {
                return cb(err);
            }
            return cb(null, item > 1 ? sum + time : sum);
        })
    }, function (err, sum) {
        if (err) {
            return next(err);
        }
        return next(null, sum / (coll.length - 1));
    });
});

module.exports.timingWithoutCache = curry(function (f, next) {
    // Try to work around the cache by removing the collection and seeding again
    // This is a workaround, there might be better programmatic interface to clear the cache
    return async.series([
        module.exports.remove,
        module.exports.seed
    ], function (err) {
        if(err) {
            return next(err);
        }
        return module.exports.doTiming(f, next);
    });
});

module.exports.timing = function (f, next) {
    return async.series(
        [
            module.exports.timingWithoutCache(f),
            module.exports.timingWithCache(f)
        ], next);
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

module.exports.strategy3 = function (next) {
    return module.exports.timing(function (cb) {
        var query = mongoose.model('Article').find({}).limit(_totalArticlesToQuery).sort('_id');

        return query.count(function (err, count) {
            query.skip(_pageIndex * _take).limit(_take).exec('find', function (err, articles) {
                return cb();
            });
        })
    }, next);
};

module.exports.benchmark = function (next) {
    return async.series(
        {
            "strategy1": module.exports.strategy1,
            "strategy2": module.exports.strategy2,
            "strategy3": module.exports.strategy3
        }, next);
};

module.exports.report = function (benchmarks, next) {
    var names = Object.keys(benchmarks);
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var result = benchmarks[name];
        console.log(name + ' Without cache : ' + pretty(result[0]));
        console.log(name + ' With cache : ' + pretty(result[1]));
    }
    return next();
};


module.exports.start = function (next) {
    return async.waterfall(
        [
            module.exports.connect,
            module.exports.benchmark,
            module.exports.report
        ], next
    );
};

module.exports.start(function (err) {
    if (err) {
        console.log(err);
        return process.exit(1);
    }
    return process.exit();
});