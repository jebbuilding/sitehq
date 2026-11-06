// Loads the tests' made-up data (scripts/seed.mjs: the documents and their fixture files) into the DEPLOYED dev
// environment: its DynamoDB table and its files bucket, written through the server's own store and file-store code
// so they are exactly what the API would have written. It uses your own AWS sign-in (profile), not the app's.
//
//   npm run seed:dev -- --env dev [--profile <aws profile>] [--region eu-west-2] [--replace]
//                       [--person owner=<sub>] [--person emp1=<sub>] [--person u9=<sub>]
//
//   --env       must be given, and must be exactly "dev". There is no way to point this at anything else: the
//               table and bucket are read from the outputs of the stack "sitehq-dev" and must be named sitehq-dev-…
//   --replace   the table already holds documents: delete them all (and the files they record) first.
//               Without it the command stops and changes nothing.
//   --person    give one of the made-up people the id of a real sign-in. The seed's people are "owner", "emp1"
//               (a trade) and "u9" (a client); on AWS a person's id is their Cognito "sub", so without this the
//               seeded timesheets and portal belong to nobody who can sign in (the owner still sees everything).
//               The id is swapped wherever it appears: in paths, and as a whole value or key inside documents.
//
// Synthetic data only – this never reads from an environment, and nothing here can write to production.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { bundleApp } from "./bundle.mjs";
import { seedFiles, testSeed } from "./seed.mjs";
import { SEED_USERS } from "../server/auth/dev.mjs";
import { createS3Blobs } from "../server/blobs/s3.mjs";
import { writeSeed } from "../server/local.mjs";
import { createDynamoStore } from "../server/store/dynamodb.mjs";

/** The only environment this command will write to. */
export const SEED_ENV = "dev";
const PROJECT = "sitehq"; // infra/config.ts › project
// The server's records of who is connected for live updates. They are not documents, they expire by themselves,
// and somebody may have the page open: they are neither counted nor deleted.
const LIVE = /^\$(conn$|sub:|cs:)/;

/** Throws unless the environment is dev and both resources carry dev's name (infra/lib/naming.ts). */
export function checkTarget({ env, table, bucket }) {
  if (env !== SEED_ENV) throw new Error(`seed:dev only ever writes to the "${SEED_ENV}" environment – refusing ${env === undefined ? "to run without --env dev" : `"${env}"`}`);
  const prefix = `${PROJECT}-${SEED_ENV}-`;
  for (const [what, name] of [["table", table], ["bucket", bucket]]) if (typeof name !== "string" || !name.startsWith(prefix)) throw new Error(`seed:dev: the ${what} "${name}" is not one of the ${SEED_ENV} environment's (its names start "${prefix}") – refusing`);
}

/** `--person` values → { seedId: newId }. Throws on anything that is not one of the seed's people or not a usable id. */
export function peopleMap(values = []) {
  const map = {};
  for (const v of values) {
    const m = /^([^=]+)=([A-Za-z0-9_-]{1,64})$/.exec(v);
    if (!m || !Object.hasOwn(SEED_USERS, m[1])) throw new Error(`--person ${v}: expected <seed person>=<their Cognito sub>, the seed's people being ${Object.keys(SEED_USERS).join(", ")}`);
    if (Object.hasOwn(map, m[1])) throw new Error(`--person: ${m[1]} is given twice`);
    map[m[1]] = m[2];
  }
  const ids = Object.values(map);
  if (new Set(ids).size !== ids.length) throw new Error("--person: two people were given the same id");
  for (const id of ids) if (Object.hasOwn(SEED_USERS, id)) throw new Error(`--person: "${id}" is one of the seed's own made-up ids, not a Cognito sub`);
  return map;
}

/** The seed with people's ids swapped: in every path segment, and wherever an id is a whole string value or a key. */
export function remapPeople(seed, map) {
  const swap = (s) => (Object.hasOwn(map, s) ? map[s] : s);
  const walk = (v) => (typeof v === "string" ? swap(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [swap(k), walk(x)])) : v);
  return Object.fromEntries(Object.entries(seed).map(([path, data]) => [path.split("/").map(swap).join("/"), walk(data)]));
}

/** Every record in the table except the live-update ones: [{ pk, sk }]. */
async function existing(dynamo, table) {
  const out = [];
  let from;
  do {
    const r = await dynamo.send(new ScanCommand({ TableName: table, ProjectionExpression: "pk, sk", ConsistentRead: true, ExclusiveStartKey: from }));
    for (const it of r.Items || []) if (!LIVE.test(it.pk.S)) out.push({ pk: it.pk.S, sk: it.sk.S });
    from = r.LastEvaluatedKey;
  } while (from);
  return out;
}

