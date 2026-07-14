// order.js - Clean version with explicit "+ Add Item" button (fixed)

let currentOrder = null;
let isDirty = false;
let autosaveTimeout = null;

// -----------------------------
// Debounced Autosave
// -----------------------------
function triggerAutosave() {
    if (autosaveTimeout) clearTimeout(autosaveTimeout);

    autosaveTimeout = setTimeout(async () => {
        if (!isDirty || !currentOrder) return;
        await saveOrder();
        isDirty = false;
        console.log(`Order ${currentOrder.orderNumber} autosaved`);
    }, 2500);
}

// -----------------------------
// Before switching records
// -----------------------------
async function maybeSaveBeforeRecordChange() {
    if (!isDirty || !currentOrder) return true;
    if (confirm("Save changes to current order before switching?")) {
        await saveOrder();
    }
    return true;
}

async function loadOrder(orderNumber) {
    if (!await maybeSaveBeforeRecordChange()) return;

    const response = await fetch("data/order.json");
    const allOrders = await response.json();

    const orderData = allOrders.find(o => String(o.orderNumber) === String(orderNumber));
    if (!orderData) {
        console.warn("Order not found:", orderNumber);
        return;
    }

    currentOrder = JSON.parse(JSON.stringify(orderData));

    // Populate header
    document.getElementById("orderNumber").value = currentOrder.orderNumber;
    document.getElementById("vendor").value = currentOrder.vendor || "";
    document.getElementById("orderType").value = currentOrder.orderType || "";
    document.getElementById("orderDate").value = currentOrder.orderDate || "";
    document.getElementById("vendorOrderNumber").value = currentOrder.vendorOrderNumber || "";
    document.getElementById("paymentMethod").value = currentOrder.paymentMethod || "";
    document.getElementById("shippingMethod").value = currentOrder.shippingMethod || "";
    document.getElementById("trackingNumber").value = currentOrder.trackingNumber || "";

    renderAllItems();
    isDirty = false;
    updateOpenOrdersTotal();
    loadRecentOrders();   // refresh highlight
}

// -----------------------------
// Render all item rows
// -----------------------------
function renderAllItems() {
    const container = document.getElementById("itemsBody");
    if (!container) {
        console.error("itemsBody container not found!");
        return;
    }
    container.innerHTML = "";

    const isClosed = isOrderClosed(currentOrder);

    // Force re-index and render every item
    if (currentOrder && currentOrder.items) {
        currentOrder.items.forEach((item, index) => {
            const row = createItemRow(index, item, isClosed);
            container.appendChild(row);
        });
    }

    if (!isClosed) {
        const addBtn = document.createElement("button");
        addBtn.textContent = "+ Add Item";
        addBtn.style.marginTop = "12px";
        addBtn.style.padding = "8px 16px";
        addBtn.onclick = addNewItem;
        container.appendChild(addBtn);
    }

    // Recalc and update totals
    if (currentOrder && currentOrder.items) {
        currentOrder.items.forEach(recalcItem);
        updateTotals();
    }
}

