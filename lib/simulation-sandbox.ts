import { toast } from "@/hooks/use-toast";
import {
  Direction,
  Point,
  SimulationState,
  World,
  WorldObject,
  WorldObjects,
} from "./types";
import { worldMaps, generateWorld } from "./world";
import * as Babel from "@babel/standalone";
import { useSimulationStore } from "@/stores/simulation";

/**
 * Don't delete the commented code below.
 * They're sample code used for testing sandbox.
 * They also serve as reference for the expected format of the user's code.
 * The code outputted by Blockly's generator should be similar to the commented code below.
 */

// export const exampleSolverCode = `
//   function decideMoveDirection() {
//     if (playerX() < maxX()) {
//       move("right");
//     } else if (playerY() > 0) {
//       move("up");
//     }
//   }
// `;

// export const exampleSolverCode = `
//   function decideMoveDirection() {
//     const coinRight = getCoinAtPosition(playerX() + 1, playerY());
//     const coinUp = getCoinAtPosition(playerX(), playerY() - 1);

//     if (coinRight > coinUp) {
//       move("right");
//     } else {
//       if (playerY() === 0) {
//         move("right");
//       } else {
//         move("up");
//       }
//     }
//   }
// `;

// Optimal solution for this world configuration (greedy + lookahead)
// export const exampleSolverCode = `
//   function decideMoveDirection() {
//     // If we're at the top row, we can only go right
//     if (playerY() === 0) {
//       move("right");
//       return;
//     }

//     // If we're at the rightmost column, we can only go up
//     if (playerX() === maxX()) {
//       move("up");
//       return;
//     }

//     // Look two steps ahead in each direction
//     const rightCoin = getCoinAtPosition(playerX() + 1, playerY());
//     const rightThenRightCoin = getCoinAtPosition(playerX() + 2, playerY());
//     const rightThenUpCoin = getCoinAtPosition(playerX() + 1, playerY() - 1);
//     const upCoin = getCoinAtPosition(playerX(), playerY() - 1);
//     const upThenUpCoin = getCoinAtPosition(playerX(), playerY() - 2);
//     const upThenRightCoin = getCoinAtPosition(playerX() + 1, playerY() - 1);

//     // Calculate potential coins gain for each path
//     let rightPathCoins;
//     if (rightThenRightCoin > rightThenUpCoin) {
//       rightPathCoins = rightCoin + rightThenRightCoin;
//     } else {
//       rightPathCoins = rightCoin + rightThenUpCoin;
//     }

//     let upPathCoins;
//     if (upThenUpCoin > upThenRightCoin) {
//       upPathCoins = upCoin + upThenUpCoin;
//     } else {
//       upPathCoins = upCoin + upThenRightCoin;
//     }

//     // Choose the path with more coins
//     if (rightPathCoins >= upPathCoins) {
//       move("right");
//     } else {
//       move("up");
//     }
//   }
// `;

// Infinite loop 1
// export const exampleSolverCode = `
//   function decideMoveDirection() {
//     move("right");
//   }
// `;

// Infinite loop 2
// export const exampleSolverCode = `
//   function decideMoveDirection() {
//     let sum = 0;
//     while (true) {
//       sum += 1;
//     }
//     move("right");
//   }
// `;

// Invalid move
// export const exampleSolverCode = `
//   function decideMoveDirection() {
//     move("right");
//     move("right");
//   }
// `;

// Empty function
// export const exampleSolverCode = `
//  function decideMoveDirection() {}
// `;

/**
 *
 * @param userCode unsafe user's code (output of Blockly's generator)
 * @returns array of snapshots of the simulation
 */
