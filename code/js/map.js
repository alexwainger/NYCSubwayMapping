/*** Much of this code is adapted from two Mike Bostock tutorials:
 *** d3 with leaflet (https://bost.ocks.org/mike/leaflet/)
 *** point-along-path interpolation (http://bl.ocks.org/mbostock/1705868) */

(function() {
    timesMargin = { "top": 40, "left": 30},
    height = 675,
    width = 1000,
    timesWidth = 200 - timesMargin.left,
    timesHeight = 625 - timesMargin.top,
    curr_time = 0,
    lastTrainIndex = 0,
    timeFactor = 0,
    dayOfWeek = "WKD",
    interval = null;

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

  // CREATE SVGS
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

    /*** SETTING UP DAY NESTING AND TRAINS ON TRACKS ***/
    tripsByDay = { "WKD": [], "SAT": [], "SUN":[] };
    for (var i = 0; i < stop_times.length; i++) {
      var day = stop_times[i].trip_id.split("_")[0].slice(-3);
      tripsByDay[day].push(stop_times[i]);
    }

    trainsOnTracks = {};
    for (var i = 0; i < routes.length; i++) {
      trainsOnTracks[routes[i].route_id] = {"N":[], "S":[], "last_waitTime": Infinity };
    }

    /*** DRAWING SUBWAY PATHS ***/
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

    /*** EVENT HANDLER TO START ANIMATION ***/
    $("#start").click(startAnimation);

    function startAnimation() {
      timeFactor = $("#timeFactor").val();
      dayOfWeek = $("#dayOfWeek").val();

      if (timeFactor < 1 || timeFactor > 60) {
        alert("Please enter a speed between 1 and 60.");
      } else {
        $("#startFormDiv").fadeOut();
        $("#sidebar").fadeIn();

        drawIcons();
        interval = setInterval(timeStep, 500 / timeFactor);
      }
    }

    /*** DRAW WAITING TIME ICONS ***/
    function drawIcons() {

      timesSvg.append("text")
        .attr("x", (timesWidth - timesMargin.left) / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Avg. Wait Time")
        .style("text-decoration", "underline")
        .style("font-weight", "500");

      var groups = timesSvg.selectAll(".icon_group").data(routes)
        .enter().append("g")
        .attr("transform", function(d, i) {
          return "translate(0," + (i * 20) + ")"; })

      groups.append("text")
        .attr("id", function(d) { return "wait_time_" + d.route_id})
        .attr("text-anchor", "end")
        .attr("x", timesWidth - timesMargin.left - 20)
        .attr("y", 4)
        .text("No trains");

      var icons = groups.append("g").attr("transform", "translate(25,0)");
      icons.append("circle")
        .attr("fill", function(d) { return "#" + d.route_color})
        .transition().duration(500)
        .attr("r", 10);

      icons.append("text")
        .text(function(d) { return d.route_short_name})
        .attr("y", 4)
        .attr("fill", function(d) {return d.route_color == "FCCC0A" ? "black": "white" })
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .transition().duration(500)
        .attr("opacity", 1);
    }

    /*** MOVES TIME FORWARD ***/
    function timeStep() {
      if (lastTrainIndex >= tripsByDay[dayOfWeek].length) {
        clearInterval(interval);
      }

      kickOffTrains();

      if ((curr_time % (60 * timeFactor)) == 0) {
        updateWaitingTimes();
      }

      cleanUpTrains();

      curr_time += 30;
      $("#time").html(secondsToReadableTime(curr_time));
    }

    /*** KEEPS WAITING TIMES UP TO DATE ***/
    function updateWaitingTimes() {
      for (var route_id in trainsOnTracks) {
        if (trainsOnTracks.hasOwnProperty(route_id)) {
          var last_wt = trainsOnTracks[route_id].last_waitTime;
          var N_trains = trainsOnTracks[route_id].N;
          var S_trains = trainsOnTracks[route_id].S;

          var N_differences = 0;
          for (var i = 1; i < N_trains.length; i++) {
            N_differences += N_trains[i].start - N_trains[i - 1].start;
          }
          var S_differences = 0;
          for (var i = 1; i < S_trains.length; i++) {
            S_differences += S_trains[i].start - S_trains[i - 1].start;
          }

          var count = 0;
          var avg_diff = 0;
          var rounded_diff = Infinity;
          var new_text = "No trains";
          if (N_trains.length > 1) {
            avg_diff += (N_differences / (N_trains.length - 1)) / 60;
            count++;
          }
          if (S_trains.length > 1) {
            avg_diff += (S_differences / (S_trains.length - 1)) / 60;
            count++;
          }

          if (count == 0) {
            timesSvg.select("#wait_time_" + route_id).text("No trains");
            trainsOnTracks[route_id].last_waitTime = Infinity;
          } else {
            avg_diff = avg_diff / count;
            rounded_diff = Math.round( avg_diff * 10 ) / 10;

            if (rounded_diff != last_wt) {
              var color = rounded_diff < last_wt ? "green" : "red";
              timesSvg.select("#wait_time_" + route_id).text(rounded_diff + " min")
                  .attr("fill", color)
                  .transition().duration(750)
                  .attr("fill", "black")
              trainsOnTracks[route_id].last_waitTime = rounded_diff;
            }
          }
        }
      }
    }

    /*** FIGURES OUT WHICH TRAINS STARTED IN THE LAST INTERVAL ***/
    function kickOffTrains() {
      markersToStart = [];
      while (lastTrainIndex < tripsByDay[dayOfWeek].length && tripsByDay[dayOfWeek][lastTrainIndex].start_time <= curr_time) {
        markersToStart.push(tripsByDay[dayOfWeek][lastTrainIndex]);
        lastTrainIndex++;
      }

      for (var i = 0; i < markersToStart.length; i++) {
        train_obj = markersToStart[i];

        var direction_arr = train_obj.trip_id.split("_")[2].split(".");
        var direction = direction_arr[direction_arr.length - 1][0];
        trainsOnTracks[train_obj.route_id][direction].push({"start": train_obj.start_time, "end": train_obj.end_time});

        if (train_obj.has_shape) {
          duration = train_obj.end_time - train_obj.start_time;

          // If end time is past midnight, add an artificial day to make the numbers right
          if (duration < 0) {
            duration += (3600 * 24)
          }

          path_el = d3.select("[id='shape_" + train_obj.trip_id.split("_")[2] + "']");
          startMarkerTransition(path_el, train_obj.color, duration * 1000 / (60 * timeFactor));
        }
      }
    }

    /*** REMOVES TRAINS THAT HAVE ENDED FROM THE WAIT TIME ARRAYS ***/
    function cleanUpTrains() {
      var directions = ["N", "S"];
      for(var route_id in trainsOnTracks) {
        if (trainsOnTracks.hasOwnProperty(route_id)) {
          for (var j = 0; j < directions.length; j++) {
            var dir = directions[j];
            trains = trainsOnTracks[route_id][dir];
            for (var i = trains.length - 1; i >= 0; i--) {
              if (curr_time >= trains[i].end + (60 * 30)) { // Keep trains for half an hour after they die
                trains.splice(i, 1);
              }
            }
          }
        }
      }
    }

    /*** HANDLES NITTY GRITTY OF ACTUAL TRANSITIONS***/
    function startMarkerTransition(path, color, duration) {
      var startPoint = pathStartPoint(path);
      var startStopDuration = Math.min(250, duration * .1);

      var marker = g.append("circle")
        .attr("r", 0)
        .attr("class", "marker")
        .attr("transform", "translate(" + startPoint + ")")
        .attr("fill", "#" + color)
        .transition().duration(startStopDuration)
          .attr("r", 6)
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
  
    /*** MAKES THE TIME READABLE ***/
    function secondsToReadableTime(time) {
      curr_hour = Math.floor(curr_time / 3600) % 24;
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