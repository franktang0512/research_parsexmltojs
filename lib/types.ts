import * as Blockly from "blockly";

export type Direction = "right" | "up" | "none" | "invalid";
export type Point = { x: number; y: number };
export const WorldObjects = {
  EMPTY: 0,
  COIN: 1,
  PLAYER: 2,
  DESTINATION: 3,
} as const;
export type Empty = typeof WorldObjects.EMPTY;
export type Player = typeof WorldObjects.PLAYER;
export type Destination = typeof WorldObjects.DESTINATION;
export type Coin = typeof WorldObjects.COIN;
export type EmptyData = undefined;
export type CoinData = { value: number };
export type PlayerData = undefined;
export type DestinationData = undefined;
export type WorldObject =
  | { type: Empty; data: EmptyData }
  | { type: Coin; data: CoinData }
  | { type: Player; data: PlayerData }
  | { type: Destination; data: DestinationData };
export type World = WorldObject[][][]; // 3D because objects can overlap
export interface SimulationState {
  world: World;
  gameOver: boolean;
  accumulatedCoins: number;
  direction: Direction;
  error?: string;
}
export type SolverFn = () => void; // The solver is a procedure that modifies global state

// Blockly
export interface ScratchFunctionParameter {
  name: string;
  type: "NumberString" | "Boolean" | "Label";
}

export interface ScratchFunctionBlockJson {
  type: string;
  fields: {
    NAME: string;
    [key: string]: string;
  };
  parameters_: ScratchFunctionParameter[];
}

export interface ScratchFunctionBlockProps {
  parameters_: ScratchFunctionParameter[];
  mutationToDom(): Element;
  domToMutation(xmlElement: Element): void;
  addParameter(name: string, type: ScratchFunctionParameter["type"]): void;
}

export type ScratchFunctionBlock = Blockly.BlockSvg & ScratchFunctionBlockProps;
