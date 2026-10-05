// Curated figure assets: past-paper item id → harvested page image (relative URL).
// Built from NotebookLM figure harvest (figures/_raw/manifest.json) after
// cell-level verification of every caption ("FIGURE n", numbered labels, A-D).
// Items absent from this map that still reference a figure get the honest
// practice gate ("the image isn't in this offline bank") instead of a guess.
export const FIGURE_MAP = Object.freeze({
  // Information Technology — November 2018
  "past:intro-2018nov-qp:2.3": "figures/_raw/intro-2018nov-qp/img-32_691x618.jpg",
  "past:intro-2018nov-qp:5.2": "figures/_raw/intro-2018nov-qp/img-40_557x447.jpg",
  "past:intro-2018nov-qp:5.2.2": "figures/_raw/intro-2018nov-qp/img-40_557x447.jpg",

  // Mechanical Engineering Science — NC2090
  "past:mech-nc2090-qp:1.4": "figures/_raw/mech-nc2090-qp/img-16_601x674.jpg",
  "past:mech-nc2090-qp:1.5": "figures/_raw/mech-nc2090-qp/img-16_601x674.jpg",
  "past:mech-nc2090-qp:1.6": "figures/_raw/mech-nc2090-qp/img-41_598x214.jpg",
  "past:mech-nc2090-qp:1.7": "figures/_raw/mech-nc2090-qp/img-41_598x214.jpg",
  "past:mech-nc2090-qp:3.5": "figures/_raw/mech-nc2090-qp/img-58_667x504.jpg",

  // Mechatronics — NC2100
  "past:mech-nc2100-qp:1.1": "figures/_raw/mech-nc2100-qp/img-18_600x783.jpg",
  "past:mech-nc2100-qp:1.2": "figures/_raw/mech-nc2100-qp/img-18_600x783.jpg",
  "past:mech-nc2100-qp:2.1": "figures/_raw/mech-nc2100-qp/img-34_667x577.jpg",
  "past:mech-nc2100-qp:4.2": "figures/_raw/mech-nc2100-qp/img-61_685x733.jpg",
  "past:mech-nc2100-qp:4.3": "figures/_raw/mech-nc2100-qp/img-60_537x312.jpg",

  // Manual Manufacturing — NC1780, November 2013
  "past:mm-nc1780-qp:1.5": "figures/_raw/mm-nc1780-qp/img-08_595x421.jpg",
  "past:mm-nc1780-qp:2.1": "figures/_raw/mm-nc1780-qp/img-27_747x643.jpg",
  "past:mm-nc1780-qp:3.1.1": "figures/_raw/mm-nc1780-qp/img-26_553x280.jpg",
  "past:mm-nc1780-qp:3.1.2": "figures/_raw/mm-nc1780-qp/img-26_553x280.jpg",
  "past:mm-nc1780-qp:3.1.3": "figures/_raw/mm-nc1780-qp/img-26_553x280.jpg",
  "past:mm-nc1780-qp:4.5": "figures/_raw/mm-nc1780-qp/img-66_747x722.jpg",

  // Mechanical Manufacturing — NC1810, 2019
  "past:mm-nc1810-qp-2019:1.3": "figures/_raw/mm-nc1810-qp-2019/img-09_504x323.jpg",
  "past:mm-nc1810-qp-2019:3.2": "figures/_raw/mm-nc1810-qp-2019/img-18_667x722.jpg",
  "past:mm-nc1810-qp-2019:5.3": "figures/_raw/mm-nc1810-qp-2019/img-78_667x700.jpg",
});
