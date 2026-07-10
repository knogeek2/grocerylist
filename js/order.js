let currentOrder = null;
let isDirty = false;
let autosaveTimeout = null;
let blankItemBuffer = {
    sku: "",
    itemName: "",
    snapYes: 0,
    orderQty: 0,
    pricePerUOM: 0,
    discount: 0,
    salesTax: 0,
    received: "",
    receivedQty: 0
};

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
    }, 2500); // 2.5 seconds after last change
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

    currentOrder = JSON.parse(JSON.stringify(orderData)); // deep clone
    //currentOrder.status = orderStatus(currentOrder);  // optional: compute status if needed

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
}

// -----------------------------
// Render all item rows
// -----------------------------
function renderAllItems() {
    const container = document.getElementById("itemsBody");
    container.innerHTML = "";

    const isClosed = isOrderClosed(currentOrder);

    // For open orders: show blank row FIRST (mobile-first)
    if (!isClosed) {
        const blankIndex = -1; // special marker
        const row = createItemRow(blankIndex, {
            sku: "",
            itemName: "",
            snapYes: 0,
            orderQty: 0,
            pricePerUOM: 0,
            discount: 0,
            salesTax: 0,
            received: "",
            receivedQty: 0
        }, true); // isBlank = true
        container.appendChild(row);
    }

    // Render real items
    currentOrder.items.forEach((item, index) => {
        // Skip if this is somehow a lingering blank (shouldn't happen)
        if (!item.sku && !item.itemName) return;

        const row = createItemRow(index, item, false, isClosed);
        container.appendChild(row);
    });

    updateTotals();
}

// Helper to reduce duplication
function createItemRow(index, item, isBlank, isClosed = false) {
    const row = document.createElement("div");
    row.className = `order-item-row ${isBlank ? 'blank-item' : ''}`;
    row.dataset.index = index;

    const baseTab = 30 + (Math.abs(index) * 10);
    const disabled = isClosed ? 'disabled' : '';

    // Choose handler based on blank vs real row
    function handler(field) {
        return isBlank
            ? `onBlankItemChange('${field}', this.value)`
            : `onItemChange(${index}, '${field}', this.value)`;
    }

    const removeBtn = isClosed || isBlank
        ? ''
        : `<button tabindex="${baseTab + 9}" onclick="removeItem(${index})">Remove</button>`;

    row.innerHTML = `
        <label>SKU</label>
        <input tabindex="${baseTab}" value="${item.sku || ''}"
               onchange="${handler('sku')}"
               placeholder="SKU" ${disabled}>

        <label>Item Name</label>
        <input tabindex="${baseTab + 1}" value="${item.itemName || ''}"
               onchange="${handler('itemName')}"
               placeholder="Item Name" ${disabled}>

        <label>SNAP?</label>
        <input tabindex="${baseTab + 2}" type="number" value="${item.snapYes ?? 1}"
               onchange="${handler('snapYes')}" ${disabled}>

        <label>Order Qty</label>
        <input tabindex="${baseTab + 3}" type="number" step="0.01" value="${item.orderQty || 0}"
               onchange="${handler('orderQty')}" ${disabled}>

        <label>Price/UOM</label>
        <input tabindex="${baseTab + 4}" type="number" step="0.01" value="${item.pricePerUOM || 0}"
               onchange="${handler('pricePerUOM')}" ${disabled}>

        <label>Discount</label>
        <input tabindex="${baseTab + 5}" type="number" step="0.01" value="${item.discount || 0}"
               onchange="${handler('discount')}" ${disabled}>

        <label>Sales Tax</label>
        <input tabindex="${baseTab + 6}" type="number" step="0.01" value="${item.salesTax || 0}"
               onchange="${handler('salesTax')}" ${disabled}>

        <label>Received Date</label>
        <input tabindex="${baseTab + 7}" type="date" value="${item.received || ''}"
               onchange="${handler('received')}" ${disabled}>

        <label>Received Qty</label>
        <input tabindex="${baseTab + 8}" type="number" step="0.01" value="${item.receivedQty || 0}"
               onchange="${handler('receivedQty')}" ${disabled}>

        ${removeBtn}
    `;

    return row;
}


// -----------------------------
// Add a blank item row
// -----------------------------
function addBlankItemRow() {

    if (isOrderClosed(currentOrder)) return;

    const newItem = {
        sku: "",
        itemName: "",
        snapYes: 0,
        orderQty: 0,
        pricePerUOM: 0,
        discount: 0,
        salesTax: 0,
        received: "",
        receivedQty: 0,
        orderPrice: 0,
        receivedPrice: 0
    };

    currentOrder.items.unshift(newItem);

    renderAllItems();   // re-render to show the new blank row
}

// -----------------------------
// Field change handlers
// -----------------------------
function onFieldChange(field, value) {
    if (isOrderClosed(currentOrder)) {
        alert("This order is closed. Creating a new order with your changes.");
        newOrderFromClosed(currentOrder);
        return;
    }
    currentOrder[field] = value;
    isDirty = true;
    triggerAutosave();
}

function onItemChange(index, field, value) {
    if (isOrderClosed(currentOrder)) {
        alert("This order is closed. Creating a new order with your changes.");
        newOrderFromClosed(currentOrder);
        return;
    }
    currentOrder.items[index][field] = value;
    isDirty = true;
    triggerAutosave();
}

// -----------------------------
// Recalc + Totals
// -----------------------------
function recalcAndRender() {
    currentOrder.items.forEach(recalcItem);
    updateTotals();
    triggerAutosave();
}

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
        return false;   // New/empty orders are open
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

