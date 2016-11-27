(function() {
  var margin = { top: 0, left: 0, right: 0, bottom: 0},
    height = 675 - margin.top - margin.bottom,
    width = 1000 - margin.left - margin.right;

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

  d3.queue()
    .defer(d3.json, "data/boroughs.topojson")
    .defer(d3.csv, "data/MTAGTFS/stops.csv", function(d) {
      if (d.parent_station == "") {
        d.stop_lat = +d.stop_lat;
        d.stop_lon = +d.stop_lon;
        return d;
      }
    })
    .await(ready)

  function ready (error, newYork, stops) {

    var boroughs = topojson.feature(newYork, newYork.objects.collection).features;

    svg.selectAll(".borough")
        .data(boroughs)
        .enter().append("path")
        .attr("class", "borough")
        .attr("d", path)
        .attr("stroke", "black")
        .attr("stroke-width", .25)
        .attr("fill", "#e3e3e3");

    svg.selectAll(".stop")
      .data(stops)
      .enter().append("circle")
      .attr("class", "stop")
      .attr("r", 2)
      .attr("fill", "red")
      .attr("stroke", "#333333")
      .attr("stroke-width", .5)
      .attr("cx", function(d) {
        // Taking lat, long coords and turning them into pixel coordinates on our screen
        var coords = projection([d.stop_lon, d.stop_lat]);
        return coords[0];
      })
      .attr("cy", function(d) {
        var coords = projection([d.stop_lon, d.stop_lat]);
        return coords[1];
      });
  }

})();