module({
    'FakeXHRFactory': '../../fakes/FakeXMLHttpRequestFactory.js'
}, function(imports) {        
    fixture("Fixture", function() {
        this.setUp(function() {
            this.xhrFactory = new imports.FakeXHRFactory();
            module.setXHRFactory(this.xhrFactory);
            this.sysincludeCalls = [];
            this.sysincludeModuleDep = null;
        });
       
        test("dynamicImport loads another module dynamically", function() {
            var imports = [];
            
            module.dynamicImport([
                "another_module.js"
            ], function(newlyImported) {
                imports = _.union(imports, newlyImported);
            });
            
            this.xhrFactory._respond('GET', '/another_module.js', 200, [], "module({}, function() {return {}})");
            assert.equal(1, imports.length);
        });
    });
});