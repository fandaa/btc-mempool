export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [member: string]: JsonValue };
export type JsonArray = JsonValue[];

export interface RpcRequest {
  method: string;
  params?: any;
}

export type HttpProxyFunction = {
  (params?: RpcRequest["params"]): Promise<JsonValue | undefined>;
};

export type HttpProxy = {
  [method: string]: HttpProxyFunction;
};

export type BtcFee = {
  base: number;
  modified: number;
  ancestor: number;
  descendant: number;
};

export type BtcTransaction = {
  fee: number;
  fees: BtcFee;
  vsize: number;
  descendantsize: number;
  descendantfees: number;
  ancestorsize: number;
  ancestorfees: number;
};