export function runSimulation(userCode: string): SimulationState[] {
  const { currentWorldId } = useSimulationStore.getState();
  const currentWorld = generateWorld(
    worldMaps.find((w) => w.id === currentWorldId)?.map || worldMaps[0].map
  );

  /**
   * Code to run inside sandbox
   * - Internal utility functions are postfixed with _
   * - Exposed APIs are not postfixed
   * - Exposed variables are written as function calls because getters are not supported by sandbox. E.g. playerX() instead of playerX
   * - The run function is the main entry point
   * - The run function returns an array of snapshots
   * - The JSON serialization is necessary to pass the result back to the main thread
   *
   * Tips: For debugging, you can use the `log` function to print to the console.
   * - Yes, `log`, not `console.log`.
   */
  const code = `
    "use strict";

    // Polyfills for array methods
    function find_(array, predicate) {
      for (let i = 0; i < array.length; i++) {
        if (predicate(array[i])) {
          return array[i];
        }
      }
      return undefined;
    }

    function filter_(array, predicate) {
      const result = [];
      for (let i = 0; i < array.length; i++) {
        if (predicate(array[i])) {
          result.push(array[i]);
        }
      }
      return result;
    }

    function some_(array, predicate) {
      for (let i = 0; i < array.length; i++) {
        if (predicate(array[i])) {
          return true;
        }
      }
      return false;
    }

    function run() {
      const snapshots_ = [];
      const state_ = {
        world: ${JSON.stringify(currentWorld)},
        playerPos: {x: 0, y: 0},
        coinsCollected: 0,
        gameOver: false,
        lastDirection: "none",
        simulationStarted: false,
      }

      // Functions to convert 2D-array based coordinates to cartesian coordinates
      // (1, 1) is the origin in the bottom-left corner
      function toCartesianX_(arrayX) { return arrayX + 1; }
      function toCartesianY_(arrayY) { return state_.world.length - arrayY; }
      function fromCartesianX_(cartesianX) { return cartesianX - 1; }
      function fromCartesianY_(cartesianY) { return state_.world.length - cartesianY; }

      function findPlayer_() {
        for (let y = 0; y < state_.world.length; y++) {
          for (let x = 0; x < state_.world[0].length; x++) {
            if (some_(state_.world[y][x], obj => obj.type === ${WorldObjects.PLAYER})) {
              return { x, y };
            }
          }
        }
        throw new Error("Player not found in world");
      }

      state_.playerPos = findPlayer_();

      function isValidPosition_(pos) {
        return pos.x >= 0 && pos.x < state_.world[0].length && pos.y >= 0 && pos.y < state_.world.length;
      }

      function movePlayerInWorld_(newPos) {
        // Remove player from old position
        state_.world[state_.playerPos.y][state_.playerPos.x] = filter_(state_.world[state_.playerPos.y][state_.playerPos.x], obj => obj.type !== ${WorldObjects.PLAYER});

        // Add player to new position
        state_.world[newPos.y][newPos.x].push({ type: ${WorldObjects.PLAYER}, data: undefined });

        state_.playerPos = newPos;
      }

      function updateGameState_() {
        const currentCell = state_.world[state_.playerPos.y][state_.playerPos.x];

        // Collision with coin
        const coinObj = find_(currentCell, obj => obj.type === ${WorldObjects.COIN});
        if (coinObj) {
          state_.coinsCollected += coinObj.data.value;
          coinObj.data.value = 0;
        }

        // Collision with destination
        if (some_(currentCell, obj => obj.type === ${WorldObjects.DESTINATION})) {
          state_.gameOver = true;
        }
      }

      // External APIs
      function playerX() { return toCartesianX_(state_.playerPos.x); }
      function playerY() { return toCartesianY_(state_.playerPos.y); }
      function maxX() { return toCartesianX_(state_.world[0].length - 1); }
      function maxY() { return toCartesianY_(0); } // 0 is the top row
      function coinsCount() { return state_.coinsCollected; }

      function move(direction) {
        if (!state_.simulationStarted) {
          return; // prevent executing move function before simulation starts
        }

        // If already moved this step, mark as invalid, and return to original position
        if (state_.movedThisStep) {
          movePlayerInWorld_(state_.stepStartPos);
          state_.lastDirection = "invalid";
          return;
        }

        let newPos; // in array coordinates
        if (direction === "right") {
          newPos = { x: state_.playerPos.x + 1, y: state_.playerPos.y };
        } else if (direction === "up") {
          newPos = { x: state_.playerPos.x, y: state_.playerPos.y - 1 };
        } else {
          throw new Error("Invalid direction: " + direction);
        }

        if (!isValidPosition_(newPos)) {
          return; // stay in place if out of bounds
        }

        movePlayerInWorld_(newPos);
        state_.lastDirection = direction;
        state_.movedThisStep = true;
      }

      function getCoinAtPosition(cartesianX, cartesianY) {
        const x = fromCartesianX_(cartesianX);
        const y = fromCartesianY_(cartesianY);

        if (x < 0 || x >= state_.world[0].length || y < 0 || y >= state_.world.length) {
          return 0;
        }

        const coinObj = find_(state_.world[y][x], obj => obj.type === ${WorldObjects.COIN});
        return coinObj ? coinObj.data.value : 0;
      }

      // Declare user's code (function decideMoveDirection)
      ${userCode}

      // Initial snapshot
      snapshots_.push({
        world: JSON.parse(JSON.stringify(state_.world)),
        gameOver: state_.gameOver,
        accumulatedCoins: state_.coinsCollected,
        direction: state_.lastDirection,
        error: undefined,
      });

      const MAX_CONSECUTIVE_IDLE_STEPS = 3;
      const MAX_CONSECUTIVE_INVALID_MOVES = 3;
      let consecutiveIdleSteps = 0;
      let consecutiveInvalidMoves = 0;

      // Simulation loop
      state_.simulationStarted = true;
      while (!state_.gameOver) {
        state_.lastDirection = "none";
        state_.movedThisStep = false;
        state_.stepStartPos = { x: state_.playerPos.x, y: state_.playerPos.y };

        // Execute user's code
        try {
          decideMoveDirection();
        } catch (e) {
          snapshots_.push({
            world: JSON.parse(JSON.stringify(state_.world)),
            gameOver: true,
            accumulatedCoins: state_.coinsCollected,
            direction: state_.lastDirection,
            error: e.message,
          });
          break;
        }

        // Check for idle steps
        if (state_.lastDirection === "none") {
          consecutiveIdleSteps++;
          if (consecutiveIdleSteps >= MAX_CONSECUTIVE_IDLE_STEPS) {
            snapshots_.push({
              world: JSON.parse(JSON.stringify(state_.world)),
              gameOver: true,
              accumulatedCoins: state_.coinsCollected,
              direction: state_.lastDirection,
              error: "Consecutive idle steps",
            });
            break;
          }
        } else {
          consecutiveIdleSteps = 0;
        }

        // Check for invalid moves
        if (state_.lastDirection === "invalid") {
          consecutiveInvalidMoves++;
          if (consecutiveInvalidMoves >= MAX_CONSECUTIVE_INVALID_MOVES) {
            snapshots_.push({
              world: JSON.parse(JSON.stringify(state_.world)),
              gameOver: true,
              accumulatedCoins: state_.coinsCollected,
              direction: state_.lastDirection,
              error: "Consecutive invalid moves",
            });
            break;
          }
        }

        updateGameState_();

        snapshots_.push({
          world: JSON.parse(JSON.stringify(state_.world)),
          gameOver: state_.gameOver,
          accumulatedCoins: state_.coinsCollected,
          direction: state_.lastDirection,
          error: undefined,
        });
      }

      return snapshots_;
    }

    const res = run();
    JSON.stringify(res);
  `;

  let transformedCode;
  try {
    transformedCode = Babel.transform(code, { presets: ["es2015"] }).code;
  } catch (e) {
    console.error("Failed to transform code:", e);
    throw new Error("Failed to transform code");
  }

  if (!transformedCode) {
    throw new Error("Transformed code is empty");
  }

  try {
    const interpreter = new window.Interpreter(
      transformedCode,
      (interpreter, globalObject) => {
        interpreter.setProperty(
          globalObject,
          "log", // inject a function called `log` into the global object for debugging purposes
          interpreter.createNativeFunction(console.log, false)
        );
      }
    );

    let steps = 0;
    const maxSteps = 2000000;
    while (interpreter.step() && steps < maxSteps) {
      steps++;
    }

    if (steps >= maxSteps) {
      return [
        {
          world: currentWorld,
          gameOver: true,
          accumulatedCoins: 0,
          direction: "none",
          error: "Infinite loop",
        },
      ];
    }

    const snapshots = JSON.parse(interpreter.value);

    if (!isValidSimulationSnapshots(snapshots)) {
      throw new Error("Invalid simulation snapshots");
    }

    return snapshots;
  } catch (e) {
    console.error("Sandbox execution error:", e);
    toast({
      variant: "destructive",
      title: "錯誤",
      description: "程式執行發生錯誤，請再檢查程式。",
      duration: 4000,
    });
    throw new Error("Sandbox execution error");
  }
}