function createItemRow(index, item, isClosed = false) {
    const row = document.createElement("div");
    row.className = "order-item-row";
    row.dataset.index = index;

    const baseTab = 30 + (index * 10);
    const disabled = isClosed ? 'disabled' : '';

    row.innerHTML = `
        <label>SKU</label>
        <input tabindex="${baseTab}" value="${item.sku || ''}"
               onchange="onItemChange(${index}, 'sku', this.value)"
               placeholder="SKU" ${disabled}>

        <label>Item Name</label>
        <input tabindex="${baseTab + 1}" value="${item.itemName || ''}"
               onchange="onItemChange(${index}, 'itemName', this.value)"
               placeholder="Item Name" ${disabled}>

        <label>SNAP?</label>
        <input tabindex="${baseTab + 2}" type="number" value="${item.snapYes ?? 1}"
               onchange="onItemChange(${index}, 'snapYes', this.value)" ${disabled}>

        <label>Order Qty</label>
        <input tabindex="${baseTab + 3}" type="number" step="0.01" value="${item.orderQty || 0}"
               onchange="onItemChange(${index}, 'orderQty', this.value)" ${disabled}>

        <label>Price/UOM</label>
        <input tabindex="${baseTab + 4}" type="number" step="0.01" value="${item.pricePerUOM || 0}"
               onchange="onItemChange(${index}, 'pricePerUOM', this.value)" ${disabled}>

        <label>Discount</label>
        <input tabindex="${baseTab + 5}" type="number" step="0.01" value="${item.discount || 0}"
               onchange="onItemChange(${index}, 'discount', this.value)" ${disabled}>

        <label>Sales Tax</label>
        <input tabindex="${baseTab + 6}" type="number" step="0.01" value="${item.salesTax || 0}"
               onchange="onItemChange(${index}, 'salesTax', this.value)" ${disabled}>

        <label>Received Date</label>
        <input tabindex="${baseTab + 7}" type="date" value="${item.received || ''}"
               onchange="onItemChange(${index}, 'received', this.value)" ${disabled}>

        <label>Received Qty</label>
        <input tabindex="${baseTab + 8}" type="number" step="0.01" value="${item.receivedQty || 0}"
               onchange="onItemChange(${index}, 'receivedQty', this.value)" ${disabled}>

        ${isClosed ? '' : `<button tabindex="${baseTab + 9}" onclick="removeItem(${index})">Remove</button>`}
    `;

    return row;
}

function addNewItem() {
    if (!currentOrder) {
        console.error("No currentOrder loaded");
        alert("Please load or create an order first.");
        return;
    }
    if (isOrderClosed(currentOrder)) {
        console.warn("Order is closed, cannot add items");
        return;
    }

    if (!currentOrder.items) {
        currentOrder.items = [];
    }

    const newItem = {
        sku: "", itemName: "", snapYes: 0, orderQty: 0, pricePerUOM: 0,
        discount: 0, salesTax: 0, received: "", receivedQty: 0,
        orderPrice: 0, receivedPrice: 0
    };

    currentOrder.items.unshift(newItem);  // Add at top
    isDirty = true;
    console.log("Added new item, re-rendering...");  // Debug log
    renderAllItems();
    triggerAutosave();
}
// Field handlers
function onFieldChange(field, value) {
    if (isOrderClosed(currentOrder)) {
        alert("This order is closed. Creating a new order with your changes.");
        // TODO: implement newOrderFromClosed if needed
        return;
    }
    currentOrder[field] = value;
    isDirty = true;
    triggerAutosave();
}

function onItemChange(index, field, value) {
    if (isOrderClosed(currentOrder)) {
        alert("This order is closed. Creating a new order with your changes.");
        // TODO: implement newOrderFromClosed if needed
        return;
    }
    currentOrder.items[index][field] = value;
    isDirty = true;
    triggerAutosave();
}

// Recalc + Totals
function recalcItem(item) {
    const qty = parseFloat(item.orderQty) || 0;
    const price = parseFloat(item.pricePerUOM) || 0;
    const discount = parseFloat(item.discount) || 0;
    const tax = parseFloat(item.salesTax) || 0;

    item.orderPrice = (qty * price) - discount + tax;
    const rQty = parseFloat(item.receivedQty) || 0;
    item.receivedPrice = (rQty * price) - discount + tax;
}

function isOrderClosed(order) {
    if (!order || !order.items || order.items.length === 0) {
        return false;   // Empty / new orders are always OPEN
    }

    // Closed only if EVERY item has a received date
    return order.items.every(item => item.received && item.received.trim() !== "");
}

function updateTotals() {
    const orderTotal = currentOrder.items.reduce((sum, item) => {
        return sum + (parseFloat(item.orderPrice) || 0);
    }, 0);
    document.getElementById("orderTotal").textContent = "$" + orderTotal.toFixed(2);
}

async function updateOpenOrdersTotal() {
    const response = await fetch("data/order.json");
    const allOrders = await response.json();
    let openTotal = 0;

    allOrders.forEach(order => {
        const isOpen = order.items.some(item => !item.received || item.received.trim() === "");
        if (isOpen) {
            const orderSum = order.items.reduce((sum, item) => sum + (parseFloat(item.orderPrice) || 0), 0);
            openTotal += orderSum;
        }
    });

    document.getElementById("openOrdersTotal").textContent = "$" + openTotal.toFixed(2);
}

