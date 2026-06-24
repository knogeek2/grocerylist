// js/global.js

console.log("global.js loaded");

// ===============================
// Global helpers
// ===============================

// --- Date helpers ---
export function todayISO() {
    return new Date().toISOString().split("T")[0];
}

// --- Auto-fill order date ---
export function setDefaultOrderDate() {
    const field = document.querySelector('input[name="orderDate"]');
    if (field) field.value = todayISO();
}

// --- Order number auto-increment ---
// (You may replace this with a server-side or JSON-based generator later)
let lastOrderNumber = 0;
export function nextOrderNumber() {
    lastOrderNumber += 1;
    return lastOrderNumber;
}

// --- Current date/time helper ---
export function currentTimestamp() {
    return new Date().toLocaleString();
}

// --- Load item master list ---
export async function loadItemMaster() {
    const response = await fetch("data/allprices.json");
    if (!response.ok) {
        throw new Error(`Failed to load allprices.json — status ${response.status}`);
    }
    return await response.json();
}

// --- Universal null-normalization (Access-style Nz) ---
export function nz(value, type) {
    switch (type) {
        case "text":
            return value ?? "";
        case "number":
            return Number(value ?? 0);
        case "date":
            return value || "2044-01-01";
        default:
            return value ?? "";
    }
}

// --- Number formatting (en-US) ---
export function numberFormat(value, fmt) {
    // Early exit: no format string provided
    if (!fmt) return value;

    const num = Number(value ?? 0);

    switch (fmt) {
        case "standard":
            return new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num);

        case "accounting":
            if (num < 0) {
                return `(${Math.abs(num).toFixed(2)})`;
            }
            return num.toFixed(2);

        case "integer":
            return Math.round(num).toString();

        case "percent":
            return `${(num * 100).toFixed(1)}%`;

        // Case Else — unknown format, return raw
        default:
            return value;
    }
}

export function itemIdentity(item) {
    const sku = item.sku ?? "";
    const name = item.itemName ?? "";
    return `${sku} - ${name}`.trim();
}


