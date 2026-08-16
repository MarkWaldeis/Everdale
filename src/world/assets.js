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
    label: "Dorfbewohnerin",
    url: new URL("../../3d Assets/medieval+girl+3d+model (2).glb", import.meta.url).href,
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
});

export const TREE_WEIGHTS = Object.freeze([
  { id: "tree", until: 0.68 },
  { id: "appleTree", until: 0.87 },
  { id: "blossomTree", until: 1 },
]);
