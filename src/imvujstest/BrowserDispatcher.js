module({
    css: 'css.js',
    DomReporter: 'DomReporter.js',
    PhantomReporter: 'PhantomReporter.js',
    LeprechaunReporter: 'LeprechaunReporter.js',
    CompositeReporter: 'CompositeReporter.js'
}, function (imports) {
    return {
        dispatch: function (testRunner, superfixtureUrl, options) {
            options = options || {};
            var theModule = options.module || module;

            imports.css.install();
            $('<div class="test-sandbox"></div>').appendTo(document.body);
            var output = $('<div class="test-output"></div>').appendTo(document.body);

            var reporter = new imports.CompositeReporter([
                new imports.DomReporter({ el: output }),
                new imports.PhantomReporter(),
                new imports.LeprechaunReporter()
            ]);

            var onComplete = function() {};
            var onCompleteCalled = false;
            if (options.onComplete) {
                onComplete = function(result) {
                    if (!onCompleteCalled) {
                        options.onComplete(result);
                        onCompleteCalled = true;
                    }
                };
            }

            window.onerror = function(errorMsg, url, lineNumber) {
                reporter.error(errorMsg, url, lineNumber);
                onComplete(false);
            };

            var runTest = function () {
                var hashParts = window.location.hash.substr(1).split(':');
                var testUrl = hashParts[0];
                theModule.run({
                    test: testUrl,
                    superfixtures: superfixtureUrl
                }, function (imports) {
                    testRunner.setRunOnly({
                        fixture: hashParts[1] ? decodeURIComponent(hashParts[1]) : null,
                        test: hashParts[2] ? decodeURIComponent(hashParts[2]) : null
                    });

                    var result = testRunner.run_all(testUrl, reporter, onComplete);
                    if (result !== undefined) { // synchronous runners
                        onComplete(result);
                    }
                });
            };

            runTest();
        }
    };
});
