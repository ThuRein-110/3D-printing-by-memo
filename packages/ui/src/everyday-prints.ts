// Licensed photographs for the public brochure gallery. The source links describe each image's license.
export const everydayPrints = [
 {
  "id": "drawer",
  "image": "/everyday/drawer.webp",
  "width": 1200,
  "height": 1127,
  "title": "Gridfinity drawer and bin.jpg",
  "creator": "Sandstein",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Gridfinity_drawer_and_bin.jpg",
  "license": "CC0",
  "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0"
 },
 {
  "id": "pen",
  "image": "/everyday/pen.webp",
  "width": 900,
  "height": 1200,
  "title": "Hyperboloid Pen Holder (5874134092).jpg",
  "creator": "syvwlch",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hyperboloid_Pen_Holder_(5874134092).jpg",
  "license": "CC BY 2.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/2.0"
 },
 {
  "id": "electronics",
  "image": "/everyday/electronics.webp",
  "width": 1200,
  "height": 900,
  "title": "Raspberry with case.jpg",
  "creator": "Lorenzo Toscano",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raspberry_with_case.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 {
  "id": "tape",
  "image": "/everyday/tape.webp",
  "width": 1200,
  "height": 784,
  "title": "Tape dispensers and 3D printed tape dispenser cores.jpg",
  "creator": "Frank Markesteijn",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Tape_dispensers_and_3D_printed_tape_dispenser_cores.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 {
  "id": "clip",
  "image": "/everyday/clip.webp",
  "width": 1200,
  "height": 900,
  "title": "3D-printed Carabiner Clip.jpg",
  "creator": "Creative Tools",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:3D-printed_Carabiner_Clip.jpg",
  "license": "CC BY 2.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/2.0"
 },
 {
  "id": "lens",
  "image": "/everyday/lens.webp",
  "width": 1200,
  "height": 801,
  "title": "Sony A7 LA-EA4 Tamron Minolta 17-35mm F2.8-4 3D printed lens hood.jpg",
  "creator": "Frank Markesteijn",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sony_A7_LA-EA4_Tamron_Minolta_17-35mm_F2.8-4_3D_printed_lens_hood.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 }
] as const;

export type EverydayPrint = typeof everydayPrints[number];
