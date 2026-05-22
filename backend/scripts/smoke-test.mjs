import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 8000);
const START_SERVER_MODE = (process.env.SMOKE_START_SERVER ?? "auto").toLowerCase(); // auto | true | false

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function truncate(value, maxLen = 400) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

let dbCache;

async function getDb() {
  if (dbCache) return dbCache;

  const [{ connections }, { userModel }, { productModel }, { transactionModel }, bcryptModule] = await Promise.all([
    import("../db/config/db.js"),
    import("../db/models/user.model.js"),
    import("../db/models/product.model.js"),
    import("../db/models/transaction.model.js"),
    import("bcrypt"),
  ]);

  const bcrypt = bcryptModule.default ?? bcryptModule;

  dbCache = {
    connections,
    userModel,
    productModel,
    transactionModel,
    bcrypt,
  };

  return dbCache;
}

async function closeDb() {
  if (!dbCache) return;
  await Promise.allSettled(Object.values(dbCache.connections).map((c) => c.close()));
  dbCache = undefined;
}

async function seedProductIfNeeded({ ownerId } = {}) {
  const { connections, productModel } = await getDb();
  await connections.productDB.asPromise();

  const product = await productModel.create({
    title: `Smoke Product ${Date.now()}`,
    description: "Seeded by smoke test",
    brand: "smoke",
    price: 10,
    owner: ownerId,
    status: "available",
  });

  return product;
}

async function seedUser({ userName, email, password, role }) {
  const { connections, userModel, bcrypt } = await getDb();
  await connections.userDB.asPromise();

  const user = await userModel.create({
    userName,
    email,
    password: bcrypt.hashSync(password, 8),
    role,
    balance: 0,
    isConfirmed: true,
  });

  return user;
}

async function ensureAdminUser(email, password) {
  const { connections, userModel, bcrypt } = await getDb();
  await connections.userDB.asPromise();

  const existing = await userModel.findOne({ email });
  if (existing) return { created: false };

  await userModel.create({
    userName: "Smoke Admin",
    email,
    password: bcrypt.hashSync(password, 8),
    role: "admin",
    balance: 0,
    isConfirmed: true,
  });

  return { created: true };
}

async function request(routePath, { method = "GET", token, json } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers = {
    Accept: "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${routePath}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  const raw = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  let body = raw;
  if (contentType.includes("application/json")) {
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = { _invalidJson: true, raw };
    }
  }

  return {
    status: res.status,
    body,
  };
}

async function waitForHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await request("/health");
      if (r.status === 200) return true;
    } catch {
      // ignore
    }
    await sleep(400);
  }
  return false;
}

