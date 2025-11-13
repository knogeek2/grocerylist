// item.js

const BASE_URL = window.location.origin;
const ITEM_JSON = `${BASE_URL}/json/item.json`;
const BRAND_JSON = `${BASE_URL}/json/brand.json`;
const VENDOR_JSON = `${BASE_URL}/json/vendor.json`;

// Hydrate brand datalist
fetch(BRAND_JSON)
    .then(res => res.json())
    .then(brands => {
        brands.forEach(brand => {
            const option = document.createElement("option");
            option.value = brand;
            brandOptions.appendChild(option);
        });
    })
    .catch(err => console.error("Failed to load brand data:", err));

// Hydrate vendor datalist
fetch(VENDOR_JSON)
    .then(res => res.json())
    .then(vendors => {
        vendors.forEach(vendor => {
            if (vendor.ACTIVE) {
                const option = document.createElement("option");
                option.value = vendor.VENDORNAME;
                vendorOptions.appendChild(option);
            }
        });
    })
    .catch(err => console.error("Failed to load vendor data:", err));

// Generate VendorID (base name + timestamp fallback)
function generateVendorID(vendorName, existingIDs = []) {
    let base = vendorName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 25);
    let candidate = base;

    if (existingIDs.includes(candidate)) {
        const ts = Date.now(); // milliseconds since epoch
        candidate = `${base}-${ts}`;
    }

    return candidate;
}

// Wire VendorID preview
const vendorInput = document.getElementById("vendor");
const vendorIDField = document.getElementById("vendorID");

vendorInput.addEventListener("input", () => {
    const vendorName = vendorInput.value.trim();
    if (vendorName) {
        // Optionally hydrate existing IDs from vendor.json for collision check
        fetch(VENDOR_JSON)
            .then(res => res.json())
            .then(vendors => {
                const existingIDs = vendors.map(v => v.VENDORID.toLowerCase());
                const vid = generateVendorID(vendorName, existingIDs);
                vendorIDField.value = vid;
            })
            .catch(() => {
                // Fallback: just generate without collision check
                vendorIDField.value = generateVendorID(vendorName);
            });
    } else {
        vendorIDField.value = "";
    }
});

// Load existing items into table
fetch(ITEM_JSON)
    .then(res => res.json())
    .then(items => {
        items.forEach(item => addRow(item));
    })
    .catch(err => console.error("Failed to load items:", err));

// Add new item
document.getElementById("itemForm").addEventListener("submit", e => {
    e.preventDefault();

    const sku = document.getElementById("sku").value.trim();
    const upc = document.getElementById("upc").value.trim();
    const itmname = document.getElementById("itmname").value.trim();
    const description = document.getElementById("description").value.trim();
    const brand = document.getElementById("brand").value.trim();
    const vendor = document.getElementById("vendor").value.trim();
    const vendorid = document.getElementById("vendorID").value.trim();
    const firstavailable = document.getElementById("firstavailable").value;
    const delisted = document.getElementById("delisted").value;
    const snapyes = document.getElementById("snapyes").checked;

    const newItem = {
        sku,
        upc,
        itmname,
        description,
        brand,
        vendor,
        vendorid,
        firstavailable,
        delisted,
        snapyes,
        velocity: ""
    };

    fetch(`${BASE_URL}/php/save_item.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
    })
        .then(res => res.json())
        .then(response => {
            if (response.status === "success") {
                addRow(newItem);
                document.getElementById("itemForm").reset();
                vendorIDField.value = "";
            } else {
                console.error("Save failed:", response.message);
            }
        })
        .catch(err => console.error("Error saving item:", err));
});

// Add row to table
function addRow(item) {
    const table = document.getElementById("itemTable").getElementsByTagName("tbody")[0];
    const row = table.insertRow();

    row.innerHTML = `
    <td>${item.sku || ""}</td>
    <td>${item.upc || ""}</td>
    <td>${item.itmname || ""}</td>
    <td>${item.description || ""}</td>
    <td>${item.brand || ""}</td>
    <td>${item.vendor || ""}</td>
    <td>${item.vendorid || ""}</td>
