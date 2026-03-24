import promoDraftLayoutJson from "./promoDraftLayout.json";

export type PromoDraftGradientStop = {
  color: string;
  opacity: number;
  offset: number;
};

export type PromoDraftGradient = {
  type: "linear" | "radial";
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  width?: number;
  stops: PromoDraftGradientStop[];
};

export type PromoDraftFill = {
  color?: string | null;
  opacity?: number | null;
  gradient?: PromoDraftGradient | null;
};

export type PromoDraftStroke = {
  color: string;
  opacity: number;
  width: number;
};

export type PromoDraftBaseNode = {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blendMode: string;
  zIndex: number;
  visible: boolean;
};

export type PromoDraftShapeNode = PromoDraftBaseNode & {
  kind: "shape";
  shapeType: "rect" | "ellipse" | "board";
  fills: PromoDraftFill[];
  strokes: PromoDraftStroke[];
  cornerRadius: number | null;
  blur: number | null;
};

export type PromoDraftImageNode = PromoDraftBaseNode & {
  kind: "image";
  assetKey: string;
};

export type PromoDraftMaskedImageNode = PromoDraftBaseNode & {
  kind: "masked-image";
  assetKey: string;
  maskPath: string;
  maskPathBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type PromoDraftTextNode = PromoDraftBaseNode & {
  kind: "text";
  text: string;
  fontFamily: string | null;
  fontSize: number;
  fontWeight: string | null;
  lineHeight: string | null;
  letterSpacing: string | null;
  textTransform: string | null;
  textAlign: string | null;
  fills: PromoDraftFill[];
};

export type PromoDraftPathNode = PromoDraftBaseNode & {
  kind: "path";
  path: string;
  fills: PromoDraftFill[];
  strokes: PromoDraftStroke[];
};

export type PromoDraftNode =
  | PromoDraftShapeNode
  | PromoDraftImageNode
  | PromoDraftMaskedImageNode
  | PromoDraftTextNode
  | PromoDraftPathNode;

export type PromoDraftLayout = {
  board: {
    name: string;
    width: number;
    height: number;
  };
  sceneHeight: number;
  scenes: Array<{
    id: string;
    y: number;
    height: number;
  }>;
  nodes: PromoDraftNode[];
};

export const promoDraftLayout = promoDraftLayoutJson as PromoDraftLayout;
