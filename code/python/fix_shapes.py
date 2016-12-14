import csv

def main():
	shapes_dict = {};
	trips_without_shapes = [];
	with open("data/MTAGTFS/trips.csv", "rb") as trips:
		reader = csv.reader(trips);
		next(reader, None);
		for line in reader:
			if line[-1] == "":
				trips_without_shapes.append(line[2]);

	
	with open("data/MTAGTFS/shapes.csv", "rb") as shapes:
		reader = csv.reader(shapes);
		next(reader, None);
		for line in reader:
			key = (float(line[1]), float(line[2]));
			shapes_dict[ (float(line[1]), float(line[2])) ] = line[0];





if __name__ == "__main__":
	main();