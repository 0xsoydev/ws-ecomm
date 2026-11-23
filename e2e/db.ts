import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { hashPassword } from "better-auth/crypto"
import { policies } from "../scripts/policies"
import { E2E_PORT, OWNER } from "./constants"

const drizzleDir = join(import.meta.dirname, "..", "drizzle")

export async function fixtureDb() {
  const db = new PGlite()

  await db.exec(`CREATE ROLE migrate LOGIN; CREATE ROLE app LOGIN; CREATE ROLE backup LOGIN;
GRANT CREATE ON DATABASE postgres TO migrate;
GRANT USAGE, CREATE ON SCHEMA public TO migrate;
GRANT USAGE ON SCHEMA public TO app, backup;
ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app;
SET ROLE migrate`)
  for (const file of readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const statement of readFileSync(join(drizzleDir, file), "utf8").split("--> statement-breakpoint")) if (statement.trim()) await db.exec(statement)
  }
  await db.exec("RESET ROLE")

  const photo = (n: number) => ["catalogue-app/rloqwm8zfc35we7njhgn", "catalogue-app/zgrojipuirltnnrq1scm", "catalogue-app/vriglqzds2p68siewfck", "catalogue-app/u0rekk5wgzxo3hpdcvkk"][n % 4] ?? ""

  await db.exec(`
insert into system (slug, name, short_name, position) values ('batteries-bms', 'Batteries & BMS', 'Batteries', 1), ('brakes-suspension', 'Brakes & suspension', 'Brakes', 2);
insert into category (system_id, slug, name, position) values (1, 'bms-48v', '48V BMS', 1), (1, 'cells', 'Cells & holders', 2), (2, 'brake-parts', 'Brake parts', 1);
insert into vehicle_brand (slug, name) values ('ola', 'Ola');
insert into vehicle_model (brand_id, slug, name) values (1, 's1', 'S1');
insert into gst_regime (scheme, from_date) values ('unregistered', '2026-01-01');
update settings set data = data || '{"courierAvailable": true, "shippingBands": [{"upToPaise": 300000, "feePaise": 8000}], "freeShippingFromPaise": 1000000}'::jsonb where id = 1;
`)

  type Fixture = { slug: string; name: string; code: string | null; category: number; wholesale: number; retail: number | null; moq: number; min?: number; stock: number | null; fulfilment?: string; battery?: string; unit?: string }
  const fixtures: Fixture[] = [
    { slug: "daly-bms-13s-40a", name: "Daly BMS 13S 40A, 48V", code: "13S 40A", category: 1, wholesale: 110000, retail: null, moq: 1, stock: null },
    { slug: "jbd-bms-13s-60a", name: "JBD BMS 13S 60A, 48V", code: "13S 60A", category: 1, wholesale: 288000, retail: null, moq: 1, stock: 2 },
    { slug: "jbd-bms-16s-40a", name: "JBD BMS 16S 40A, 60V", code: "16S 40A", category: 1, wholesale: 160000, retail: null, moq: 1, stock: 0 },
    { slug: "lithium-cell-2600", name: "Lithium-ion cell 2600mAh", code: null, category: 2, wholesale: 9000, retail: null, moq: 100, min: 100, stock: null, fulfilment: "pickup_or_freight", battery: "none" },
    { slug: "cell-holder-18650", name: "Cell holder 18650 (8x15)", code: null, category: 2, wholesale: 6500, retail: null, moq: 10, stock: null },
    { slug: "disc-pad-dp13-ola-rear", name: "Disc pad DP13 Ola rear", code: "DP13 OLA REAR", category: 3, wholesale: 12000, retail: 15000, moq: 2, stock: null, unit: "set" },
    { slug: "lever-ola-drum", name: "Lever Ola drum", code: null, category: 3, wholesale: 20000, retail: 25000, moq: 3, stock: 10, unit: "set" },
  ]
  for (const [i, f] of fixtures.entries()) {
    const min = f.min ?? 1
    await db.query(
      `insert into product (slug, sku, part_code, name, category_id, status, unit, moq, min_order_qty, order_step, wholesale_paise, retail_paise, price_approved, stock, low_stock_at, fulfilment, battery_kind, maker, country_of_origin, maker_address, pre_packaged)
     values ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $12, $13, 3, $14, $15, 'Shenzhen Parts Co.', 'China', 'Longgang, Shenzhen, China', false)`,
      [f.slug, `WSG-${String(i + 1).padStart(5, "0")}`, f.code, f.name, f.category, f.unit ?? "pcs", f.moq, min, min, f.wholesale, f.retail, true, f.stock, f.fulfilment ?? "courier", f.battery ?? "none"],
    )
    await db.query(`insert into product_image (product_id, public_id, width, height, position, own_photo, on_white, classified) values ($1, $2, 1000, 1000, 0, true, true, true)`, [i + 1, photo(i)])
  }
  await db.exec(`update product set specs = jsonb_build_object('Maker', split_part(name, ' ', 1), 'Series cells', split_part(name, ' ', 3)), specs_reviewed = true where category_id = 1`)
  await db.exec(`insert into product_vehicle (product_id, model_id, verified) values (6, 1, true), (7, 1, false);`)

  for (const p of policies) await db.query("insert into page (slug, title, body) values ($1, $2, $3)", [p.slug, p.title, p.body])

  const hash = await hashPassword(OWNER.password)
  await db.query(`insert into "user" (id, name, email, email_verified, role, banned, must_change_password, created_at, updated_at) values ('e2e-owner', 'E2E Owner', $1, true, 'owner', false, false, now(), now())`, [OWNER.email])
  await db.query(`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values ('e2e-owner-acct', 'e2e-owner', 'credential', 'e2e-owner', $1, now(), now())`, [hash])
  return db
}

export async function serve(port: number) {
  const db = await fixtureDb()
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 400 })
  await server.start()
  return server
}

if (import.meta.main) {
  await serve(E2E_PORT)
  console.log(`e2e database ready on ${String(E2E_PORT)}`)
}
