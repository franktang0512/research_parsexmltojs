import { World, WorldObjects } from "./types";

export function generateWorld(map: number[][]): World {
  const ROW = map.length;
  const COL = map[0].length;

  // Create empty world of size ROW x COL
  const world: World = [];
  for (let r = 0; r < ROW; r++) {
    world[r] = [];
    for (let c = 0; c < COL; c++) {
      world[r][c] = [
        {
          type: WorldObjects.EMPTY,
          data: undefined,
        },
      ];
    }
  }

  // Fill world with coins
  for (let r = 0; r < ROW; r++) {
    for (let c = 0; c < COL; c++) {
      if (map[r][c] > 0) {
        world[r][c] = [
          {
            type: WorldObjects.COIN,
            data: { value: map[r][c] },
          },
        ];
      }
    }
  }

  // Set destination in top-right corner
  world[0][COL - 1] = [
    {
      type: WorldObjects.DESTINATION,
      data: undefined,
    },
  ];

  // Set player in bottom-left corner
  world[ROW - 1][0].push({
    type: WorldObjects.PLAYER,
    data: undefined,
  });

  return world;
}

export const map1 = [
  [0, 2, 0, 2, 0],
  [2, 0, 2, 1, 3],
  [0, 3, 2, 1, 0],
  [2, 0, 1, 0, 2],
  [0, 2, 0, 2, 0],
  [0, 3, 2, 0, 2],
];

export const map2 = [
  [3, 0, 3, 0, 2, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 3, 0, 0, 0, 0],
  [0, 0, 2, 0, 0, 3, 1, 3, 1, 2],
  [3, 0, 1, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
  [2, 0, 2, 1, 0, 2, 0, 0, 3, 0],
  [1, 0, 1, 3, 0, 1, 1, 0, 0, 3],
  [2, 0, 2, 0, 0, 3, 2, 2, 2, 0],
  [0, 2, 0, 0, 3, 0, 1, 0, 1, 0],
];

export const map3 = [
  [1, 1, 1, 1, 1, 1, 2, 2, 2, 0, 2, 0],
  [1, 1, 0, 1, 1, 1, 2, 0, 2, 2, 2, 2],
  [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0],
  [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 0],
  [1, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 0],
  [1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 2, 3],
  [3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 0],
  [1, 1, 1, 1, 0, 1, 2, 0, 2, 2, 0, 2],
  [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
];

export const worldMaps = [
  {
    id: 1,
    name: "商圈 1",
    map: map1,
  },
  {
    id: 2,
    name: "商圈 2",
    map: map2,
  },
  {
    id: 3,
    name: "商圈 3",
    map: map3,
  },
];
