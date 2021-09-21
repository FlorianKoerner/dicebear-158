import { createAvatar, StyleSchema, utils } from "@dicebear/avatars";
import * as style from "@dicebear/open-peeps";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

// Number of avatars to create
const count: number = 100;

// Target directory
const target: string = __dirname + "/avatars";

// Avatar format
const format: string = "png";

// Avatar size
const size: number = 200;

(async () => {
  for (let i = 0; i < count; i++) {
    console.log(`Create Avatar ${i}`);

    const seed = i.toString();
    const prng = utils.prng.create(seed);
    const options: Record<string, unknown> = {
      seed,
      size,
    };

    const properties = style.schema.properties;

    // Collect all avatar style options using schema.json.
    for (const key in properties) {
      if (false === properties.hasOwnProperty(key)) {
        continue;
      }

      const property = properties[key] as StyleSchema;

      if (key.toString().match(/Probability$/)) {
        // Ignore probability fields for now
        continue;
      }

      if (Array.isArray(property.default)) {
        // We select exactly one value from the default values.
        options[key] = [prng.pick(property.default)];

        // Check whether a probability can be specified for the value.
        const probabilityName = `${key}Probability`;
        if (probabilityName in properties) {
          const probability = properties[probabilityName] as StyleSchema;

          // Get default probability
          const defaultProbability =
            typeof probability.default === "number" ? probability.default : 50;

          // Set probability to either 0 or 100 to know clearly later whether value was used or not.
          if (prng.bool(defaultProbability)) {
            options[probabilityName] = 0;
            options[key] = [];
          } else {
            options[probabilityName] = 100;
          }
        }

        continue;
      }

      throw new Error(`Don't know how to handle "${key}".`);
    }

    // Make sure that the target directory exists.
    await fs.ensureDir(target);

    // Write options for JSON
    await fs.writeFile(
      path.join(target, `${seed}.json`),
      JSON.stringify(options, null, 2)
    );

    // Render avatar
    const avatar = createAvatar(style, options);

    // Write avatar to file
    const fileName = path.join(target, `${seed}.${format}`);

    switch (format) {
      case "png":
        await sharp(Buffer.from(avatar)).png().toFile(fileName);
        break;

      case "jpg":
      case "jpeg":
        await sharp(Buffer.from(avatar)).jpeg().toFile(fileName);
        break;

      default:
        await fs.writeFile(fileName, avatar, { encoding: "utf-8" });
    }
  }
})();
