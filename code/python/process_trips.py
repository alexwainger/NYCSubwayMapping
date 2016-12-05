import csv

test = ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'stop_headsign', 'pickup_type', 'drop_off_type', 'shape_dist_traveled']

def main():

	# Trims down stop times file, 
	with open("data/MTAGTFS/stop_times.csv", "rb") as stop_times, open("data/MTAGTFS/stop_times_small.csv", "wb") as output:
		reader = csv.reader(stop_times);
		writer = csv.writer(output);
		header = next(reader);
		last_line = header;
		for line in reader:
			if line[0] != last_line[0]:
				writer.writerow(last_line[0:3]);
				writer.writerow(line[0:3]);

			last_line = line;

		writer.writerow(last_line[0:3]);

	with open("data/MTAGTFS/stop_times_small.csv", "rb") as stop_times_small, open("data/MTAGTFS/trips.csv", "rb") as trips, open("data/MTAGTFS/stop_times_shapes_bool.csv", "wb") as output:
		trips_reader = csv.reader(trips);
		stops_reader = csv.reader(stop_times_small);
		writer = csv.writer(output);

		next(trips_reader, None);
		stops_header = next(stops_reader);
		writer.writerow(stops_header + ["has_shape"]);

		trip_has_shape = set();
		for line in trips_reader:
			if line[-1] != "":
				trip_has_shape.add(line[2]);

		for line in stops_reader:
			writer.writerow(line + [line[0] in trip_has_shape]);

if __name__ == "__main__":
	main();