/**
 * Validate the simulation snapshots
 * @param snapshots
 * @returns true if valid, false otherwise
 */
function isValidSimulationSnapshots(snapshots: SimulationState[]): boolean {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    console.error("Snapshots must be a non-empty array");
    return false;
  }

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];

    if (!snapshot.world || !Array.isArray(snapshot.world)) {
      console.error(`Snapshot ${i}: Invalid world structure`);
      return false;
    }

    if (typeof snapshot.gameOver !== "boolean") {
      console.error(`Snapshot ${i}: gameOver must be boolean`);
      return false;
    }

    if (typeof snapshot.accumulatedCoins !== "number") {
      console.error(`Snapshot ${i}: accumulatedCoins must be number`);
      return false;
    }

    if (!["right", "up", "none", "invalid"].includes(snapshot.direction)) {
      console.error(`Snapshot ${i}: Invalid direction`);
      return false;
    }

    const world = snapshot.world;
    const height = world.length;
    const width = world[0]?.length;

    if (!height || !width) {
      console.error(`Snapshot ${i}: World has invalid dimensions`);
      return false;
    }

    // Check each cell
    let playerCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = world[y][x];

        if (!Array.isArray(cell)) {
          console.error(`Snapshot ${i}: Cell at [${y}][${x}] is not an array`);
          return false;
        }

        // Check objects in cell
        for (const obj of cell) {
          if (!isValidWorldObject(obj)) {
            console.error(`Snapshot ${i}: Invalid object at [${y}][${x}]`, obj);
            return false;
          }

          if (obj.type === WorldObjects.PLAYER) {
            playerCount++;
          }
        }
      }
    }

    // Verify exactly one player exists
    if (playerCount !== 1) {
      console.error(`Snapshot ${i}: Found ${playerCount} players, expected 1`);
      return false;
    }

    // If not the last snapshot, verify consecutive snapshots are valid
    if (i < snapshots.length - 1) {
      const current = snapshot;
      const next = snapshots[i + 1];

      // Verify player movement
      const [currentPos, nextPos] = [
        findPlayerPosition(current.world),
        findPlayerPosition(next.world),
      ];

      if (!isValidMove(currentPos, nextPos, next.direction)) {
        console.error(
          `Invalid move from ${JSON.stringify(currentPos)} to ${JSON.stringify(
            nextPos
          )} with direction ${next.direction}`
        );
        return false;
      }

      if (next.accumulatedCoins < current.accumulatedCoins) {
        console.error(
          `Coins decreased from ${current.accumulatedCoins} to ${next.accumulatedCoins}`
        );
        return false;
      }
    }
  }

  return true;
}

