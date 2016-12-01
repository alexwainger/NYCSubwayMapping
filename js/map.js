(function() {
  var margin = { top: 0, left: 0, right: 0, bottom: 0},
    height = 675 - margin.top - margin.bottom,
    width = 1000 - margin.left - margin.right;

  var mymap = L.map('map').setView([40.73, -73.94], 12);

  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWxleHdhaW5nZXIiLCJhIjoiY2l3MHR0cHNnMDlxdDJ6dGFndWNlaTlyMSJ9.doYPPIxLs6Uey35bzFRlEw', {
    maxZoom: 16,
    minZoom: 11,
    id: 'NYCSubwayMapping'
  }).addTo(mymap);
/*
  var svg = d3.select("#map")
        .append("svg")
        .attr("height", height + margin.top + margin.bottom)
        .attr("width", width + margin.left + margin.right)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var projection = d3.geoMercator().center([-73.94, 40.73])
    .translate([ width / 2, height / 2])
    .scale(75000);

  var path = d3.geoPath()
    .projection(projection);
*/
  d3.queue()
  //  .defer(d3.json, "data/boroughs.topojson")
    .defer(d3.csv, "data/MTAGTFS/stops.csv", function(d) {
      if (d.parent_station == "") {
        d.stop_lat = +d.stop_lat;
        d.stop_lon = +d.stop_lon;
        return d;
      }
    })
    .defer(d3.csv, "data/MTAGTFS/shapes.csv")
    .await(ready)

  function ready (error, stops, shapes) {


    stops.forEach(function(d) {
      var circle = L.circle([d.stop_lat, d.stop_lon], {
        color: 'red',
        fillColor: 'red',
        fillOpacity: 1,
        radius: 1
      }).addTo(mymap);
    });

    var nested_shapes = d3.nest().key(function(d) {return d.shape_id}).entries(shapes);
    console.log(nested_shapes);

    for (i = 0; i < nested_shapes.length; i++) {
      latlons = nested_shapes[i].values.map(function(d) { return new L.LatLng(d.shape_pt_lat, d.shape_pt_lon)});
      var polyline = L.polyline(latlons, {color: '#'+(Math.random()*0xFFFFFF<<0).toString(16) }).addTo(mymap);
    }
  }

})();