function createServerProcess() {
  const child = spawn(process.execPath, ["index.js"], {
    cwd: backendRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = { stdout: "", stderr: "" };
  child.stdout?.on("data", (d) => {
    logs.stdout += d.toString();
    if (logs.stdout.length > 20000) logs.stdout = logs.stdout.slice(-20000);
  });
  child.stderr?.on("data", (d) => {
    logs.stderr += d.toString();
    if (logs.stderr.length > 20000) logs.stderr = logs.stderr.slice(-20000);
  });

  return { child, logs };
}

async function run() {
  const results = [];

  const record = (name, ok, details) => {
    results.push({ name, ok, details });
    const tag = ok ? "PASS" : "FAIL";
    console.log(`${tag} ${name}${details ? ` — ${details}` : ""}`);
  };

  let server;
  try {
    const healthUp = await waitForHealth(1200);
    const shouldStart =
      START_SERVER_MODE === "true" ? true : START_SERVER_MODE === "false" ? false : !healthUp;

    if (shouldStart) {
      console.log(`Starting backend (cwd=${backendRoot})…`);
      server = createServerProcess();

      const ok = await waitForHealth(15000);
      assert(ok, "Backend did not become healthy within 15s (is MongoDB running?)");
    } else {
      console.log("Backend already running; using existing process.");
    }

    // --- Core checks
    {
      const r = await request("/health");
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(r.body && r.body.status === "ok", `Unexpected body: ${truncate(r.body)}`);
      record("GET /health", true);
    }

    let products = [];
    {
      const r = await request("/product");
      assert(r.status === 200, `Expected 200, got ${r.status}`);
      assert(Array.isArray(r.body?.products), `Expected products array, got: ${truncate(r.body)}`);
      products = r.body.products;
      record("GET /product", true, `count=${products.length}`);
    }

    const email = `smoke_${Date.now()}@example.com`;
    const password = "SmokeTest123!";
    let buyerToken;
    let buyerBalanceAfterDeposit;

    {
      const r = await request("/user/register", {
        method: "POST",
        json: { userName: "Smoke User", email, password },
      });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      record("POST /user/register", true, email);
    }

    {
      const r = await request("/user/login", {
        method: "POST",
        json: { email, password },
      });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      assert(typeof r.body?.token === "string" && r.body.token.length > 10, `Missing token: ${truncate(r.body)}`);
      buyerToken = r.body.token;
      record("POST /user/login", true);
    }

    {
      const r = await request("/cart");
      assert(r.status === 401, `Expected 401, got ${r.status} (${truncate(r.body)})`);
      record("GET /cart (no auth)", true);
    }

    {
      const r = await request("/cart", { token: buyerToken });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      record("GET /cart (auth)", true);
    }

    {
      const r = await request("/deposit", { method: "POST", token: buyerToken, json: { amount: 50 } });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      assert(typeof r.body?.balance === "number", `Expected numeric balance, got: ${truncate(r.body)}`);
      buyerBalanceAfterDeposit = r.body.balance;
      record("POST /deposit (auth)", true, `balance=${r.body?.balance ?? "?"}`);
    }

    {
      const r = await request("/user", { token: buyerToken });
      assert(r.status === 403, `Expected 403, got ${r.status} (${truncate(r.body)})`);
      record("GET /user (buyer forbidden)", true);
    }

    {
      const r = await request("/purchase", { method: "POST" });
      assert(r.status === 401, `Expected 401, got ${r.status} (${truncate(r.body)})`);
      record("POST /purchase (no auth)", true);
    }

    {
      const r = await request("/purchase", { method: "POST", token: buyerToken, json: {} });
      assert(r.status === 400, `Expected 400, got ${r.status} (${truncate(r.body)})`);
      record("POST /purchase (missing productId)", true);
    }

    {
      const r = await request("/purchase", {
        method: "POST",
        token: buyerToken,
        json: { productId: "000000000000000000000000" },
      });
      assert(r.status === 404, `Expected 404, got ${r.status} (${truncate(r.body)})`);
      record("POST /purchase (invalid productId)", true);
    }

    {
      const r = await request("/my-transactions", { token: buyerToken });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      assert(Array.isArray(r.body?.transactions), `Expected transactions array, got: ${truncate(r.body)}`);
      record("GET /my-transactions", true, `count=${r.body.transactions.length}`);
    }

    // --- Cart/Order success flow (auto-seed a product if DB has none)
    if (!products.find((p) => p?._id)) {
      const buyerPayload = decodeJwtPayload(buyerToken);
      const seededProduct = await seedProductIfNeeded({ ownerId: buyerPayload?._id });
      assert(seededProduct?._id, "No products returned from /product and DB seeding failed");
      record("Seed product (db)", true, seededProduct._id.toString());
      products = [seededProduct];
    }

    const productId = (products.find((p) => p?._id)?._id ?? "").toString();
    assert(productId, "No product found and seeding failed");

    {
      const r = await request(`/product/${productId}`);
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      record("GET /product/:id", true);
    }

    {
      const r = await request(`/product/${productId}/rate`, {
        method: "POST",
        token: buyerToken,
        json: { rating: 5, comment: "smoke test" },
      });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      record("POST /product/:id/rate (auth)", true);
    }

    {
      const r = await request("/cart", {
        method: "POST",
        token: buyerToken,
        json: { productId, quantity: 1 },
      });
      assert(r.status === 201, `Expected 201, got ${r.status} (${truncate(r.body)})`);
      record("POST /cart (auth)", true);
    }

    {
      const r = await request("/order", {
        method: "POST",
        token: buyerToken,
        json: {},
      });
      assert(r.status === 201, `Expected 201, got ${r.status} (${truncate(r.body)})`);
      record("POST /order (auth)", true);
    }

    {
      const r = await request("/order", { token: buyerToken });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      record("GET /order (auth)", true);
    }

    // --- Distributed purchase flow (userDB + productDB + paymentDB)
    const sellerEmail = `smoke_seller_${Date.now()}@example.com`;
    const sellerPassword = "SmokeSeller123!";

    await seedUser({
      userName: "Smoke Seller",
      email: sellerEmail,
      password: sellerPassword,
      role: "user", //Updated to the unified role
    });
    record("Seed seller user (db)", true, sellerEmail);

    let sellerToken;
    {
      const r = await request("/user/login", {
        method: "POST",
        json: { email: sellerEmail, password: sellerPassword },
      });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      assert(typeof r.body?.token === "string", `Missing token: ${truncate(r.body)}`);
      sellerToken = r.body.token;
      record("Seller login", true);
    }

    const purchaseProductPrice = 10;
    let purchaseProductId;
    {
      const r = await request("/product", {
        method: "POST",
        token: sellerToken,
        json: {
          title: `Smoke Seller Product ${Date.now()}`,
          description: "Created by smoke test",
          brand: "smoke",
          price: purchaseProductPrice,
        },
      });
      assert(r.status === 201, `Expected 201, got ${r.status} (${truncate(r.body)})`);
      purchaseProductId = r.body?.addedProduct?._id;
      assert(purchaseProductId, `Missing addedProduct._id: ${truncate(r.body)}`);
      record("POST /product (seller)", true, purchaseProductId);
    }

    {
      const r = await request("/purchase", {
        method: "POST",
        token: buyerToken,
        json: { productId: purchaseProductId },
      });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      record("POST /purchase (success)", true);
    }

    {
      const r = await request(`/product/${purchaseProductId}`);
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      assert(r.body?.product?.status === "sold", `Expected product.status=sold, got: ${truncate(r.body)}`);
      record("GET /product/:id (after purchase)", true);
    }

    {
      const buyerPayload = decodeJwtPayload(buyerToken);
      const sellerPayload = decodeJwtPayload(sellerToken);
      assert(buyerPayload?._id, "Could not decode buyer token payload");
      assert(sellerPayload?._id, "Could not decode seller token payload");

      const { connections, userModel, productModel, transactionModel } = await getDb();
      await Promise.all([
        connections.userDB.asPromise(),
        connections.productDB.asPromise(),
        connections.paymentDB.asPromise(),
      ]);

      const [buyerDoc, sellerDoc, productDoc, txDoc] = await Promise.all([
        userModel.findById(buyerPayload._id),
        userModel.findById(sellerPayload._id),
        productModel.findById(purchaseProductId),
        transactionModel.findOne({ product: purchaseProductId }),
      ]);

      assert(buyerDoc, "Buyer missing in userDB after purchase");
      assert(sellerDoc, "Seller missing in userDB after purchase");
      assert(productDoc, "Product missing in productDB after purchase");
      assert(txDoc, "Transaction missing in paymentDB after purchase");

      assert(productDoc.status === "sold", `Expected product.status=sold, got ${productDoc.status}`);
      assert(
        productDoc.owner?.toString() === buyerPayload._id,
        `Expected product.owner=${buyerPayload._id}, got ${productDoc.owner}`
      );

      assert(txDoc.price === purchaseProductPrice, `Expected tx.price=${purchaseProductPrice}, got ${txDoc.price}`);
      assert(
        txDoc.buyer?.toString() === buyerPayload._id,
        `Expected tx.buyer=${buyerPayload._id}, got ${txDoc.buyer}`
      );
      assert(
        txDoc.seller?.toString() === sellerPayload._id,
        `Expected tx.seller=${sellerPayload._id}, got ${txDoc.seller}`
      );

      assert(
        buyerDoc.balance === buyerBalanceAfterDeposit - purchaseProductPrice,
        `Expected buyer.balance=${buyerBalanceAfterDeposit - purchaseProductPrice}, got ${buyerDoc.balance}`
      );
      assert(
        sellerDoc.balance === purchaseProductPrice,
        `Expected seller.balance=${purchaseProductPrice}, got ${sellerDoc.balance}`
      );

      record("Distributed DB purchase consistency", true);
    }

    {
      const r = await request("/my-transactions", { token: buyerToken });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      const list = r.body?.transactions ?? [];
      const found = list.some(
        (t) => t?.product === purchaseProductId || t?.product?._id === purchaseProductId
      );
      assert(found, `Buyer transactions did not include ${purchaseProductId}. Got: ${truncate(list)}`);
      record("GET /my-transactions (buyer includes purchase)", true);
    }

    {
      const r = await request("/my-transactions", { token: sellerToken });
      assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
      const list = r.body?.transactions ?? [];
      const found = list.some(
        (t) => t?.product === purchaseProductId || t?.product?._id === purchaseProductId
      );
      assert(found, `Seller transactions did not include ${purchaseProductId}. Got: ${truncate(list)}`);
      record("GET /my-transactions (seller includes purchase)", true);
    }

    // --- Optional admin checks (only if creds provided)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      let adminToken;
      {
        let r = await request("/user/login", {
          method: "POST",
          json: { email: adminEmail, password: adminPassword },
        });

        if (!(r.status === 200 && typeof r.body?.token === "string")) {
          const { connections, userModel } = await getDb();
          await connections.userDB.asPromise();
          const exists = await userModel.findOne({ email: adminEmail });

          if (!exists) {
            const seeded = await ensureAdminUser(adminEmail, adminPassword);
            record("Seed admin user (db)", true, seeded.created ? "created" : "exists");
            r = await request("/user/login", {
              method: "POST",
              json: { email: adminEmail, password: adminPassword },
            });
          }
        }

        assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
        assert(typeof r.body?.token === "string", `Admin login failed. If the user exists, check ADMIN_PASSWORD. Body: ${truncate(r.body)}`);
        adminToken = r.body.token;
        record("Admin login", true, adminEmail);
      }

      {
        const r = await request("/user", { token: adminToken });
        assert(
          r.status === 200,
          `Expected 200, got ${r.status} (${truncate(r.body)}). If this is 403, your backend only treats specific emails as admin.`
        );
        record("GET /user (admin)", true);
      }

      {
        const r = await request("/orders", { token: adminToken });
        assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
        record("GET /orders (admin)", true);
      }

      {
        const r = await request("/", { token: adminToken });
        assert(r.status === 200, `Expected 200, got ${r.status} (${truncate(r.body)})`);
        record("GET / (transactions admin)", true);
      }
    } else {
      record("Admin-only routes", true, "skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to test)");
    }

    const failed = results.filter((r) => !r.ok);
    console.log("\n--- Summary ---");
    console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`\nSmoke test error: ${error?.message ?? error}`);
    if (server?.logs) {
      if (server.logs.stdout) console.error(`\n[server stdout]\n${server.logs.stdout}`);
      if (server.logs.stderr) console.error(`\n[server stderr]\n${server.logs.stderr}`);
    }
    process.exitCode = 1;
  } finally {
    if (server?.child && !server.child.killed) {
      server.child.kill();
    }
    await closeDb();
  }
}

await run();
