combine = require '../bin/combine.js'
path    = require 'path'

expected = [
    '(function() {',
    '    var $kraken$1 = function(imports) {',
    '        var exports = {};',
    '        function foo() {}',
    '        function bar() {}',
    '        exports.foo = foo;',
    '        exports.bar = bar;',
    '        return exports;',
    '    }({});',
    '    var $kraken$2 = function(imports) {',
    '        return a_export_table;',
    '    }({',
    '        e: $kraken$1',
    '    });',
    '    var $kraken$3 = function(imports) {',
    '        return b_export_table;',
    '    }({',
    '        a: $kraken$2',
    '    });',
    '    var $kraken$4 = function(imports) {',
    '        return c_export_table;',
    '    }({',
    '        a: $kraken$2',
    '    });',
    '    var imports = {',
    '        b: $kraken$3,',
    '        c: $kraken$4',
    '    };',
    '    module({}, function() {',
    '        return d_export_table;',
    '    })',
    '})();'
].join('\n')

fixture 'functional',
    setUp: ->
        @cwd = process.cwd()
        process.chdir(path.dirname(testPath))

    tearDown: ->
        process.chdir(@cwd)

    'test basic functionality': ->
        q = combine.combine 'combine/d.js'

        assert.equal(
            combine.gen_code(q, {beautify: true}),
            expected
        )
