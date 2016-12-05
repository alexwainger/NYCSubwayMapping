/*** Much of this code is adapted from two Mike Bostock tutorials:
 *** d3 with leaflet (https://bost.ocks.org/mike/leaflet/)
 *** point-along-path interpolation (http://bl.ocks.org/mbostock/1705868) */

(function() {
  var margin = { top: 0, left: 0, right: 0, bottom: 0},
    height = 675 - margin.top - margin.bottom,
    width = 1000 - margin.left - margin.right;

  var mymap = L.map('map').setView([40.73, -73.94], 12);

  // RESIZE MAP
  $(window).on("resize", function() {
    $("#map").height($(window).height() - 15)
    mymap.invalidateSize();
  }).trigger("resize");

  // MAPBOX TILES
  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWxleHdhaW5nZXIiLCJhIjoiY2l3MHR0cHNnMDlxdDJ6dGFndWNlaTlyMSJ9.doYPPIxLs6Uey35bzFRlEw', {
    maxZoom: 16,
    minZoom: 11,
    id: 'NYCSubwayMapping'
  }).addTo(mymap);

  // CREATE SVG
  var svg = d3.select(mymap.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");

  // LOAD DATA
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
      .attr("class", "subway_path")
      .attr("id", function(d) { return d.properties.shape_id})

    mymap.on("viewreset", reset);

    reset();

    function reset() {
        
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
        .attr('stroke','none')
        .attr('fill', 'none')
        .attr('stroke-width', 0);
    }

    function projectPoint(x, y) {
      var point = mymap.latLngToLayerPoint(new L.LatLng(x, y));
      this.stream.point(point.x, point.y);
    }

    // Marker Transition
    d3.selectAll('.subway_path').each(function(d, i) {
        var a_path = d3.select(this);
        var startPoint = pathStartPoint(a_path);

      var marker = g.append("circle")
        .attr("r", 4)
        .attr("class", "marker")
        .attr("transform", "translate(" + startPoint + ")")
        .attr("fill", "red");
      
      function transition() {
        marker.transition()
            .duration(30000)
            .ease(d3.easeQuadInOut)
            .attrTween("transform", translateAlong(a_path.node()))
            .on("end", transition);
      }

      // Returns an attrTween for translating along the specified path element.
      function translateAlong(b_path) {
        var l = b_path.getTotalLength();
        return function(d, i, a) {
          return function(t) {
            var p = b_path.getPointAtLength(t * l);
            return "translate(" + p.x + "," + p.y + ")";
          };
        };
      }

      //Get path start point for placing marker
      function pathStartPoint(path) {
        var d = path.attr("d");
        var dsplitted = d.split("L");
        return dsplitted[0].substring(1);
      }

      transition();
    });

  }

})();