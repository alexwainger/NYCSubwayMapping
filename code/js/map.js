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

  var svg = d3.select(mymap.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");

  d3.queue()
    .defer(d3.csv, "data/MTAGTFS/stops.csv", function(d) {
      if (d.parent_station == "") {
        d.stop_lat = +d.stop_lat;
        d.stop_lon = +d.stop_lon;
        return d;
      }
    })
    .defer(d3.json, "data/MTAGTFS/shapes.json")
    .await(ready)

  function ready (error, stops, shapes) {

    var transform = d3.geoTransform({point: projectPoint}),
        path = d3.geoPath().projection(transform);

    subway_paths = g.selectAll(".subway_path")
      .data(shapes.features)
      .enter().append("path")
      .attr("class", "subway_path");

    mymap.on("viewreset", reset);

    reset();

    function reset() {
      console.log("resetting");
        
      bounds = path.bounds(shapes);

      var topLeft = bounds[0],
        bottomRight = bounds[1];

      svg.attr("width", bottomRight[0] - topLeft[0])
        .attr("height", bottomRight[1] - topLeft[1])
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");

      g.attr("transform", "translate(" + -topLeft[0] + "," 
                                       + -topLeft[1] + ")");

      subway_paths.attr("d", path)
        .attr('stroke','blue')
        .attr('fill', 'none');
    }

    function projectPoint(x, y) {
      var point = mymap.latLngToLayerPoint(new L.LatLng(x, y));
      this.stream.point(point.x, point.y);
    }
/*
    stops.forEach(function(d) {

      var circle = L.circle([d.stop_lat, d.stop_lon], {
        color: 'red',
        fillColor: 'red',
        fillOpacity: 1,
        radius: 1
      }).addTo(mymap).bindPopup("My name is " + d.stop_name);

    });

    var nested_shapes = d3.nest().key(function(d) {return d.shape_id}).entries(shapes);
    

    for (i = 0; i < nested_shapes.length; i++) {
      latlons = nested_shapes[i].values.map(function(d) { return new L.LatLng(d.shape_pt_lat, d.shape_pt_lon)});
      var polyline = L.polyline(latlons, {color: '#'+(Math.random()*0xFFFFFF<<0).toString(16) }).addTo(mymap);
    }

*/
  }

})();