/**
 * Write the seed into one environment. Refuses anything but dev, and a table that already holds documents unless
 * `replace`. Resolves a summary: { table, bucket, removed: { documents, files }, documents, files, collections, people }.
 * @param options.dynamo, options.s3  AWS SDK clients (the tests pass an emulator and a stand-in)
 * @param options.people              { seedId: newId } (peopleMap)
 * @param options.seed, options.files what to write (default: the test seed and its fixture files)
 */
export async function seedEnvironment({ env, table, bucket, prefix = "assets/", dynamo, s3, replace = false, people = {}, seed, files, log = () => {} }) {
  checkTarget({ env, table, bucket });
  const store = createDynamoStore({ tableName: table, client: dynamo }), blobs = createS3Blobs({ bucket, prefix, client: s3 });
  const found = await existing(dynamo, table);
  const removed = { documents: 0, files: 0 };
  if (found.length) {
    if (!replace) throw new Error(`seed:dev: the table ${table} already holds ${found.length} documents – nothing was changed. Run again with --replace to delete them all and write the seed.`);
    log(`Deleting what is there: ${found.length} records…`);
    for (const { pk, sk } of found) {
      if (pk === "$assets") { await blobs.delete(sk); removed.files++; } else removed.documents++;
      await store.delete(pk, sk);
    }
  }
  const documents = remapPeople(seed || testSeed(), people);
  const wrote = await writeSeed({ store, blobs, seed: documents, files: files || seedFiles(bundleApp()), by: people.owner || "owner" });
  const collections = {};
  for (const p of Object.keys(documents)) { const c = p.split("/")[0]; collections[c] = (collections[c] || 0) + 1; }
  return { table, bucket, removed, ...wrote, collections, people };
}

/** The dev stack's outputs (infra/lib/sitehq-stack.ts): where the table and the files bucket are. */
async function stackOutputs(region) {
  const { CloudFormationClient, DescribeStacksCommand } = await import("@aws-sdk/client-cloudformation");
  const stack = `${PROJECT}-${SEED_ENV}`;
  const r = await new CloudFormationClient({ region }).send(new DescribeStacksCommand({ StackName: stack }));
  const out = Object.fromEntries(((r.Stacks && r.Stacks[0] && r.Stacks[0].Outputs) || []).map((o) => [o.OutputKey, o.OutputValue]));
  for (const key of ["DataTableName", "FilesBucketName", "PageConfig"]) if (!out[key]) throw new Error(`seed:dev: the stack ${stack} has no ${key} output – has it been deployed?`);
  const page = JSON.parse(out.PageConfig);
  if (page.env !== SEED_ENV) throw new Error(`seed:dev: the stack ${stack} says it is the "${page.env}" environment – refusing`);
  return out;
}

async function main() {
  const { values } = parseArgs({ options: { env: { type: "string" }, profile: { type: "string" }, region: { type: "string", default: "eu-west-2" }, replace: { type: "boolean", default: false }, person: { type: "string", multiple: true }, help: { type: "boolean", short: "h" } } });
  if (values.help) return console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 17).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  checkTarget({ env: values.env, table: `${PROJECT}-${SEED_ENV}-`, bucket: `${PROJECT}-${SEED_ENV}-` }); // the environment name, before anything is asked of AWS
  const people = peopleMap(values.person);
  if (values.profile) process.env.AWS_PROFILE = values.profile;
  const out = await stackOutputs(values.region);
  console.log(`Seeding ${SEED_ENV} (${out.SiteUrl || "address unknown"}) with the tests' made-up data\n  table   ${out.DataTableName}\n  bucket  ${out.FilesBucketName}`);
  const done = await seedEnvironment({
    env: values.env, table: out.DataTableName, bucket: out.FilesBucketName, replace: values.replace, people,
    dynamo: new DynamoDBClient({ region: values.region }),
    s3: new S3Client({ region: values.region }),
    log: (m) => console.log(m),
  });
  if (done.removed.documents || done.removed.files) console.log(`Deleted ${done.removed.documents} documents and ${done.removed.files} files that were there.`);
  console.log(`Wrote ${done.documents} documents: ${Object.entries(done.collections).map(([c, n]) => `${c} ${n}`).join(", ")}`);
  console.log(`Wrote ${done.files} files, each with its record.`);
  const unmapped = Object.keys(SEED_USERS).filter((id) => !Object.hasOwn(people, id));
  for (const [from, to] of Object.entries(people)) console.log(`  ${from} (${SEED_USERS[from].role}) is now ${to}`);
  if (unmapped.length) console.log(`Not matched to a real sign-in: ${unmapped.join(", ")}. Their seeded data is under those made-up ids; see --person in infra/README.md › First deploy.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.name === "Error" ? e.message : e); process.exit(1); });
