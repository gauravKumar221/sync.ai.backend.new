import fs from "fs";
import path from "path";

const products = JSON.parse(
    fs.readFileSync(path.resolve("products/products.json"))
);

export function findProduct(query) {
    query = query.toLowerCase();

    return products.filter(p =>
        p.brand_name.toLowerCase().includes(query) ||
        p.keywords.some(k => query.includes(k))
    );
}
