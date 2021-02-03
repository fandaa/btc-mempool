import { BtcTransaction, HttpProxy } from "./types.ts";

export const createBtcRpc = (resource: URL): HttpProxy =>
  new Proxy({}, {
    get(target, method) {
      return async (params: any = []) => {
        const response = await fetch(resource, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "1.0",
            method,
            params,
          }),
        });
        return await response.json();
      };
    },
  });

export function processTx(
  tx: BtcTransaction,
): { feePerByte: number; sizeBytes: number; fee: number; feeSatoshi: number } {
  const sizeBytes = tx["vsize"];
  const fee = tx["fee"];
  const feeSatoshi = fee * 100_000_000;

  const aSize = tx["ancestorsize"];
  const aFees = tx["ancestorfees"];
  const dSize = tx["descendantsize"];
  const dFees = tx["descendantfees"];

  const afpb = aFees / aSize; // ancestor fee (includes current)
  const fpb = feeSatoshi / sizeBytes; // current fee
  const dfpb = dFees / dSize; // descendant fee (includes current)

  // total average fee for mining all ancestors and descendants.
  const tfpb = (aFees + dFees - feeSatoshi) / (aSize + dSize - sizeBytes);
  const feePerByte = Math.max(
    Math.min(dfpb, tfpb),
    Math.min(fpb, afpb),
  );

  return {
    feePerByte,
    sizeBytes,
    fee,
    feeSatoshi,
  };
}

export const sleepMs = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
