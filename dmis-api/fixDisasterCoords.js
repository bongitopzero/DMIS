import mongoose from "mongoose";
import Disaster from "./models/Disaster.js";

const uri = "mongodb://localhost:27017/dmis";

const districtCoordinates = {
  "berea": [-29.3, 28.3],
  "butha-buthe": [-29.1, 28.7],
  "leribe": [-29.3, 28.0],
  "mafeteng": [-29.7, 27.7],
  "maseru": [-29.6, 27.5],
  "mohale's hoek": [-30.1, 28.1],
  "mokhotlong": [-30.4, 29.3],
  "qacha's nek": [-30.7, 29.1],
  "quthing": [-30.7, 28.9],
  "thaba tseka": [-29.5, 29.2]
};

async function fixCoordinates() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const allDisasters = await Disaster.find();
    console.log(`Found ${allDisasters.length} disasters`);

    for (let d of allDisasters) {
      const districtKey = d.district.toLowerCase();
      const coords = districtCoordinates[districtKey];

      if (coords && (!d.latitude || !d.longitude)) {
        await Disaster.findByIdAndUpdate(d._id, {
          latitude: coords[0],
          longitude: coords[1]
        });
        console.log(`Updated ${d.district} with coords [${coords[0]}, ${coords[1]}]`);
      } else if (!coords) {
        console.log(`No coordinates found for district: ${d.district}`);
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fixCoordinates();
