var _ = require('underscore');
var Q = require('q');
var Path = require('path');

var mercator = new (require('sphericalmercator'));
var mapnik = require('mapnik');
var FS = require('fs');

// register fonts and datasource plugins
mapnik.register_default_fonts();
mapnik.register_default_input_plugins();

function generateVectorTile(map, tileInfo) {
    var vtile = new mapnik.VectorTile(tileInfo.z, tileInfo.x, tileInfo.y);
    var bbox = mercator.bbox(tileInfo.x, tileInfo.y, tileInfo.z, false,
            '900913');
    map.extent = bbox;
    return Q.ninvoke(map, 'render', vtile).then(function(vtile) {
        var data = vtile.getData();
        return data;
    });
}

function readVectorTile(data) {
    var vtile = new mapnik.VectorTile(0, 0, 0);
    return Q.ninvoke(vtile, 'setData', data).then(function() {
        return Q.ninvoke(vtile, 'parse').then(function() {
            
            console.log(JSON.stringify(vtile.toGeoJSON(0), null, 2));
            console.log(_.functions(vtile));
            console.log(vtile.names());
            return vtile;
        })
    });
}

function renderVectorTile(map, vtile, enc) {
    var image = new mapnik.Image(vtile.height(), vtile.width());
    return Q.ninvoke(vtile, 'render', map, image).then(function(image) {
        return Q.ninvoke(image, 'encode', enc);
    });
}

function readMapOptions(projectFile) {
    var options = {
        base : Path.dirname(projectFile)
    };
    return Q.ninvoke(FS, 'readFile', projectFile, 'UTF-8').then(function(str) {
        options.xml = str;
        return options;
    });
}

function prepareMap(options) {
    var map = new mapnik.Map(256, 256);
    return Q.ninvoke(map, 'fromString', options.xml, options);
}

var projectFile = './project/project.tilepin.xml';

var tileInfo = {
    z : 5,
    x : 10,
    y : 9,
    enc : 'png'
};

var mapOptions;
Q().then(function() {
    return readMapOptions(projectFile);
}).then(function(options) {
    mapOptions = options;
    return prepareMap(mapOptions).then(function(map) {
        return generateVectorTile(map, tileInfo);
    });
}).then(function(data) {
    return readVectorTile(data, tileInfo).then(function(vtile) {
        return prepareMap(mapOptions).then(function(map) {
            return renderVectorTile(map, vtile, 'png');
        });
    })
}).then(function(buffer) {
    return Q.ninvoke(FS, 'writeFile', './map1.png', buffer);
})

.then(null, function(err) {
    console.log(err.stack);
}).done();
