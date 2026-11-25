/** Photos on the home page, all from Wikimedia Commons. Every photo shows this credit where it appears. */
export type Photo = { src: string; alt: string; author: string; licence: string; page: string };

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const HOME_PHOTOS = {
  hero: { src: "/photos/home/gudgenby.jpg", alt: "Clear water running over granite boulders on the Gudgenby River in Namadgi National Park", author: "Neutraldensity (Andrew Taylor)", licence: "CC BY-SA 4.0", page: commons("Gudgenby_River_-_Namadgi_NP.jpg") },
  short: { src: "/photos/home/wetlands-view.jpg", alt: "", author: "AcaciaFlowstone", licence: "CC BY-SA 4.0", page: commons("Jerrabomberra_Wetlands_view.jpg") },
  morning: { src: "/photos/home/mulligans-echidna.jpg", alt: "", author: "Wildlifecartoons", licence: "CC BY-SA 4.0", page: commons("Echidna_walking_in_Mulligans_Flat_Nature_Reserve,_ACT.jpg") },
  long: { src: "/photos/home/pine-island.jpg", alt: "", author: "Nick-D", licence: "CC BY-SA 4.0", page: commons("Pine_Island_May_2020.jpg") },
  all: { src: "/photos/home/ainslie-lookout.jpg", alt: "", author: "Orion Kahza", licence: "CC0", page: commons("Canberra_from_Mount_Ainslie_Lookout.jpg") },
} satisfies Record<string, Photo>;