function isValidWorldObject(obj: unknown): obj is WorldObject {
  if (!obj || typeof obj !== "object") return false;
  if (!("type" in obj)) return false;

  if (
    obj.type === WorldObjects.EMPTY ||
    obj.type === WorldObjects.PLAYER ||
    obj.type === WorldObjects.DESTINATION
  ) {
    if ("data" in obj) {
      return obj.data === undefined;
    }
    return true;
  }

  if (obj.type === WorldObjects.COIN) {
    return (
      "data" in obj &&
      obj.data !== null &&
      typeof obj.data === "object" &&
      "value" in obj.data &&
      typeof obj.data.value === "number"
    );
  }

  return false;
}

function findPlayerPosition(world: World): Point {
  for (let y = 0; y < world.length; y++) {
    for (let x = 0; x < world[0].length; x++) {
      if (world[y][x].some((obj) => obj.type === WorldObjects.PLAYER)) {
        return { x, y };
      }
    }
  }
  throw new Error("Player not found");
}

function isValidMove(from: Point, to: Point, direction: Direction): boolean {
  switch (direction) {
    case "right":
      return to.x === from.x + 1 && to.y === from.y;
    case "up":
      return to.x === from.x && to.y === from.y - 1;
    case "none":
      return to.x === from.x && to.y === from.y;
    case "invalid":
      return to.x === from.x && to.y === from.y;
    default:
      return false;
  }
}
