(function(context) {
    $(function() {
        var tilesUrl = '/tiles/project/{z}/{x}/{y}.png';
        var utfgridUrl = '/tiles/project/{z}/{x}/{y}.grid.json?callback={cb}';
        var center = [ 48.857487002645485, 2.3455810546875 ];
        var zoom = 2;
        var attribution = 'Map data &copy; '
                + '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

        var map = L.map('map').setView(center, zoom);
        var tiles = L.tileLayer(tilesUrl, {
            attribution : attribution,
            maxZoom : 6
        });
        map.addLayer(tiles);

        var utfGrid = new L.UtfGrid(utfgridUrl);
        map.addLayer(utfGrid);
        utfGrid.on('mouseover', function(ev) {
            showInfo(ev.data);
        })
    });
    function showInfo(data) {
        var panel = $('#info');
        panel.find('.name').text(data.ADMIN);
        panel.find('.abbrev').text(data.ABBREV);
        panel.find('.type').text(data.TYPE);
        panel.find('.postcode').text(data.POSTAL);
        panel.show();
    }

})(this);