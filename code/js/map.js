/*** Much of this code is adapted from two Mike Bostock tutorials:
 *** d3 with leaflet (https://bost.ocks.org/mike/leaflet/)
 *** point-along-path interpolation (http://bl.ocks.org/mbostock/1705868) */

(function() {
    timesMargin = { "top": 40, "left": 15 },
    height = 675,
    width = 1000,
    timesWidth = 225 - timesMargin.left,
    timesHeight = 450 - timesMargin.top,
    curr_time = 0,
    lastTrainIndex = 0,
    timeFactor = 0,
    dayOfWeek = "WKD";

  var mymap = L.map('map').setView([40.73, -73.91], 12);

  // RESIZE MAP
  $(window).on("resize", function() {
    $("#map").height($(window).height() - 15)
    mymap.invalidateSize();
  }).trigger("resize");

  // MAPBOX TILES
  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWxleHdhaW5nZXIiLCJhIjoiY2l3MHR0cHNnMDlxdDJ6dGFndWNlaTlyMSJ9.doYPPIxLs6Uey35bzFRlEw', {
    maxZoom: 12,
    minZoom: 12,
    id: 'NYCSubwayMapping'
  }).addTo(mymap);

  // CREATE SVG
  var svg = d3.select(mymap.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");

  var timesSvg = d3.select("#trainTimesDiv").append("svg").attr("width",timesWidth).attr("height",timesHeight)
  .append("g").attr("transform", "translate(" + timesMargin.left + "," + timesMargin.top + ")");

  // LOAD DATA
  d3.queue()
    .defer(d3.json, "data/MTAGTFS/shapes.json")
    .defer(d3.csv, "data/MTAGTFS/stop_times_final_sorted.csv", function(d) {
      d.start_time = +d.start_time;
      d.end_time = +d.end_time;
      d.has_shape = (d.has_shape == "True");
      return d;
    })
    .defer(d3.csv, "data/MTAGTFS/routes.csv", function(d) {
      if (!d.route_id.includes("X")) {
        delete d.route_desc;
        return d;
      }
    })
    .await(ready)


  function ready (error, shapes, stop_times, routes) {

    var nested_routes = d3.nest()
      .key(function(d) { return d.route_color})
      .entries(routes)

    var line_color = timesSvg.selectAll(".line_color").data(nested_routes)
      .enter().append("g")
      .attr("transform", function(d, i) {
        return "translate(0," + (i * 35) + ")"; })

    tripsByDay = { "WKD": [], "SAT": [], "SUN":[] };
    for (var i = 0; i < stop_times.length; i++) {
      var day = stop_times[i].trip_id.split("_")[0].slice(-3);
      tripsByDay[day].push(stop_times[i]);
    }

    var transform = d3.geoTransform({point: function(x, y) {
      var point = mymap.latLngToLayerPoint(new L.LatLng(x, y));
      this.stream.point(point.x, point.y);
    }});
    var path = d3.geoPath().projection(transform);

    subway_paths = g.selectAll(".subway_path")
      .data(shapes.features)
      .enter().append("path")
      .attr("class", "subway_path")
      .attr("id", function(d) { return "shape_" + d.properties.shape_id})

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
      .attr('stroke', 'none')
      .attr('fill', 'none');

    $("#start").click(startAnimation);

    function startAnimation() {
      $("#startFormDiv").fadeOut();
      timeFactor = $("#timeFactor").val();
      dayOfWeek = $("#dayOfWeek").val();

      timeStep();
      drawIcons();
    }

    function drawIcons() {

      timesSvg.append("text")
      .attr("x", (timesWidth - timesMargin.left) / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .text("Average Wait Time");

      line_color.each(function(d) {

        var container = d3.select(this);

        container.append("text")
        .attr("text-anchor", "end")
        .attr("x", timesWidth - timesMargin.left)
        .text("hello!");

        var icons = container.selectAll("train_icon")
          .data(d.values).enter().append("g")
          .attr("transform", function(d, i) {
            return "translate(" + (i * 25) + ",0)"
          });
        
        icons.append("circle")
          .attr("fill", function(d) { return "#" + d.route_color})
          .transition().duration(500)
          .attr("r", 12);

        icons.append("text")
          .text(function(d) { return d.route_short_name})
          .attr("y", 4)
          .attr("fill", function(d) {return d.route_color == "FCCC0A" ? "black": "white" })
          .attr("text-anchor", "middle")
          .attr("font-size", "13px")
          .attr("font-weight", "600")
          .transition().duration(500)
          .attr("opacity", 1);
      })
    }

    function timeStep() {
      kickOffTrains();
      updateTime();
      setTimeout(function() { timeStep(); }, 500 / timeFactor);
    }

    function updateTime() {
      curr_time += 30;
      $("#time").html(secondsToReadableTime(curr_time));
    }

    function kickOffTrains() {
      markersToStart = [];
      while (tripsByDay[dayOfWeek][lastTrainIndex].start_time <= curr_time) {
        markersToStart.push(tripsByDay[dayOfWeek][lastTrainIndex]);
        lastTrainIndex++;
      }

      for (var i = 0; i < markersToStart.length; i++) {
        train_obj = markersToStart[i];

        if (train_obj.has_shape) {
          path_id = "shape_" + train_obj.trip_id.split("_")[2];
          duration = train_obj.end_time - train_obj.start_time;

          // If end time is past midnight, add an artificial day to make the numbers right
          if (duration < 0) {
            duration += (3600 * 24)
          }
          
          path_el = d3.select("[id='" + path_id + "']");
          startMarkerTransition(path_el, train_obj.color, duration * 1000 / (60 * timeFactor));
        }
      }
    }

    function startMarkerTransition(path, color, duration) {
      var startPoint = pathStartPoint(path);
      var startStopDuration = Math.min(250, duration * .1);

      var marker = g.append("circle")
        .attr("r", 0)
        .attr("class", "marker")
        .attr("transform", "translate(" + startPoint + ")")
        .attr("fill", "#" + color)
        .transition().duration(startStopDuration)
          .attr("r", 5)
        .transition().duration(duration - (2 * startStopDuration))
        .ease(d3.easeLinear)
        .attrTween("transform", translateAlong(path.node()))
        .on("end", function(d) {
          d3.select(this).transition().duration(startStopDuration)
            .attr("r", 0)
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
  
    function secondsToReadableTime(time) {
      curr_hour = Math.floor(curr_time / 3600);
      curr_min = Math.floor((curr_time % 3600) / 60)
      toReturn = "";
      if (curr_hour == 0) {
        toReturn = "12:" 
      } else if (curr_hour > 12) {
        toReturn = (curr_hour - 12) + ":"
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
  }

})();