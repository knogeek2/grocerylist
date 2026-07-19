// order.js - Updated with hSalesTax and dSalesTax

let currentOrder = null;
let isDirty = false;
let autosaveTimeout = null;
let vendors = [];

// Vendor Lookup
async function loadVendors() {
    try {
        const response = await fetch("data/vendor.json");
        vendors = await response.json();
        populateVendorDatalist();
    } catch (e) {
        console.error("Failed to load vendors", e);
        vendors = [];
    }
}

function populateVendorDatalist() {
    const datalist = document.getElementById("vendorList");
    if (!datalist) return;
    datalist.innerHTML = "";
    vendors.forEach(v => {
        const option = document.createElement("option");
        option.value = v.vendorName || v.name || v;
        datalist.appendChild(option);
    });
}

async function onVendorSelected(value) {
    if (!value || !currentOrder) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    const exists = vendors.some(v => String(v.vendorName || v.name || v).toLowerCase() === trimmed.toLowerCase());

    if (!exists) {
        if (confirm(`Vendor "${trimmed}" not found. Add it?`)) {
            vendors.push({ vendorName: trimmed, addedDate: new Date().toISOString().split('T')[0] });
            try {
                await fetch("php/saveVendor.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(vendors)
                });
            } catch (e) { }
        }
    }

    currentOrder.vendor = trimmed;
    isDirty = true;
    triggerAutosave();
    populateVendorDatalist();
}

//Load Recent Orders
async function loadRecentOrders() {
    try {
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
    } catch (e) {
        console.error("Failed to load recent orders", e);
    }
}

// Autosave & Status
function triggerAutosave() {
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
        if (isDirty && currentOrder) await saveOrder();
        isDirty = false;
    }, 2500);
}

function showSaveStatus(message, isError = false) {
    let statusEl = document.getElementById("saveStatus");
    if (!statusEl) {
        statusEl = document.createElement("div");
        statusEl.id = "saveStatus";
        statusEl.style.marginTop = "8px";
        statusEl.style.fontSize = "0.9em";
        statusEl.style.padding = "6px 12px";
        statusEl.style.borderRadius = "4px";
        const footer = document.getElementById("order-footer-container");
        if (footer) footer.appendChild(statusEl);
    }
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#e74c3c" : "#27ae60";
    statusEl.style.backgroundColor = isError ? "#fee" : "#e8f5e9";
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 2000);
}

// Core Functions
async function loadOrder(orderNumber) {
    if (!await maybeSaveBeforeRecordChange()) return;

    const response = await fetch("data/order.json");
    const allOrders = await response.json();

    const orderData = allOrders.find(o => String(o.orderNumber) === String(orderNumber));
    if (!orderData) return;

    currentOrder = JSON.parse(JSON.stringify(orderData));

    document.getElementById("orderNumber").value = currentOrder.orderNumber || "";
    document.getElementById("vendor").value = currentOrder.vendor || "";
    document.getElementById("orderType").value = currentOrder.orderType || "";
    document.getElementById("orderDate").value = currentOrder.orderDate || "";
    document.getElementById("vendorOrderNumber").value = currentOrder.vendorOrderNumber || "";
    document.getElementById("paymentMethod").value = currentOrder.paymentMethod || "";
    document.getElementById("shippingMethod").value = currentOrder.shippingMethod || "";
    document.getElementById("trackingNumber").value = currentOrder.trackingNumber || "";
    document.getElementById("hSalesTax").value = currentOrder.hSalesTax || 0;

    renderAllItems();
    isDirty = false;
    updateOpenOrdersTotal();
    loadRecentOrders();
}

