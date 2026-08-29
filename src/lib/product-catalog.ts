import { createRow, fetchTable, updateRow, type Product } from "./data";

export type PriceList = "retail" | "distributor";

export type CatalogProduct = {
  name: string;
  retail_price: number;
  distributor_price: number;
  package_size?: string;
};

export const USD_TO_GHS = 10;

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { name: "PAIN VILE OIL", retail_price: 250, distributor_price: 180 },
  { name: "SOFT LAX", retail_price: 350, distributor_price: 280 },
  { name: "CHODEX 3", retail_price: 350, distributor_price: 280 },
  { name: "GARLIC", retail_price: 350, distributor_price: 280 },
  { name: "UTRITONE", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "B COMFORT CAPSULES", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "BEHER 3", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "B COMFORT OIL", retail_price: 250, distributor_price: 180 },
  { name: "TC DENTAL", retail_price: 250, distributor_price: 160 },
  { name: "ADINO PLUS", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "IBHER JUICE", retail_price: 400, distributor_price: 300 },
  { name: "ESPI HIST", retail_price: 400, distributor_price: 300 },
  { name: "IQ VISION", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "CLEAN DETOX", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "CABUL 500", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "VITATRACE", retail_price: 400, distributor_price: 320, package_size: "60 caps" },
  { name: "HORITE EYE DROP", retail_price: 250, distributor_price: 160 },
  { name: "FORCE 4", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "NEUTRI F", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "CUSHVITE", retail_price: 400, distributor_price: 300 },
  { name: "NONI JUICE", retail_price: 450, distributor_price: 360 },
  { name: "GOURD JUICE", retail_price: 400, distributor_price: 300 },
  { name: "DURAVINE", retail_price: 400, distributor_price: 300 },
  { name: "VITA PX", retail_price: 400, distributor_price: 300 },
  { name: "DYNAMIC SLIM", retail_price: 400, distributor_price: 300 },
  { name: "HAVITASTONIC", retail_price: 400, distributor_price: 300 },
  { name: "PEPTO REST", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "VILE-Q TABLET", retail_price: 350, distributor_price: 280, package_size: "60 tablets" },
  { name: "GREEN TEA", retail_price: 350, distributor_price: 280, package_size: "60 tablets" },
  { name: "CARDAMOM TEA", retail_price: 200, distributor_price: 200 },
  { name: "PRO -X", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "ART PLUS TONIC", retail_price: 400, distributor_price: 300 },
  { name: "DYNAMIC LIV FORTE", retail_price: 350, distributor_price: 280 },
  { name: "CALCOL JUICE", retail_price: 400, distributor_price: 300 },
  { name: "CEDAR MOL JUICE", retail_price: 400, distributor_price: 300 },
  { name: "VARICLEAR", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "FS-DESIRE CAPSULES", retail_price: 300, distributor_price: 200, package_size: "30 caps" },
  { name: "FS-DESIRE OIL", retail_price: 250, distributor_price: 180 },
  { name: "DAN-JAAN10 CAPSULES", retail_price: 350, distributor_price: 280, package_size: "60 caps" },
  { name: "EVERTUSI DROP", retail_price: 250, distributor_price: 180 },
];

export function catalogPrice(
  product: {
    price?: number | null;
    retail_price?: number | null;
    distributor_price?: number | null;
  },
  priceList: PriceList,
) {
  const selected = priceList === "retail" ? product.retail_price : product.distributor_price;
  return Number(selected ?? product.price ?? 0);
}

function normalizeCatalogName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function seedProductCatalog() {
  const existing = await fetchTable<Product>("products");
  const map = new Map(existing.map((product) => [normalizeCatalogName(product.name), product]));

  let created = 0;

  for (const item of PRODUCT_CATALOG) {
    const key = normalizeCatalogName(item.name);
    const current = map.get(key);
    const payload = {
      name: item.name,
      price: item.retail_price,
      retail_price: item.retail_price,
      distributor_price: item.distributor_price,
      package_size: item.package_size ?? null,
      stock: current?.stock ?? 0,
      is_active: current?.is_active ?? true,
    };

    if (current) {
      const hasPriceChanges =
        Number(current.retail_price ?? 0) !== item.retail_price ||
        Number(current.distributor_price ?? 0) !== item.distributor_price ||
        String(current.package_size ?? "") !== String(item.package_size ?? "");

      if (hasPriceChanges) {
        await updateRow("products", current.id, payload);
      }
    } else {
      await createRow("products", payload);
      created += 1;
    }
  }

  return created;
}
