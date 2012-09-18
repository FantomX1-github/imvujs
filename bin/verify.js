var fs      = require('fs');
var uglify  = require('uglify-js');
var combine = require('./combine.js');
var path    = require('path');

function VerifyError(message) {
    this.message = message;
}

VerifyError.prototype = new Error();

function checkForGlobalAssignments(locals, ast) {
}

function Scope(parent) {
    this.parent = parent;
    this.symbols = Object.create(null);
}

Scope.prototype.add = function(name) {
    this.symbols[name] = true;
};

Scope.prototype.has = function(name) {
    //console.error("scope.has", name, this);
    if (Object.prototype.hasOwnProperty.call(this.symbols, name)) {
        return true;
    } else if (!this.parent) {
        return false;
    } else {
        return this.parent.has(name);
    }
};

function leftMostSubExpression(node) {
    //console.error("leftMostSubExpression", node);
    if (node[0] == 'name') {
        return node;
    } else if (node[0] == 'sub') {
        return leftMostSubExpression(node[1]);
    } else if (node[0] == 'dot') {
        return leftMostSubExpression(node[1]);
    } else {
        return node;
    }
}

function check(ast) {
    var errors = [];

    var globalScope = new Scope(null);
    globalScope.add('this');
    visit(globalScope, ast);

    function visit(scope, node) {
        var t = node[0];
        if (t == 'var') {
            var vars = node[1];
            vars.forEach(function(e) {
                scope.add(e[0]);
                if (e.length > 1) {
                    visit(scope, e[1]);
                }
            });
        } else if (t == 'defun' || t == 'function') {
            if (node[1]) {
                scope.add(node[1]);
            }

            var s = new Scope(scope);

            var params = node[2];
            params.forEach(s.add.bind(s));

            var statements = node[3];
            for (var k = 0; k < statements.length; ++k) {
                visit(s, statements[k]);
            }

        } else if (t == 'assign') {
            var v = leftMostSubExpression(node[2]);
            if (v[0] == 'name') {
                var name = v[1];
                if (!scope.has(name)) {
                    errors.push(["Assignment to globals is forbidden", node]);
                }
            }

            visit(scope, node[3]);

        } else {
            node.forEach(function(n) {
                if (n instanceof Array) {
                    visit(scope, n);
                }
            });
        }
    }

    return errors;
}

function main(argv) {
    argv.slice(2).forEach(function (fileName) {
        var code = fs.readFileSync(fileName, 'utf8');

        var ast;
        try {
            ast = uglify.parser.parse(code);
        } catch (e) {
            combine.errorExit("Error in", fileName, ": '" + e.message + "' at line:", e.line, "col:", e.col, "pos:", e.pos);
        }

        var errors = check(ast);
        if (errors.length) {
            console.error("Errors in", fileName);
            errors.forEach(function (e) {
                var message = e[0];
                var node = e[1];
                console.error("\t", message);

                if (node[3][0] == 'function') {
                    // special case
                    console.error(":\t", combine.gen_code(node[2]), " = function(...) {...}");
                } else {
                    console.error(":\t", combine.gen_code(node));
                }
            });
        }
    });
}

if (null === module.parent) {
    main(process.argv);
} else {
    exports.VerifyError = VerifyError;
    exports.checkForGlobalAssignments = checkForGlobalAssignments;
    exports.check = check;
}
