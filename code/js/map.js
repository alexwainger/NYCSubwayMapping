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
    .defer(d3.json, "data/MTAGTFS/shapes.json")
    .defer(d3.csv, "data/MTAGTFS/stop_times_final_sorted.csv", function(d) {
      if (d.trip_id.includes("WKD") && d.has_shape == "True") {
        if (d.color == "") {
          d.color = "000000";
        }
        d.start_time = +d.start_time;
        d.end_time = +d.end_time;
        return d;
      }
    })
    .await(ready)


  function ready (error, shapes, stop_times) {

    function projectPoint(x, y) {
      var point = mymap.latLngToLayerPoint(new L.LatLng(x, y));
      this.stream.point(point.x, point.y);
    }

    var transform = d3.geoTransform({point: projectPoint}),
        path = d3.geoPath().projection(transform);

    subway_paths = g.selectAll(".subway_path")
      .data(shapes.features)
      .enter().append("path")
      .attr("class", "subway_path")
      .attr("id", function(d) { return "shape_" + d.properties.shape_id})

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
        .attr('stroke-width', .5);
    }

    curr_time = 21600;
    lastTrainIndex = 0;
    timeStep();

    function timeStep() {
      kickOffTrains();
      updateTime();
      setTimeout(function() { timeStep(); }, 250);
    }

    function updateTime() {
      curr_time += 30;
      $("#time").html(secondsToReadableTime(curr_time));
    }

    function secondsToReadableTime(time) {
      curr_hour = Math.floor(curr_time / 3600);
      curr_min = Math.floor((curr_time % 3600) / 60)
      toReturn = "";
      if (curr_hour == 0) {
        toReturn = "12:" 
      } else {
        toReturn = curr_hour + ":"
      }

      if (curr_min < 10) {
        toReturn += "0"
      } toReturn += curr_min;

      if (curr_hour > 11) {
        toReturn += " pm";
      } else {
        toReturn += " am";
      }

      return toReturn;
    }

    function kickOffTrains() {
      markersToStart = [];
      while (stop_times[lastTrainIndex].start_time <= curr_time) {
        markersToStart.push(stop_times[lastTrainIndex]);
        lastTrainIndex++;
      }

      for (var i = 0; i < markersToStart.length; i++) {
        train_obj = markersToStart[i];
        path_id = "shape_" + train_obj.trip_id.split("_")[2];

        function waitForElement() {
          path_el = d3.select("[id='" + path_id + "']");
          if (path_el.empty()) {
            window.requestAnimationFrame(waitForElement);
          } else {
            //TODO Add actual transition time
            startMarkerTransition(path_el, train_obj.color, 30000);
          }
        };

        waitForElement();
      }
    }

    function startMarkerTransition(path, color, duration) {
      var startPoint = pathStartPoint(path);

      var marker = g.append("circle")
        .attr("r", 5)
        .attr("class", "marker")
        .attr("transform", "translate(" + startPoint + ")")
        .attr("opacity", 1)
        .attr("fill", "#" + color)
        .transition().duration(duration)
        .ease(d3.easeLinear)
        .attrTween("transform", translateAlong(path.node()))
        .on("end", function(d) {
          d3.select(this).transition().duration(500)
            .attr("opacity", 0)
            .remove();
        });

      function translateAlong(path) {
        var l = path.getTotalLength();
        return function(d, i, a) {
          return function(t) {
            var p = path.getPointAtLength(t * l);
            return "translate(" + p.x + "," + p.y + ")";
          };
        };
      }

      function pathStartPoint(path) {
        var d = path.attr("d");
        var dsplitted = d.split("L");
        return dsplitted[0].substring(1);
      }
    }
  }

})();