"use strict";

var BaseClass = require('../src/BaseClass.js');
var _ = require('../ext/underscore.js');

var all_tests = [];

function test() {
    if (arguments.length == 1) {
        var fn = arguments[0];
        all_tests.push([fn.name, fn]);
    } else if (arguments.length == 2) {
        all_tests.push([arguments[0], arguments[1]]);
    } else {
        throw new TypeError("test requires 1 or 2 arguments");
    }
}

function run_all() {
    for (var i = 0; i < all_tests.length; ++i) {
        var test = all_tests[i];
        var name = test[0];
        var body = test[1];
        console.log("running", name, '...');
        var success = false;
        try {
            body.call({});
            success = true;
        }
        catch (e) {
            if (e instanceof Error) {
                console.log("failed test '" + name + "':\n" + e.stack);
            } else {
                throw e;
            }
        }
        if (success) {
            console.log("    passed");
        }
    }
    all_tests = [];
}

function fixture(fixtureName, obj) {
    var setUp = obj.setUp ? obj.setUp : function() {};
    for (var testName in obj) {
        if (testName !== 'setUp') {
            test(fixtureName + '.' + testName, function(body) {
                setUp.call(this);
                body.call(this);
            }.bind({}, obj[testName]));
        }
    }
}

function repr(v) {
    return JSON.stringify(v);
}

var AssertionError = Error;

var assert = {
    true: function(value) {
        if (!value) {
            throw new AssertionError("expected truthy, actual " + repr(value));
        }
    },
    false: function(value) {
        if (value) {
            throw new AssertionError("expected falsy, actual " + repr(value));
        }
    },
    equal: function(expected, actual) {
        if (expected !== actual) {
            throw new AssertionError('expected: ' + repr(expected) + ', actual: ' + repr(actual));
        }
    },
    throws: function(exception, fn) {
        try {
            fn();
        }
        catch (e) {
            if (e instanceof exception) {
                return;
            }
            throw new AssertionError('expected to throw: ' + repr(exception) + ', actually threw: ' + repr(e));
        }
        throw new AssertionError('did not throw');
    }
};

exports.assert = assert;
exports.test = test;
exports.fixture = fixture;
exports.run_all = run_all;
