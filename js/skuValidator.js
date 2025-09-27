// skuValidator.js
// If not in itemMaster then add it and link it to a Vendor
function validateSKU(sku, vendor) {
    if (!sku || !vendor) return { valid: false, reason: "Missing SKU or vendor" };

    const item = itemMaster.find(i => i.sku === sku);
    if (!item) return { valid: false, reason: "SKU not found in itemMaster" };

    const link = itemVendor.find(v => v.sku === sku && v.vendor === vendor);
    if (!link) return { valid: false, reason: "SKU not linked to vendor" };

    return { valid: true, reason: "Valid SKU and vendor link" };
}
