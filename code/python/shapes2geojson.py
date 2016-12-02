import csv
import json
from collections import defaultdict
def main():
	with open("data/MTAGTFS/shapes.csv", "rb") as shape_file:
		reader = csv.reader(shape_file);
		next(reader, None);

		id_to_lat_lon_order_tuples = defaultdict(list);

		for line in reader:
			s_id = line[0];
			lat = line[1];
			lon = line[2];
			order = int(line[3]);

			id_to_lat_lon_order_tuples[s_id].append( ([lat, lon], order) );

		geoJson = {"type": "FeatureCollection", "features": []};

		for s_id in id_to_lat_lon_order_tuples:
			latlon_order_list = id_to_lat_lon_order_tuples[s_id];
			sorted_by_order = sorted(latlon_order_list, key=lambda tup: tup[1]);
			just_sorted_latlons = [tup[0] for tup in sorted_by_order];
			geoJsonFeature = {	"type": "Feature",
								"geometry": {
									"type": "LineString",
									"coordinates": just_sorted_latlons
								},
								"properties": {
									"shape_id": s_id
								}
							};
			geoJson["features"].append(geoJsonFeature);

		with open("data/MTAGTFS/shapes.json", "wb") as outfile:
			json.dump(geoJson, outfile);



if __name__ == "__main__":
	main();