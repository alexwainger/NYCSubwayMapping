import csv
from dateutil import parser

def fix_time(time_str):
	time_arr = time_str.split(":");
	fixed_hour_int = int(time_arr[0]) % 24;

	return str((fixed_hour_int * 3600) + (int(time_arr[1]) * 60) + int(time_arr[2]));

def main():

	# Trims down stop times file, only keeps start and end of trip
	with open("data/MTAGTFS/stop_times.csv", "rb") as stop_times, open("data/MTAGTFS/stop_times_small.csv", "wb") as output:
		reader = csv.reader(stop_times);
		writer = csv.writer(output);
		header = next(reader);

		writer.writerow(["trip_id","start_time","end_time"])
		trip_start = next(reader);
		last_line = trip_start;
		for line in reader:
			trip_id = line[0];
			if trip_id != trip_start[0]:
				writer.writerow([trip_start[0], fix_time(trip_start[1]), fix_time(last_line[1])]);
				trip_start = line;

			last_line = line;

		writer.writerow([trip_start[0], fix_time(trip_start[1]), fix_time(last_line[1])]);

	# Adds boolean indicating whether or not there is a shape id associated with the trip
	# and the color the dot should be
	with open("data/MTAGTFS/stop_times_small.csv", "rb") as stop_times_small, open("data/MTAGTFS/trips.csv", "rb") as trips, open("data/MTAGTFS/stop_times_shapes_bool.csv", "wb") as output, open("data/MTAGTFS/routes.csv", "rb") as routes:
		routes_reader = csv.reader(routes);
		trips_reader = csv.reader(trips);
		stops_reader = csv.reader(stop_times_small);
		writer = csv.writer(output);

		next(routes_reader, None);
		next(trips_reader, None);
		stops_header = next(stops_reader);
		writer.writerow(stops_header + ["has_shape", "color"]);

		route_colors = {};
		for line in routes_reader:
			route_colors[line[0]] = line[-2];

		trip_has_shape = set();
		trip_colors = {};
		for line in trips_reader:
			trip_colors[line[2]] = route_colors[line[0]];
			if line[-1] != "":
				trip_has_shape.add(line[2]);

		for line in stops_reader:
			writer.writerow(line + [line[0] in trip_has_shape, trip_colors[line[0]]]);

	# Sort the lines by starting time
	with open("data/MTAGTFS/stop_times_shapes_bool.csv", 'rb') as stop_times, open("data/MTAGTFS/stop_times_final_sorted.csv", 'wb') as output:
		reader = csv.reader(stop_times);
		writer = csv.writer(output);
		writer.writerow(next(reader));

		lines = [];
		for line in reader:
			lines.append(line);

		lines.sort(key=lambda x: int(x[1]));
		for line in lines:
			writer.writerow(line);

if __name__ == "__main__":
	main();