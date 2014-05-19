var _ = require('underscore');
var Q = require('q');
var Path = require('path');

var TileSourceProvider = require('tilepin/tilepin-provider');

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
            // console.log(JSON.stringify(vtile.toGeoJSON(0), null, 2));
            // console.log(_.functions(vtile));
            // console.log(vtile.names());
            return vtile;
        })
    });
}

function renderVectorTileToImage(map, vtile, enc) {
    var image = new mapnik.Image(vtile.height(), vtile.width());
    return Q.ninvoke(vtile, 'render', map, image).then(function(image) {
        return Q.ninvoke(image, 'encode', enc);
    });
}

function renderVectorTileToCairo(map, vtile, enc) {
    var image = new mapnik.CairoSurface(enc, vtile.height(), vtile.width());
    return Q.ninvoke(vtile, 'render', map, image).then(function(surface) {
        return surface.getData();
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
    var width = options.width || 256;
    var height = options.height || 256;
    var map = new mapnik.Map(width, height);
    return Q.ninvoke(map, 'fromString', options.xml, options);
}

function renderSvgImage(options, tileInfo) {
    return prepareMap(options).then(function(map) {
        var width = 500;
        var height = 500;
        map.zoomAll();
        var vtile = new mapnik.VectorTile(tileInfo.z, tileInfo.x, tileInfo.y);
        var bbox = mercator.bbox(tileInfo.x, tileInfo.y, // 
        tileInfo.z, false, '900913');
        // map.extent = bbox;
        return Q.ninvoke(map, 'render', vtile).then(function(vtile) {
            var surface = new mapnik.CairoSurface('svg', width, height);
            return Q.ninvoke(vtile, 'render', map, surface);
        }).then(function(surface) {
            // console.log(surface.getData().toString('UTF-8'));
        });
    });
}

var projectFile = './project/project.tilepin.xml';

var tileInfo = {
    z : 1,
    x : 0,
    y : 0,
    enc : 'png'
};

var vectorTile;
var mapOptions;
Q().then(function() {
    var provider = new TileSourceProvider.TileMillProvider({
        dir : './'
    });
    return provider.loadTileSource({
        source : 'project'
    });
}).then(function(options) {
    return Q.ninvoke(FS, 'readFile', options.path, 'UTF-8').then(function(xml) {
        options.xml = xml;
        mapOptions = options;
        return options;
    });
})

// // Render tile in SVG format
// .then(function() {
// var opt = _.extend(mapOptions, {
// width : 300,
// height : 200
// })
// return renderSvgImage(opt, tileInfo);
// })

// Generate vector tiles
.then(function() {
    return prepareMap(mapOptions).then(function(map) {
        return generateVectorTile(map, tileInfo);
    });
})
// Read the vector tile from the buffer
.then(function(data) {
    return readVectorTile(data, tileInfo).then(function(tile) {
        vectorTile = tile;
        return vectorTile;
    });
})

// Render to a SVG
.then(function() {
    var format = 'pdf';
    var options = _.extend({}, mapOptions, {
        width : 800,
        height : 500
    });
    return prepareMap(options).then(function(map) {
        map.zoomAll();
        console.log(map);
        var path = './map-full.' + format;
        return Q.ninvoke(map, 'renderFile', path, {
            format : format,
            scale : 1.0
        });
    })
})

// Render vector tiles in PNG
.then(function() {
    return prepareMap(mapOptions).then(function(map) {
        return renderVectorTileToImage(map, vectorTile, 'png');
    });
}).then(function(buffer) {
    return Q.ninvoke(FS, 'writeFile', './map1.png', buffer);
})

// Render vector tiles in SVG
.then(function(data) {
    return prepareMap(mapOptions).then(function(map) {
        return renderVectorTileToCairo(map, vectorTile, 'svg');
    });
}).then(function(buffer) {
    return Q.ninvoke(FS, 'writeFile', './map1.svg', buffer);
})

.then(null, function(err) {
    console.log(err.stack);
}).done();