// Save
async function saveOrder() {
    if (!currentOrder) return;

    // Rebuild items from DOM - only keep items with a SKU
    const rows = document.querySelectorAll(".order-item-row");
    const rebuilt = [];

    rows.forEach(row => {
        const index = parseInt(row.dataset.index);
        if (isNaN(index)) return;

        const inputs = row.querySelectorAll("input");

        const sku = inputs[0].value.trim();

        // Business rule: SKU is required to save an item
        if (!sku) return;

        rebuilt.push({
            sku: sku,
            itemName: inputs[1].value.trim(),
            snapYes: parseInt(inputs[2].value) || 0,
            orderQty: parseFloat(inputs[3].value) || 0,
            pricePerUOM: parseFloat(inputs[4].value) || 0,
            discount: parseFloat(inputs[5].value) || 0,
            salesTax: parseFloat(inputs[6].value) || 0,
            received: inputs[7].value.trim(),
            receivedQty: parseFloat(inputs[8].value) || 0,
            orderPrice: 0,
            receivedPrice: 0
        });
    });

    currentOrder.items = rebuilt;

    // Recalculate prices
    currentOrder.items.forEach(recalcItem);
    updateTotals();

    // Save to server
    try {
        const response = await fetch("php/saveOrder.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentOrder)
        });

        const result = await response.json();
        console.log("Saved order", currentOrder.orderNumber, result);
        isDirty = false;
    } catch (err) {
        console.error("Save failed:", err);
        alert("Error saving order. See console for details.");
    }
}

function removeItem(index) {
    if (isOrderClosed(currentOrder)) return;
    currentOrder.items.splice(index, 1);
    isDirty = true;
    renderAllItems();
    triggerAutosave();
}

async function newOrder() {
    const nextNumber = await getNextOrderNumber();

    currentOrder = {
        orderNumber: nextNumber,
        vendor: "",
        orderType: "Order",
        orderDate: new Date().toISOString().split('T')[0],
        vendorOrderNumber: "",
        paymentMethod: "",
        shippingMethod: "",
        trackingNumber: "",
        items: []
    };

    document.getElementById("orderNumber").value = currentOrder.orderNumber;
    document.getElementById("vendor").value = "";
    document.getElementById("orderType").value = "Order";
    document.getElementById("orderDate").value = currentOrder.orderDate;
    document.getElementById("vendorOrderNumber").value = "";
    document.getElementById("paymentMethod").value = "";
    document.getElementById("shippingMethod").value = "";
    document.getElementById("trackingNumber").value = "";

    document.getElementById("itemsBody").innerHTML = "";
    addNewItem();
    triggerAutosave();
}

async function loadRecentOrders() {
    const response = await fetch("data/order.json");
    const allOrders = await response.json();

    const unique = [...new Set(allOrders.map(o => String(o.orderNumber)))]
        .sort((a, b) => parseInt(b) - parseInt(a));

    const container = document.getElementById("recentOrdersList");
    container.innerHTML = "";

    unique.forEach(orderNumber => {
        const li = document.createElement("li");
        li.textContent = orderNumber;
        li.onclick = () => loadOrder(orderNumber);

        if (currentOrder && String(currentOrder.orderNumber) === String(orderNumber)) {
            li.classList.add("selected");
        }
        container.appendChild(li);
    });
}

async function getNextOrderNumber() {
    try {
        const response = await fetch("data/order.json");
        const allOrders = await response.json();

        let max = 0;
        allOrders.forEach(o => {
            const num = parseInt(o.orderNumber) || 0;
            if (num > max) max = num;
        });

        const next = max + 1;
        console.log(`Next order number: ${next}`);
        return next;
    } catch (e) {
        console.error("Failed to get next order number", e);
        return 800; // safe fallback
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadRecentOrders();
    updateOpenOrdersTotal();
});