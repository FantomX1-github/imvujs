(function(root_this){
    var NODE_SYMBOLS = [
        'ArrayBuffer',
        'Int8Array',
        'Uint8Array',
        'Uint8ClampedArray',
        'Int16Array',
        'Uint16Array',
        'Int32Array',
        'Uint32Array',
        'Float32Array',
        'Float64Array',
        'DataView',
        'global',
        'process',
        'GLOBAL',
        'root',
        'Buffer',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        'console',
        'module',
        'require',

        'exports',
        '__filename',
        '__dirname',

        // browser-ish symbols prevented in tests
        'requestAnimationFrame',
    ];

    var IMVUJS_SYMBOLS = [
        'module',
        'IMVU',
        'Backbone',
        '_',

        // polyfill
        'Set',

        // AMD compatibility
        'define',
    ];

    var IMVUJSTEST_SYMBOLS = [
        'test',
        'fixture',
        'assert',
        'AssertionError',
        'registerSuperFixture',
    ];

    test("this is limited to the following symbols", function() {
        var actual_symbols = Object.keys(root_this);

        assert.deepEqual(IMVUJS_SYMBOLS, _.intersection(IMVUJS_SYMBOLS, actual_symbols));
        assert.deepEqual(IMVUJSTEST_SYMBOLS, _.intersection(IMVUJSTEST_SYMBOLS, actual_symbols));
    
        var expected_symbols = _.union(NODE_SYMBOLS, IMVUJS_SYMBOLS, IMVUJSTEST_SYMBOLS);
        //assert.deepEqual([], _.difference(actual_symbols, expected_symbols));
    });

    test("Public API is limited to the following symbols", function() {
        var actual_symbols = Object.keys(global);

        assert.deepEqual(IMVUJS_SYMBOLS, _.intersection(IMVUJS_SYMBOLS, actual_symbols));
        assert.deepEqual(IMVUJSTEST_SYMBOLS, _.intersection(IMVUJSTEST_SYMBOLS, actual_symbols));
    
        var expected_symbols = _.union(NODE_SYMBOLS, IMVUJS_SYMBOLS, IMVUJSTEST_SYMBOLS);
        //assert.deepEqual([], _.difference(actual_symbols, expected_symbols));
    });

    function sorted(ls) {
        ls = ls.slice(0);
        ls.sort();
        return ls;
    }

    test("Can import with NodeJS's require", function() {
        var loaded = require('../out/imvu.node.js');
        assert.deepEqual(
            ['Backbone', 'IMVU', /*ES6 polyfill*/'Set', '_', 'module'],
            sorted(Object.keys(loaded)));
    });
})(this);