function renderAllItems() {
    const container = document.getElementById("itemsBody");
    if (!container) return;
    container.innerHTML = "";

    const isClosed = isOrderClosed(currentOrder);

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
        <input tabindex="${baseTab}" value="${item.sku || ''}" onchange="onItemChange(${index}, 'sku', this.value)" placeholder="SKU" ${disabled}>

        <label>Item Name</label>
        <input tabindex="${baseTab + 1}" value="${item.itemName || ''}" onchange="onItemChange(${index}, 'itemName', this.value)" placeholder="Item Name" ${disabled}>

        <label>SNAP?</label>
        <input tabindex="${baseTab + 2}" type="number" value="${item.snapYes ?? 1}" onchange="onItemChange(${index}, 'snapYes', this.value)" ${disabled}>

        <label>Order Qty</label>
        <input tabindex="${baseTab + 3}" type="number" step="0.01" value="${item.orderQty || 0}" onchange="onItemChange(${index}, 'orderQty', this.value)" ${disabled}>

        <label>Price/UOM</label>
        <input tabindex="${baseTab + 4}" type="number" step="0.01" value="${item.pricePerUOM || 0}" onchange="onItemChange(${index}, 'pricePerUOM', this.value)" ${disabled}>

        <label>Discount</label>
        <input tabindex="${baseTab + 5}" type="number" step="0.01" value="${item.discount || 0}" onchange="onItemChange(${index}, 'discount', this.value)" ${disabled}>

        <label>Item Sales Tax</label>
        <input tabindex="${baseTab + 6}" type="number" step="0.01" value="${item.dSalesTax || 0}" onchange="onItemChange(${index}, 'dSalesTax', parseFloat(this.value) || 0)" ${disabled}>

        <label>Received Date</label>
        <input tabindex="${baseTab + 7}" type="date" value="${item.received || ''}" onchange="onItemChange(${index}, 'received', this.value)" ${disabled}>

        <label>Received Qty</label>
        <input tabindex="${baseTab + 8}" type="number" step="0.01" value="${item.receivedQty || 0}" onchange="onItemChange(${index}, 'receivedQty', this.value)" ${disabled}>

        ${isClosed ? '' : `<button tabindex="${baseTab + 9}" onclick="removeItem(${index})">Remove</button>`}
    `;

    return row;
}

function addNewItem() {
    if (!currentOrder) return;
    if (isOrderClosed(currentOrder)) return;

    if (!currentOrder.items) currentOrder.items = [];

    currentOrder.items.push({
        sku: "", itemName: "", snapYes: 0, orderQty: 0, pricePerUOM: 0,
        discount: 0, dSalesTax: 0, received: "", receivedQty: 0,
        orderPrice: 0, receivedPrice: 0
    });

    isDirty = true;
    renderAllItems();
    triggerAutosave();
}

function onFieldChange(field, value) {
    if (isOrderClosed(currentOrder)) return;
    currentOrder[field] = value;
    isDirty = true;
    triggerAutosave();
}

function onItemChange(index, field, value) {
    if (isOrderClosed(currentOrder)) return;
    currentOrder.items[index][field] = value;
    isDirty = true;
    triggerAutosave();
}

function recalcItem(item) {
    const qty = parseFloat(item.orderQty) || 0;
    const price = parseFloat(item.pricePerUOM) || 0;
    const discount = parseFloat(item.discount) || 0;
    const tax = parseFloat(item.dSalesTax) || 0;

    item.orderPrice = (qty * price) - discount + tax;
    const rQty = parseFloat(item.receivedQty) || 0;
    item.receivedPrice = (rQty * price) - discount + tax;
}

function isOrderClosed(order) {
    if (!order || !order.items || order.items.length === 0) return false;
    return order.items.every(item => item.received && item.received.trim() !== "");
}

function updateTotals() {
    let subtotal = 0;
    let lineTaxTotal = 0;

    currentOrder.items.forEach(item => {
        subtotal += (parseFloat(item.orderPrice) || 0);
        lineTaxTotal += (parseFloat(item.dSalesTax) || 0);
    });

    const headerTax = parseFloat(currentOrder.hSalesTax) || 0;
    const grandTotal = subtotal + headerTax + lineTaxTotal;

    document.getElementById("orderTotal").textContent = "$" + grandTotal.toFixed(2);
}

//maybe Save Before Record Change
async function maybeSaveBeforeRecordChange() {
    if (!isDirty || !currentOrder) return true;
    if (confirm("Save changes to current order before switching?")) {
        await saveOrder();
    }
    return true;
}

// Save Order
async function saveOrder() {
    if (!currentOrder) return;

    const rows = document.querySelectorAll(".order-item-row");
    const rebuilt = [];

    rows.forEach(row => {
        const index = parseInt(row.dataset.index);
        if (isNaN(index)) return;

        const inputs = row.querySelectorAll("input");
        const sku = inputs[0].value.trim();
        if (!sku) return;

        rebuilt.push({
            sku: sku,
            itemName: inputs[1].value.trim(),
            snapYes: parseInt(inputs[2].value) || 0,
            orderQty: parseFloat(inputs[3].value) || 0,
            pricePerUOM: parseFloat(inputs[4].value) || 0,
            discount: parseFloat(inputs[5].value) || 0,
            dSalesTax: parseFloat(inputs[6].value) || 0,   // Item Sales Tax
            received: inputs[7].value.trim(),
            receivedQty: parseFloat(inputs[8].value) || 0,
            orderPrice: 0,
            receivedPrice: 0
        });
    });

    currentOrder.items = rebuilt;
    currentOrder.items.forEach(recalcItem);
    updateTotals();

    try {
        await fetch("php/saveOrder.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentOrder)
        });

        isDirty = false;
        showSaveStatus("✓ Saved");
        loadRecentOrders();
    } catch (err) {
        console.error("Save failed", err);
        showSaveStatus("Save failed", true);
    }
}

// Remove Item
function removeItem(index) {
    if (isOrderClosed(currentOrder)) return;
    currentOrder.items.splice(index, 1);
    isDirty = true;
    renderAllItems();
    triggerAutosave();
}

// Update Open Orders Total
async function updateOpenOrdersTotal() {
    try {
        const response = await fetch("data/order.json");
        const allOrders = await response.json();
        let openTotal = 0;

        allOrders.forEach(order => {
            const isOpen = order.items.some(item => !item.received || item.received.trim() === "");
            if (isOpen) {
                openTotal += order.items.reduce((sum, item) => sum + (parseFloat(item.orderPrice) || 0), 0);
            }
        });

        document.getElementById("openOrdersTotal").textContent = "$" + openTotal.toFixed(2);
    } catch (e) {
        console.error("Failed to update open orders total", e);
    }
}

// New Order
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
        hSalesTax: 0,
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
    document.getElementById("hSalesTax").value = 0;

    document.getElementById("itemsBody").innerHTML = "";
    addNewItem();
    triggerAutosave();
    loadRecentOrders();
}

// Get Next Order Number
async function getNextOrderNumber() {
    try {
        const response = await fetch("data/order.json");
        const allOrders = await response.json();
        let max = 0;
        allOrders.forEach(o => {
            const num = parseInt(o.orderNumber) || 0;
            if (num > max) max = num;
        });
        return max + 1;
    } catch (e) {
        return 800;
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadRecentOrders();
    updateOpenOrdersTotal();
    loadVendors();
});