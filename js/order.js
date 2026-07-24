// order.js - Complete Corrected Version

let currentOrder = null;
let isDirty = false;
let autosaveTimeout = null;
let vendors = [];
let itemsMaster = [];

// Utility function to format numbers with commas and fixed decimals
function formatNumber(value, decimals = 2) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Load Vendors
async function loadVendors() {
    try {
        const response = await fetch("data/vendor.json");
        vendors = await response.json();
        populateVendorDatalist();
    } catch (e) {
        console.error("Failed to load vendors", e);
    }
}

// Load Items Master
async function loadItemsMaster() {
    try {
        const response = await fetch("data/item.json");
        itemsMaster = await response.json();
    } catch (e) {
        console.error("Failed to load items", e);
        itemsMaster = [];
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

function filterVendorList(value) {
    // Can be expanded for live filtering if desired
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

function findItemBySku(sku) {
    if (!sku) return null;
    return itemsMaster.find(i => String(i.sku).toLowerCase() === String(sku).toLowerCase());
}

function getOrderStatus(order) {
    if (!order || !order.items || order.items.length === 0) return "New";
    const hasOnlyBlank = order.items.length === 1 &&
        (!order.items[0].sku || order.items[0].sku.trim() === "");
    if (hasOnlyBlank) return "New";
    const allReceived = order.items.every(item =>
        item.received && item.received.trim() !== "" && parseFloat(item.receivedQty || 0) > 0
    );
    return allReceived ? "Closed" : "Open";
}

async function loadRecentOrders() {
    try {
        const response = await fetch("data/order.json");
        const allOrders = await response.json();

        // Keep only open orders, newest first, max 10
        const openOrders = allOrders
            .filter(order => getOrderStatus(order) !== "Closed")
            .sort((a, b) => parseInt(b.orderNumber) - parseInt(a.orderNumber))
            .slice(0, 10);

        const container = document.getElementById("recentOrdersList");
        container.innerHTML = "";

        openOrders.forEach(order => {
            const li = document.createElement("li");
            li.textContent = order.orderNumber;
            li.onclick = () => loadOrder(order.orderNumber);

            if (currentOrder && String(currentOrder.orderNumber) === String(order.orderNumber)) {
                li.classList.add("selected");
            }
            container.appendChild(li);
        });
    } catch (e) {
        console.error("Failed to load recent orders", e);
    }
}

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

async function loadOrder(orderNumber) {
    if (!await maybeSaveBeforeRecordChange()) return;

    const response = await fetch("data/order.json");
    const allOrders = await response.json();
    const orderData = allOrders.find(o => String(o.orderNumber) === String(orderNumber));
    if (!orderData) return;

    currentOrder = JSON.parse(JSON.stringify(orderData));

    // Pull shipWeight from master if the order item doesn't have it
    currentOrder.items.forEach(item => {
        if (item.shipWeight === undefined || item.shipWeight === null || item.shipWeight === "") {
            const master = findItemBySku(item.sku);
            if (master) {
                item.shipWeight = master.shipWeight || 0;
            } else {
                item.shipWeight = 0;
            }
        }
    });

    document.getElementById("orderNumber").value = currentOrder.orderNumber || "";
    document.getElementById("vendor").value = currentOrder.vendor || "";
    document.getElementById("orderStatus").value = getOrderStatus(currentOrder);
    // Date fix
    document.getElementById("orderDate").value = currentOrder.orderDate ? currentOrder.orderDate.split(' ')[0] : "";
    document.getElementById("vendorOrderNumber").value = currentOrder.vendorOrderNumber || "";
    document.getElementById("paymentMethod").value = currentOrder.paymentMethod || "";
    document.getElementById("shippingMethod").value = currentOrder.shippingMethod || "";
    document.getElementById("trackingNumber").value = currentOrder.trackingNumber || "";
    document.getElementById("hSalesTax").value = currentOrder.hSalesTax || 0;
    document.getElementById("orderNote").value = currentOrder.note || "";

    renderAllItems();
    isDirty = false;
    updateOpenOrdersTotal();
    loadRecentOrders();
}

function renderAllItems() {
    const container = document.getElementById("itemsBody");
    if (!container) return;
    container.innerHTML = "";

    const status = getOrderStatus(currentOrder);
    const isClosed = status === "Closed";

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
        <input tabindex="${baseTab}" value="${item.sku || ''}" onchange="onSkuChange(${index}, this.value)" placeholder="SKU" ${disabled}>

        <label>Item Name</label>
        <input tabindex="${baseTab + 1}" value="${item.itemName || ''}" onchange="onItemChange(${index}, 'itemName', this.value)" placeholder="Item Name" ${disabled}>

        <label>Order Qty</label>
        <input tabindex="${baseTab + 2}" type="number" step="0.01" value="${item.orderQty || 0}" onchange="onItemChange(${index}, 'orderQty', this.value)" ${disabled}>

        <label>Price/UOM</label>
        <input tabindex="${baseTab + 3}" type="number" step="0.01" value="${item.pricePerUOM || 0}" onchange="onItemChange(${index}, 'pricePerUOM', this.value)" ${disabled}>

        <label>Shipping Weight of One</label>
        <input tabindex="${baseTab + 4}" type="number" step="0.01" value="${item.shipWeight || 0}" onchange="onItemChange(${index}, 'shipWeight', this.value)" ${disabled}>

        <label>Discount</label>
        <input tabindex="${baseTab + 5}" type="number" step="0.01" value="${item.discount || 0}" onchange="onItemChange(${index}, 'discount', this.value)" ${disabled}>

        <label>Item Sales Tax</label>
        <input tabindex="${baseTab + 6}" type="number" step="0.01" value="${item.dSalesTax || 0}" onchange="onItemChange(${index}, 'dSalesTax', parseFloat(this.value) || 0)" ${disabled}>

        <label>Order Price</label>
        <input tabindex="-1" type="number" step="0.01" value="${item.orderPrice || 0}" readonly style="background:#f0f0f0;">

        <label>Purchase Price</label>
        <input tabindex="-1" type="number" step="0.01" value="${item.receivedPrice || 0}" readonly style="background:#f0f0f0;">

        <label>Received Date</label>
        <input tabindex="${baseTab + 7}" type="date" value="${item.received || ''}" onchange="onItemChange(${index}, 'received', this.value)" ${disabled}>

        <label>Received Qty</label>
        <input tabindex="${baseTab + 8}" type="number" step="0.01" value="${item.receivedQty || 0}" onchange="onItemChange(${index}, 'receivedQty', this.value)" ${disabled}>

        ${isClosed ? '' : `<button tabindex="${baseTab + 9}" onclick="removeItem(${index})">Remove</button>`}
    `;

    return row;
}

function onSkuChange(index, sku) {
    console.log(`onSkuChange called - index: ${index}, SKU: "${sku}"`);
    if (!currentOrder || !currentOrder.items || !currentOrder.items[index]) return;

    const masterItem = findItemBySku(sku);
    console.log("Found master item:", masterItem);
    if (masterItem) {
        currentOrder.items[index].itemName = masterItem.itemName || "";
        currentOrder.items[index].snapYes = masterItem.snapYes || 0;
        currentOrder.items[index].shipWeight = masterItem.shipWeight || 0;
        console.log("Auto-filled item fields");
    }

    renderAllItems();

    onItemChange(index, 'sku', sku);
}

function addNewItem() {
    if (!currentOrder) return;
    if (getOrderStatus(currentOrder) === "Closed") return;

    if (!currentOrder.items) currentOrder.items = [];

    currentOrder.items.push({
        sku: "", itemName: "", snapYes: 0, orderQty: 0, pricePerUOM: 0,
        discount: 0, dSalesTax: 0, received: "", receivedQty: 0,
        orderPrice: 0, receivedPrice: 0, shipWeight: 0
    });

    isDirty = true;
    renderAllItems();
    triggerAutosave();
}

function onFieldChange(field, value) {
    if (getOrderStatus(currentOrder) === "Closed") return;
    currentOrder[field] = value;
    isDirty = true;
    triggerAutosave();
}

function onItemChange(index, field, value) {
    if (getOrderStatus(currentOrder) === "Closed") return;
    if (!currentOrder || !currentOrder.items) return;

    // Ensure the item object exists
    if (!currentOrder.items[index]) {
        currentOrder.items[index] = {
            sku: "", itemName: "", snapYes: 0, orderQty: 0, pricePerUOM: 0,
            discount: 0, dSalesTax: 0, received: "", receivedQty: 0,
            orderPrice: 0, receivedPrice: 0, shipWeight: 0
        };
    }

    currentOrder.items[index][field] = value;
    isDirty = true;

    // Recalculate line totals and overall shipping weight
    recalcItem(currentOrder.items[index]);
    updateTotals();

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

function updateTotals() {
    let subtotal = 0;
    let lineTaxTotal = 0;
    let totalWeight = 0;

    currentOrder.items.forEach(item => {
        subtotal += (parseFloat(item.orderPrice) || 0);
        lineTaxTotal += (parseFloat(item.dSalesTax) || 0);
        totalWeight += (parseFloat(item.shipWeight || 0) * parseFloat(item.orderQty || 1));
    });

    const headerTax = parseFloat(currentOrder.hSalesTax) || 0;
    const grandTotal = subtotal + headerTax + lineTaxTotal;

    document.getElementById("orderTotal").textContent = "$" + formatNumber(grandTotal, 2);

    // Sales Tax % (display only)
    // Sales Tax % (display only)
    const totalTax = headerTax + lineTaxTotal;
    const taxPercent = subtotal > 0 ? (totalTax / subtotal) * 100 : 0;

    // Show it somewhere in the footer (add an element if needed)
    const taxPercentEl = document.getElementById("taxPercent");
    if (taxPercentEl) {
        taxPercentEl.textContent = formatNumber(taxPercent, 2) + "%";
    }

    const weightEl = document.getElementById("totalShippingWeight");
    if (weightEl) {
        weightEl.textContent = formatNumber(totalWeight, 2) + " lbs";
        weightEl.style.color = totalWeight > 20 ? "red" : "";
    }
}

async function maybeSaveBeforeRecordChange() {
    if (!isDirty || !currentOrder) return true;
    if (confirm("Save changes to current order before switching?")) {
        await saveOrder();
    }
    return true;
}

async function saveOrder() {
    if (!currentOrder) return;

    const rows = document.querySelectorAll(".order-item-row");
    const rebuilt = [];

    rows.forEach(row => {
        const index = parseInt(row.dataset.index);
        if (isNaN(index)) return;

        const inputs = row.querySelectorAll("input");

        // Current field order (SNAP removed):
        // 0: SKU
        // 1: Item Name
        // 2: Order Qty
        // 3: Price/UOM
        // 4: Shipping Weight of One
        // 5: Discount
        // 6: Item Sales Tax
        // 7: Order Price (readonly)
        // 8: Purchase Price (readonly)
        // 9: Received Date
        // 10: Received Qty

        const sku = inputs[0].value.trim();
        if (!sku) return;

        rebuilt.push({
            sku: sku,
            itemName: inputs[1].value.trim(),
            snapYes: 0,                          // keep the property, just default it
            orderQty: parseFloat(inputs[2].value) || 0,
            pricePerUOM: parseFloat(inputs[3].value) || 0,
            shipWeight: parseFloat(inputs[4].value) || 0,
            discount: parseFloat(inputs[5].value) || 0,
            dSalesTax: parseFloat(inputs[6].value) || 0,
            received: inputs[9].value.trim(),
            receivedQty: parseFloat(inputs[10].value) || 0,
            orderPrice: 0,
            receivedPrice: 0
        });
    });

    currentOrder.items = rebuilt;
    currentOrder.items.forEach(recalcItem);

    document.getElementById("orderStatus").value = getOrderStatus(currentOrder);

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
function removeItem(index) {
    if (getOrderStatus(currentOrder) === "Closed") return;
    currentOrder.items.splice(index, 1);
    isDirty = true;
    renderAllItems();
    triggerAutosave();
}

async function updateOpenOrdersTotal() {
    try {
        const response = await fetch("data/order.json");
        const allOrders = await response.json();
        let openTotal = 0;
        allOrders.forEach(order => {
            if (getOrderStatus(order) !== "Closed") {
                openTotal += order.items.reduce((sum, item) => sum + (parseFloat(item.orderPrice) || 0), 0);
            }
        });
        document.getElementById("openOrdersTotal").textContent = "$" + openTotal.toFixed(2);
    } catch (e) {
        console.error("Failed to update open orders total", e);
    }
}

async function newOrder() {
    const nextNumber = await getNextOrderNumber();
    currentOrder = {
        orderNumber: nextNumber,
        vendor: "",
        orderDate: new Date().toISOString().split('T')[0],
        vendorOrderNumber: "",
        paymentMethod: "",
        shippingMethod: "",
        trackingNumber: "",
        hSalesTax: 0,
        note: "",
        items: []
    };

    document.getElementById("orderNumber").value = currentOrder.orderNumber;
    document.getElementById("vendor").value = "";
    document.getElementById("orderStatus").value = "New";
    document.getElementById("orderDate").value = currentOrder.orderDate;
    document.getElementById("vendorOrderNumber").value = "";
    document.getElementById("paymentMethod").value = "";
    document.getElementById("shippingMethod").value = "";
    document.getElementById("trackingNumber").value = "";
    document.getElementById("hSalesTax").value = 0;
    document.getElementById("orderNote").value = "";

    document.getElementById("itemsBody").innerHTML = "";
    addNewItem();
    triggerAutosave();
    loadRecentOrders();
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
    loadItemsMaster();
});