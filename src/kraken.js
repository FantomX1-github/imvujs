(function() {

    var C = console;

    C = { log: function(){ }, error: function() { } };

    function hasProperties(o) {
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                return true;
            }
        }
        return false;
    }

    function fetch(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onreadystatechange = function () {
            if (this.readyState === this.DONE) {
                callback(this);
            }
        };
        xhr.send();
    }

    var ourUrl = null;

    var completeJs = {}; // url : Future<exportTable>
    var downloadingJs = {}; // url : Future

    /* Returns a function which implements memoization and request coallescing
     * for the function 'fn'
     * 
     * 'fn' must have the signature function(arg, onComplete)
     * where onComplete is itself a function that takes the result as its sole parameter.
     */
    function coallescer(fn) {
        var futures = {}; // arg : Future

        function coalescedWrapper(arg, onComplete) {
            if (futures.hasOwnProperty(arg)) {
                futures[arg].register(onComplete);
            } else {
                var future = new concur.Future();
                futures[arg] = future;
                futures[arg].register(onComplete);

                fn(arg, future.complete.bind(future));
            }
        }

        return coalescedWrapper;
    }

    var moduleWasCalled = false;

    var fetchJs = coallescer(function(url, onComplete) {
        fetch(url, onFetched);

        function onFetched(xhr) {
            if (xhr.status != 200) {
                console.error("Failed to fetch " + url);
                throw new Error("Failed to fetch " + url + ".  Status code " + xhr.status);
            }

            var f;
            try {
                f = new Function('exports', xhr.responseText + '//@ sourceURL=' + url);
            } catch (e) {
                console.error("Failed to parse", url);
                throw e;
            }

            var exports = {};
            var saveUrl = ourUrl;

            ourUrl = url;
            moduleWasCalled = false;

            var result;
            try {
                result = f.call(window, exports);
            } finally {
                ourUrl = saveUrl;
            }

            if (result === undefined && hasProperties(exports)) {
                result = exports;
            }

            onComplete(result);
        }
    });

    function importJs(url, onComplete) {
        url = toAbsoluteUrl(url, ourUrl);

        if (completeJs.hasOwnProperty(url)) {
            completeJs[url].register(onComplete);
        } else {
            var f = new concur.Future();
            completeJs[url] = f;
            f.register(onComplete);

            /* The completion callback here is left empty because a module() invocation is
             * expected to occur while evaluating the JS.  This module() invocation is expected to
             * complete the relevant completeJs[url] future.
             */
            fetchJs(url, function(result) {
                if (!moduleWasCalled) {
                    f.complete(result);
                }
            });
        }
    }

    function splitPath(p) {
        var i = p.lastIndexOf('/');
        if (i !== -1) {
            return [p.substring(0, i), p.substring(i + 1)];
        } else {
            return ['', p];
        }
    }

    function toAbsoluteUrl(url, relativeTo) {
        if (url[0] == '/' || typeof relativeTo !== 'string') {
            return url;
        }

        relativeTo = splitPath(relativeTo)[0];

        if (relativeTo === '') {
            return url;
        } else if (url[0] === '/' || relativeTo[relativeTo.length - 1] === '/') {
            return relativeTo + url;
        } else {
            return relativeTo + '/' + url;
        }
    }

    function importOld(url, onComplete) {
        if (1 == arguments.length) {
            // importOld(url)(onComplete) is the same operation as importOld(url, onComplete)
            return function(onComplete) {
                return importOld(url, onComplete);
            };
        }

        url = toAbsoluteUrl(url, ourUrl);

        if (completeJs.hasOwnProperty(url)) {
            completeJs[url].register(onComplete);
            return null;
        }

        var f = new concur.Future();
        completeJs[url] = f;
        f.register(onComplete);

        fetchJs(url, f.complete.bind(f));
        return null;
    }

    function module(dependencies, body) {
        C.log("module", ourUrl, dependencies);

        moduleWasCalled = true;

        if (!dependencies instanceof Array) {
            throw new Error("Dependencies must be array");
        }
        if (!body instanceof Function) {
            throw new Error("Body must be a function");
        }

        var url = ourUrl;
        var future;
        if (completeJs.hasOwnProperty(url)) {
            future = completeJs[url];
        } else {
            future = new concur.Future("module " + url);
            completeJs[url] = future;
        }

        var remainingDependencies = dependencies.length;
        if (remainingDependencies == 0) {
            complete();
            return;
        }

        var result = new Array(remainingDependencies);

        for (var index = 0; index < dependencies.length; ++index) {
            var d = dependencies[index];
            if (d instanceof Function) {
                // Nothing.  d is a function of (url, onComplete)
            } else if (d.constructor === String) {
                d = importJs.bind(null, d);
            }

            d(handleResolution.bind(null, index));
        }

        function handleResolution(index, value) {
            result[index] = value;

            --remainingDependencies;
            if (0 == remainingDependencies) {
                complete();
            }
        }

        function complete() {
            C.log('complete', url);
            var exportTable = body.apply(null, result);
            future.complete(exportTable);
        }
    }

    window.module = module;

    window.kraken = {
        module: module,
        importOld: importOld
    };

    //////////////////////////////
    // copypaste from concur.js //
    //////////////////////////////

    var concur = {
        Future: BaseClass.extend({
            initialize: function(name) {
                this.name = name;
                this.callbacks = [];
                this.isComplete = false;
                this.value = null;
            },

            register: function(f) {
                if (this.isComplete) {
                    f(this.value);
                } else {
                    this.callbacks.push(f);
                }
            },

            complete: function(v) {
                if (this.isComplete) {
                    throw new Error("Cannot complete a future twice " + JSON.stringify(this.name ? this.name : ""));
                }

                this.isComplete = true;
                this.value = v;

                for (var index = 0; index < this.callbacks.length; ++index) {
                    this.callbacks[index](v);
                }
                delete this.callbacks;
            }
        }),

        // functions :: [function (CompletionCallback)] where CompletionCallback is itself a function taking a result
        joinAsync: function(functions, onComplete) {
            var count = functions.length;
            var results = new Array(count);

            function oc(index, result) {
                results[index] = result;
                --count;
                if (0 == count) {
                    onComplete(results);
                }
            }

            for (var index = 0; index < functions.length; ++index) {
                var f = functions[index];
                f(oc.bind(null, index));
            }
        }
    };

})();