// Calculate total of all open orders
async function updateOpenOrdersTotal() {
    const response = await fetch("data/order.json");
    const allOrders = await response.json();

    let openTotal = 0;

    allOrders.forEach(order => {
        const isOpen = order.items.some(item => !item.received || item.received.trim() === "");
        if (isOpen) {
            const orderSum = order.items.reduce((sum, item) => {
                return sum + (parseFloat(item.orderPrice) || 0);
            }, 0);
            openTotal += orderSum;
        }
    });

    document.getElementById("openOrdersTotal").textContent = "$" + openTotal.toFixed(2);
}

// -----------------------------
// Save
// -----------------------------
async function saveOrder() {
    if (!currentOrder) return;

    const isClosed = isOrderClosed(currentOrder);

    // -----------------------------------------
    // 1. Rebuild items from DOM rows
    // -----------------------------------------
    const rows = document.querySelectorAll(".order-item-row");
    const rebuilt = [];

    rows.forEach(row => {
        const index = parseInt(row.dataset.index);

        // Skip blank row (-1)
        if (index < 0) return;

        const inputs = row.querySelectorAll("input");

        rebuilt.push({
            sku: inputs[0].value.trim(),
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

    // -----------------------------------------
    // 2. Apply your existing open/closed logic
    // -----------------------------------------
    if (!isClosed) {
        const nonEmpty = rebuilt.filter(item => item.sku);

        const blankItem = {
            sku: "",
            itemName: "",
            snapYes: 0,
            orderQty: 0,
            pricePerUOM: 0,
            discount: 0,
            salesTax: 0,
            received: "",
            receivedQty: 0,
            orderPrice: 0,
            receivedPrice: 0
        };

        currentOrder.items = [...nonEmpty, blankItem];
    } else {
        currentOrder.items = rebuilt.filter(item => item.sku || item.itemName);
    }

    // -----------------------------------------
    // 3. Write updated order to order.json
    // -----------------------------------------
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



// -----------------------------
// Remove item
// -----------------------------
function removeItem(index) {

    // Prevent removal if the order is closed
    if (isOrderClosed(currentOrder)) return;
    currentOrder.items.splice(index, 1);
    renderAllItems();
    isDirty = true;

    triggerAutosave();
}

// -----------------------------
// New Order
// -----------------------------
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

    // Populate header
    document.getElementById("orderNumber").value = currentOrder.orderNumber;
    document.getElementById("vendor").value = "";
    document.getElementById("orderType").value = "Order";
    document.getElementById("orderDate").value = currentOrder.orderDate;
    document.getElementById("vendorOrderNumber").value = "";
    document.getElementById("paymentMethod").value = "";
    document.getElementById("shippingMethod").value = "";
    document.getElementById("trackingNumber").value = "";

    document.getElementById("itemsBody").innerHTML = "";

    addBlankItemRow();
    //console.log("New order items count:", currentOrder.items.length);
    if (isClosed(currentOrder)) return;
    const newItem = {


    };

    triggerAutosave();
}


// -----------------------------
// Load recent orders list
// -----------------------------
async function loadRecentOrders() {
    const response = await fetch("data/order.json");
    const allOrders = await response.json();

    // Sort by orderNumber descending (newest first)
    const unique = [...new Set(allOrders.map(o => String(o.orderNumber)))]
        .sort((a, b) => parseInt(b) - parseInt(a));

    const container = document.getElementById("recentOrdersList");
    container.innerHTML = "";

    unique.forEach(orderNumber => {
        const li = document.createElement("li");
        li.textContent = orderNumber;
        li.onclick = () => loadOrder(orderNumber);

        // highlight the CURRENT order, not the newest one
        if (currentOrder && String(currentOrder.orderNumber) === String(orderNumber)) {
            li.classList.add("selected");
        }

        container.appendChild(li);
    });
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

// -----------------------------
// Get the next order number from the server (or fallback to 734)
// -----------------------------
async function getNextOrderNumber() {
    try {
        const response = await fetch("php/getSequence.php");
        const data = await response.json();
        return (data.lastOrderNumber || 734) + 1;
    } catch (e) {
        console.error("Sequence fetch failed", e);
        return Date.now(); // fallback
    }
}

// -----------------------------
// Evaluate order status based on its properties
// -----------------------------
function orderStatus(order) {
    const vendorOrderNo = order.vendorOrderNo;
    const trackingNumber = order.trackingNumber;
    const allItemsReceived = order.items.every(i => i.received);

    if (!vendorOrderNo) return "New";
    if (!trackingNumber) return "Ordered";
    if (!allItemsReceived) return "Shipped";
    return "Received";
}

// -----------------------------
// Handle changes to the blank item buffer (for open orders)
// -----------------------------
function onBlankItemChange(field, value) {
    blankItemBuffer[field] = value;
}

// -----------------------------
// Commit the blank item buffer to the current order's items
// -----------------------------
function addItemFromBlank() {
    currentOrder.items.push({ ...blankItemBuffer });
    blankItemBuffer = { ...defaults }; // reset
    isDirty = true;
    triggerAutosave();
    renderAllItems();
}


// -----------------------------
// Initialize
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadRecentOrders();
    updateOpenOrdersTotal();
});

// Temporary debug
setTimeout(() => {
    if (currentOrder) {
        console.log("Current order items count:", currentOrder.items.length);
        renderAllItems();
    }
}, 500);