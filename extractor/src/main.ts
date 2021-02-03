import { denodb } from "./deps.ts";
import { BtcTransaction, HttpProxy } from "./types.ts";
import { createBtcRpc, processTx, sleepMs } from "./utils.ts";

const { DataTypes, Database, Model, PostgresConnector } = denodb;

const btcNode = new URL(
  `http://${Deno.env.get("BITCOIN_RPCHOST") || "btc-node"}`,
);
btcNode.port = Deno.env.get("BITCOIN_RPCPORT") || "25501";
btcNode.username = Deno.env.get("BITCOIN_RPCUSER") || "";
btcNode.password = Deno.env.get("BITCOIN_RPCPASSWORD") || "";

// deno-fmt-ignore
const FEE_SAT_GRANULARITY = [
  0.0001, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
  12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 120, 130, 140, 150, 175, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
  1500, 2000, 2500,
]

class BtcMempoolData extends Model {
  static table = "btc_mempool_data";
  static timestamps = true; // adds created_at & updated_at

  static fields = {
    id: { primaryKey: true, autoIncrement: true },
    sizes: DataTypes.JSONB,
    counts: DataTypes.JSONB,
    fees: DataTypes.JSONB,
    totalFees: { type: DataTypes.DECIMAL, precision: 12 },
    totalMBSize: { type: DataTypes.DECIMAL, precision: 5 },
    totalCount: DataTypes.INTEGER,
  };
}

async function process(): Promise<number> {
  try {
    console.log("Starting processing mempool...");

    const rpc: HttpProxy = createBtcRpc(btcNode);
    const { result }: any = await rpc.getrawmempool([true]);
    const mempool: Array<BtcTransaction> = result;

    const sizes = new Array(FEE_SAT_GRANULARITY.length).fill(0);
    const counts = new Array(FEE_SAT_GRANULARITY.length).fill(0);
    const fees = new Array(FEE_SAT_GRANULARITY.length).fill(0);

    for (const [txId, txData] of Object.entries(mempool)) {
      const { feePerByte, sizeBytes, feeSatoshi } = processTx(txData);

      for (let i = 0; i < FEE_SAT_GRANULARITY.length; i++) {
        const feeLimit = FEE_SAT_GRANULARITY[i];
        const nextFeeLimit = FEE_SAT_GRANULARITY[i + 1];
        const isLastFeeLimit = i === (FEE_SAT_GRANULARITY.length - 1);

        // fee is GTE than curret limit and smaller than next fee limit
        if (
          feePerByte >= feeLimit &&
          (isLastFeeLimit || feePerByte < nextFeeLimit)
        ) {
          sizes[i] += sizeBytes;
          counts[i] += 1;
          fees[i] += feeSatoshi;
          break;
        }
      }
    }

    const totalFees = fees.reduce((acc, val) => acc + val, 0);
    const totalBytes = sizes.reduce((acc, val) => acc + val, 0);
    const totalCount = counts.reduce((acc, val) => acc + val, 0);

    const totalMBSize = totalBytes / 1024 /*kB*/ / 1024; /*MB*/
    const totalBTCFee = totalFees / 100_000_000;

    console.log("Mempool processed, saving to DB...");

    if (totalCount !== 0) {
      await (<any> BtcMempoolData).create({
        sizes: JSON.stringify(sizes),
        counts: JSON.stringify(counts),
        fees: JSON.stringify(fees),
        totalFees,
        totalMBSize,
        totalCount,
      });

      console.log(`Saved to DB.`);
    } else {
      console.log(
        `Not saved as the mempool is empty (still syncing the node probably?).`,
      );
    }

    console.log(
      `${totalBTCFee} BTC in ${totalCount} txs, mempool has ${
        totalMBSize.toFixed(2)
      }MB.`,
    );

    return 0;
  } catch (e) {
    console.error(e);
    return -1;
  }
}

async function setupDb(db: any) {
  db.link([BtcMempoolData]);
  await db.sync({ drop: false });
}

async function main() {
  const processMempoolEverySeconds = 60;

  console.log(
    `Starting data extractor (processing mempool every ${processMempoolEverySeconds} seconds)...`,
  );

  // wait for Postgre to initialize
  await sleepMs(10000);

  const pgConnection = new PostgresConnector({
    host: Deno.env.get("POSTGRES_HOST") || "localhost",
    port: parseInt(Deno.env.get("POSTGRES_PORT") || "5432", 10),
    username: Deno.env.get("POSTGRES_USER") || "",
    password: Deno.env.get("POSTGRES_PASSWORD") || "",
    database: Deno.env.get("POSTGRES_DB") || "",
  });

  const db = new Database(pgConnection);
  console.log(`Connected to DB, sync DB model...`);

  await setupDb(db);
  console.log(`Model synced to DB.`);

  process();
  setInterval(process, processMempoolEverySeconds * 1000);
}

main();
