//unquote the next line if you need to debug
console.log("global.js loaded");

// ===============================
// Global functions and methods
// ===============================

console.log("global.js file STARTED executing");

// --- Date helpers ---
console.log("Current ISO Date");
export function todayISO() {
    return new Date().toISOString().split('T')[0];
}

// --- Auto-fill order date ---
export function setDefaultOrderDate() {
    const field = document.querySelector('input[name="orderDate"]');
    if (field) field.value = todayISO();
}

// --- Order number auto-increment ---
let lastOrderNumber = 0; // placeholder for last order number storage
export function nextOrderNumber() {
    lastOrderNumber += 10;
    return lastOrderNumber;
}

// --- Current date/time helper ---
export function currentTimestamp() {
    return new Date().toLocaleString();
}

// --- Items --- 
export async function loadItemMaster() {
    const response = await fetch('./data/allprices.json');
    const items = await response.json();
    return items;
}

// JavaScript version of VBA's Nz function
export function nz(value, type) {
    switch (type) {
        case "string":
            return (typeof value === "string") ? value : "";
        case "number":
            return (typeof value === "number" && !isNaN(value)) ? value : 0;
        case "boolean":
            return (typeof value === "boolean") ? value : false;
        case "date":
            if (!value) return "9999-12-31";   // sentinel for missing/invalid
            const d = new Date(value);
            return isNaN(d) ? "9999-12-31" : d.toISOString().slice(0, 10);
        case "array":
            return Array.isArray(value) ? value : [];
        default:
            return value ?? "";
    }

    console.log("global.js finished — nz exported");
}
