module({
    FakeTimer: 'FakeTimer.js'
}, function(imports) {
    var g = global; // || window?

    var base = fixture("FakeTimer tests", function() {
        this.setUp(function() {
            this.timer = new imports.FakeTimer;
        });
    });

    base.extend("Date", function() {
        test("initial time is greater than zero", function() {
            assert.greater(this.timer.now(), 0);
        });

        test("_advance increases now", function() {
            var start = this.timer.now();
            this.timer._advance(100);
            assert.equal(100, this.timer.now() - start);
        });
        
        test("getTime returns time in millisec", function() {
            assert.equal(this.timer.now() * 1000, this.timer.getTime());
        });
        
        test("setTime sets time in millisec", function() {
            var fakeDate = this.timer.setTime(7878000);
            assert.equal(7878, fakeDate.now());
            assert.equal(7878000, fakeDate.getTime());
            assert.equal("fake_UTC_7878000", fakeDate.toUTCString());
        });
    });

    base.extend("timeout", function() {
        test("handle is greater than zero", function() {
            var handle = this.timer.setTimeout(function() {}, 500);
            assert.greater(handle, 0);
        });

        test("setTimeout throws TypeError if given a string", function() {
            assert.throws(TypeError, function() {
                this.timer.setTimeout("hello world", 500);
            }.bind(this));
        });

        test("setTimeout is evaluated after a period of time", function() {
            var calls = [];
            this.timer.setTimeout(function() { calls.push(calls.length); }, 500);
            assert.deepEqual([], calls);
            this.timer._advance(0.4);
            assert.deepEqual([], calls);
            this.timer._advance(0.2);
            assert.deepEqual([0], calls);
            this.timer._advance(0.2);
            assert.deepEqual([0], calls);
        });

        test("clearTimeout", function() {
            var calls = [];
            var handle = this.timer.setTimeout(function() { calls.push(calls.length); }, 500);
            this.timer.clearTimeout(handle);
            this.timer._advance(1.0);
            assert.deepEqual([], calls);

            this.timer.clearTimeout(handle);
        });

        test("setTimeout arguments are passed through", function() {
            var calls = [];
            this.timer.setTimeout(function() {
                calls.push(Array.prototype.slice.call(arguments, 0));
            }, 500, 'arg1', 2);
            this.timer._advance(1000);
            assert.deepEqual([['arg1', 2]], calls);
        });
    });

    base.extend("interval", function() {
        test("handle is greater than zero", function() {
            var handle = this.timer.setInterval(function() {}, 500);
            assert.greater(handle, 0);
        });

        test("setInterval throws TypeError if given a string", function() {
            assert.throws(TypeError, function() {
                this.timer.setInterval("hello world", 500);
            }.bind(this));
        });

        test("setInterval is evaluated over time", function() {
            var calls = [];
            this.timer.setInterval(function() { calls.push(calls.length); }, 500);
            assert.deepEqual([], calls);
            this.timer._advance(0.4);
            assert.deepEqual([], calls);
            this.timer._advance(0.2);
            assert.deepEqual([0], calls);
            this.timer._advance(0.2);
            assert.deepEqual([0], calls);
            this.timer._advance(0.4);
            assert.deepEqual([0, 1], calls);
        });

        test("clearInterval", function() {
            var calls = [];
            var handle = this.timer.setInterval(function() { calls.push(calls.length); }, 500);
            this.timer.clearInterval(handle);
            this.timer._advance(1000);
            assert.deepEqual([], calls);
        });

        test("setInterval arguments are passed through", function() {
            var calls = [];
            this.timer.setInterval(function() {
                calls.push(Array.prototype.slice.call(arguments, 0));
            }, 600, 'arg1', 2);
            this.timer._advance(1000);
            assert.deepEqual([['arg1', 2]], calls);
        });
    });
});
