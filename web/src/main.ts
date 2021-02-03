import { denodb, fs } from "./deps.ts";
import { sleepMs } from "./utils.ts";

const { DataTypes, Database, Model, PostgresConnector } = denodb;

/**
 * Keep in sync with extractor/src/main.ts
 */
// deno-fmt-ignore
const FEE_SAT_GRANULARITY = [
  0.0001, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
  12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 120, 130, 140, 150, 175, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
  1500, 2000, 2500,
]

/**
 * Keep in sync with extractor/src/main.ts
 */
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
    console.log("Starting dist generator...");

    
    // first copy static files
    await fs.copy("./static", "../dist", { overwrite: true });

    // it may already exist from previous run
    try {
      await Deno.mkdir("../dist/generated");
    } catch {}

    const data = await BtcMempoolData.orderBy('created_at', 'desc').take(360).get()
    await Deno.writeTextFile("../dist/generated/data.js.new", `;plotData(${JSON.stringify(data)});`)
    await Deno.copyFile("../dist/generated/data.js.new", "../dist/generated/data.js")

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
  const processEverySeconds = 10;

  console.log(
    `Starting web generator (processing every ${processEverySeconds} seconds)...`,
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
  setInterval(process, processEverySeconds * 1000);
}

main();
