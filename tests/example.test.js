include('includes/include.js');

test("calling imported code", function() {
    assert.equal(10, ReturnsTen());
});

test("explicit name", function() {
});

test(function foo() {
    assert.true(true);
    assert.false(false);
    //assert.true(0);
    //assert.equal(10, "hi");
    //assert.equal('equal', assert.equal.name);
    assert.throws(TypeError, function() {
        throw new TypeError;
    });
    this.foo = 10;
});

test(function bar() {
    assert.equal(undefined, this.foo);
});

fixture("Fixture", {
    setUp: function() {
        this.foo = 10; 
    },
    
    "test foo is big": function() {
        assert.notNull(this.foo);
        assert.equal(10, this.foo);
    },

    "This isn't a test, so it had better not run": function() {
        assert.notNull(null);
    }
});

fixture("Has a teardown", {
    tearDown: function() {
    },

    "test tearDown": function() {
    }
});
