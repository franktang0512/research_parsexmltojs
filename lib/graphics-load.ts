const loadedGraphics: Record<string, HTMLImageElement> = {};

import greenFlag from "@/assets/graphics/green_flag.png";
import tile1 from "@/assets/graphics/tile_1.png";
import tile2 from "@/assets/graphics/tile_2.png";
import tile3 from "@/assets/graphics/tile_3.png";
import tile4 from "@/assets/graphics/tile_4.png";
import mapCharacter from "@/assets/graphics/map_character.png";
import mapCoin from "@/assets/graphics/map_coin.png";
import mapService from "@/assets/graphics/map_service.png";
import mapStore from "@/assets/graphics/map_store.png";

async function loadGraphic(key: string, src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedGraphics[key] = img;
      resolve();
    };
    img.src = src;
  });
}

async function loadAndGetGraphics(): Promise<Record<string, HTMLImageElement>> {
  if (Object.keys(loadedGraphics).length) {
    return loadedGraphics;
  }

  await Promise.all([
    loadGraphic("greenFlag", greenFlag),
    loadGraphic("tile1", tile1),
    loadGraphic("tile2", tile2),
    loadGraphic("tile3", tile3),
    loadGraphic("tile4", tile4),
    loadGraphic("mapCharacter", mapCharacter),
    loadGraphic("mapCoin", mapCoin),
    loadGraphic("mapService", mapService),
    loadGraphic("mapStore", mapStore),
  ]);

  return loadedGraphics;
}

export { loadAndGetGraphics };
