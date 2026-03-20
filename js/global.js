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
