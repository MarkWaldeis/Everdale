export const ASSETS = Object.freeze({
  ground: {
    label: "Boden",
    url: new URL("../../3d Assets/haupt boden .glb", import.meta.url).href,
    target: "tile",
  },
  tree: {
    label: "Waldbäume",
    url: new URL("../../3d Assets/stylized tree 3d model normal tree.glb", import.meta.url).href,
    height: 4.85,
  },
  appleTree: {
    label: "Apfelbäume",
    url: new URL("../../3d Assets/apple tree 3d model.glb", import.meta.url).href,
    height: 4.55,
  },
  blossomTree: {
    label: "Blütenbäume",
    url: new URL("../../3d Assets/pink blossom tree 3d model.glb", import.meta.url).href,
    height: 5.05,
  },
  character: {
    label: "Lena",
    url: new URL("../../3d Assets/player/medieval+girl+3d+model (2).glb", import.meta.url).href,
    height: 1.08,
  },
  characterJohn: {
    label: "John",
    url: new URL("../../3d Assets/player/charackter+john.glb", import.meta.url).href,
    height: 1.08,
  },
  characterSophie: {
    label: "Sophie",
    url: new URL("../../3d Assets/player/girl+sophie.glb", import.meta.url).href,
    height: 1.08,
  },
  cottage: {
    label: "Holzhaus",
    url: new URL("../../3d Assets/wooden cottage 3d model.glb", import.meta.url).href,
    height: 3.75,
  },
  axe: {
    label: "Axt",
    url: new URL("../../3d Assets/axe+3d+model.glb", import.meta.url).href,
    height: 0.3,
  },
  chopKit: {
    label: "Hack-Animation",
    url: new URL("../../3d Assets/girl_chopping_tree.glb", import.meta.url).href,
    raw: true,
  },
  storageEmpty: {
    label: "Holzlager leer",
    url: new URL("../../3d Assets/wood storage/wooden storage empty.glb", import.meta.url).href,
    height: 1.85,
  },
  storageHalf: {
    label: "Holzlager halb",
    url: new URL("../../3d Assets/wood storage/wooden storage half full.glb", import.meta.url).href,
    height: 1.85,
  },
  storageFull: {
    label: "Holzlager voll",
    url: new URL("../../3d Assets/wood storage/wooden log stack 3d model.glb", import.meta.url).href,
    height: 1.7,
  },
  stoneStorageEmpty: {
    label: "Steinlager leer",
    url: new URL("../../3d Assets/stone storage/stone+storrage+empty.glb", import.meta.url).href,
    height: 1.85,
  },
  stoneStorageHalf: {
    label: "Steinlager halb",
    url: new URL("../../3d Assets/stone storage/stone storage few stones.glb", import.meta.url).href,
    height: 1.85,
  },
  stoneStorageFull: {
    label: "Steinlager voll",
    url: new URL("../../3d Assets/stone storage/stone storage full.glb", import.meta.url).href,
    height: 1.85,
  },
  stone: {
    label: "Waldstein",
    url: new URL("../../3d Assets/stone.glb", import.meta.url).href,
    height: 0.92,
  },
  stoneSplit: {
    label: "Spaltstein",
    url: new URL("../../3d Assets/stone-split.glb", import.meta.url).href,
    height: 0.96,
  },
  pickaxe: {
    label: "Spitzhacke",
    url: new URL("../../3d Assets/pickaxe.glb", import.meta.url).href,
    height: 0.32,
  },
  research: {
    label: "Alchemie",
    url: new URL("../../3d Assets/fantasy+alchemy+cottage+3d+model.glb", import.meta.url).href,
    height: 2.7,
  },
});

export const TREE_WEIGHTS = Object.freeze([
  { id: "tree", until: 0.68 },
  { id: "appleTree", until: 0.87 },
  { id: "blossomTree", until: 1 },
]);
