import { describe, expect, it } from "vitest";
import { isOpenPhotoLicence, trailPhotosSchema } from "../src/trail";
import { getTrailPhotos } from "../src/trails";

describe("isOpenPhotoLicence", () => {
  it.each(["cc-by-2.0", "cc-by-4.0", "cc-by-sa-3.0", "cc-by-sa-4.0", "cc-by-sa-2.5-au", "CC-BY-SA-3.0-AU", "cc0", "pd", " pd "])("accepts %s", (code) =>
    expect(isOpenPhotoLicence(code)).toBe(true),
  );
  it.each(["cc-by-nc-2.0", "cc-by-nd-4.0", "cc-by-nc-sa-3.0", "gfdl", "attribution", "fal", "", "cc-by"])("rejects %s", (code) =>
    expect(isOpenPhotoLicence(code)).toBe(false),
  );
});

const photo = {
  file: "photos/1234-0a1b2c3d.jpg",
  commonsTitle: "File:View from Mt Ainslie.jpg",
  title: "View from Mt Ainslie",
  author: "A. Walker",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:View_from_Mt_Ainslie.jpg",
};

describe("trailPhotosSchema", () => {
  it("accepts an empty file", () => expect(trailPhotosSchema.parse({})).toEqual({}));
  it("accepts photos by OSM relation id", () => expect(trailPhotosSchema.parse({ "1234": [photo] })).toEqual({ "1234": [photo] }));
  it("allows a public-domain photo without a licence URL", () => {
    const { licenceUrl: _, ...pd } = { ...photo, licence: "Public domain" };
    expect(trailPhotosSchema.safeParse({ "1234": [pd] }).success).toBe(true);
  });
  it("rejects more than three photos", () => expect(trailPhotosSchema.safeParse({ "1234": [photo, photo, photo, photo] }).success).toBe(false));
  it("rejects a photo without an author", () => expect(trailPhotosSchema.safeParse({ "1234": [{ ...photo, author: "" }] }).success).toBe(false));
  it("rejects a file outside photos/", () => expect(trailPhotosSchema.safeParse({ "1234": [{ ...photo, file: "https://example.com/a.jpg" }] }).success).toBe(false));
  it("rejects a key that isn't an OSM relation id", () => expect(trailPhotosSchema.safeParse({ "mt-ainslie-1234": [photo] }).success).toBe(false));
});

describe("getTrailPhotos", () => {
  it("returns an empty list for a trail without photos", () => expect(getTrailPhotos(-1)).toEqual([]));
});
