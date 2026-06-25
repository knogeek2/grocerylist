// js/order.js

import { currentTimestamp, todayISO, numberFormat, itemIdentity } from "./global.js";
import { orderedItemLabels } from "./orderedItemLabels.js";

export const order = {

    // ★ Track whether the order has unsaved changes
    dirty: false,

    // ★ PHP SAVE HOOK — saveCallback will call saveOrder() below
    saveCallback: null,

    // ★ Reference to the Save button so we can enable/disable it
    saveButton: null,

    updateSaveButton() {
        if (this.saveButton) {
            this.saveButton.disabled = !this.dirty;
        }
    },

    createBlankOrder() {
        return {
            orderNumber: "NEW-" + Date.now(),
            vendor: "",
            vendorOrderNumber: "",
            orderDate: new Date().toISOString(),
            paymentMethod: "",
            shippingMethod: "",
            trackingNumber: "",
            orderType: "Order",
            items: []
        };
    },

    async load() {
        const response = await fetch("./data/order.json");
        const data = await response.json();

        const map = new Map();

        data.forEach(row => {
            if (!map.has(row.orderNumber)) {
                map.set(row.orderNumber, {
                    orderNumber: row.orderNumber,
                    vendor: row.vendor,
                    vendorOrderNumber: row.vendorOrderNumber ?? "",
                    orderDate: row.orderDate
                        ? new Date(row.orderDate).toISOString()
                        : new Date().toISOString(),
                    paymentMethod: row.paymentMethod ?? "",
                    shippingMethod: row.shippingMethod ?? "",
                    trackingNumber: row.trackingNumber ?? "",
                    orderType: row.orderType ?? "Order",
                    items: []
                });
            }

            const ord = map.get(row.orderNumber);

            if (row.sku) {
                ord.items.push({
                    sku: row.sku ?? "",
                    itemName: row.itemName ?? "",
                    orderQty: Number(row.orderQty ?? 0),
                    pricePerUOM: Number(row.pricePerUOM ?? 0),
                    received: row.received || "",
                    receivedQty: Number(row.receivedQty ?? 0),
                    discount: Number(row.discount ?? 0),
                    salesTax: Number(row.salesTax ?? 0),
                    orderPrice: Number(row.orderPrice ?? 0),
                    receivedPrice: Number(row.receivedPrice ?? 0)
                });
            }
        });

        this.orders = Array.from(map.values());
        return this.orders;
    },

    renderRecent(container, mode = "open") {
        container.innerHTML = "";

        if (!this.orders || this.orders.length === 0) {
            container.textContent = "No orders found.";
            return;
        }

        let filtered = this.orders;

        if (mode === "open") {
            filtered = filtered.filter(ord =>
                ord.items.length === 0 ||
                ord.items.some(it => !it.received || it.received > todayISO())
            );
        }

        const sorted = [...filtered].sort((a, b) =>
            b.orderDate.localeCompare(a.orderDate)
        );

        sorted.forEach(ord => {
            const div = document.createElement("div");
            div.className = "recent-order";

            div.innerHTML = `
                <div><strong>${ord.orderNumber}</strong></div>
                <div>${ord.vendor}</div>
                <div>${ord.orderDate.substring(0, 10)}</div>
            `;

            div.addEventListener("click", () => this.renderOrderDetails(ord));
            container.appendChild(div);
        });
    },

    renderOrderDetails(ord) {
        const container = document.getElementById("order-details");
        const footerContainer = document.getElementById("order-footer-container");

        container.innerHTML = "";
        footerContainer.innerHTML = "";

        const isClosed = this.isOrderClosed(ord);

        const header = document.createElement("div");
        header.className = "order-header";

        const displayDate = ord.orderDate.substring(0, 10);

        header.innerHTML = `
            <h2>Order ${ord.orderNumber}</h2>

            <div class="item-field">
                <label>Vendor</label>
                <input type="text" value="${ord.vendor}" ${isClosed ? "readonly" : ""}>
            </div>

            <div class="item-field">
                <label>Order Date</label>
                <input type="date" value="${displayDate}" ${isClosed ? "readonly" : ""}>
            </div>

            <div class="item-field">
                <label>Vendor Order #</label>
                <input type="text" value="${ord.vendorOrderNumber}" ${isClosed ? "readonly" : ""}>
            </div>

            <div class="item-field">
                <label>Payment Method</label>
                <input type="text" value="${ord.paymentMethod}" ${isClosed ? "readonly" : ""}>
            </div>

            <div class="item-field">
                <label>Shipping Method</label>
                <input type="text" value="${ord.shippingMethod}" ${isClosed ? "readonly" : ""}>
            </div>

            <div class="item-field">
                <label>Tracking Number</label>
                <input type="text" value="${ord.trackingNumber}" ${isClosed ? "readonly" : ""}>
            </div>
        `;

        if (!isClosed) {
            const inputs = header.querySelectorAll("input");

            const markDirty = () => {
                this.dirty = true;
                this.updateSaveButton();
            };

            inputs[0].addEventListener("change", () => { ord.vendor = inputs[0].value; markDirty(); });
            inputs[1].addEventListener("change", () => { ord.orderDate = inputs[1].value; markDirty(); });
            inputs[2].addEventListener("change", () => { ord.vendorOrderNumber = inputs[2].value; markDirty(); });
            inputs[3].addEventListener("change", () => { ord.paymentMethod = inputs[3].value; markDirty(); });
            inputs[4].addEventListener("change", () => { ord.shippingMethod = inputs[4].value; markDirty(); });
            inputs[5].addEventListener("change", () => { ord.trackingNumber = inputs[5].value; markDirty(); });
        }

        container.appendChild(header);

        const itemsDiv = document.createElement("div");
        itemsDiv.className = "order-items";

        const fieldFormat = {
            orderQty: "integer",
            pricePerUOM: "standard",
            receivedQty: "integer",
            discount: "accounting",
            salesTax: "standard",
            orderPrice: "accounting",
            receivedPrice: "accounting"
        };

        ord.items.forEach(item => {
            const row = document.createElement("div");
            row.className = "order-item-row";

            const identity = document.createElement("div");
            identity.className = "item-identity";
            identity.textContent = itemIdentity(item);
            row.appendChild(identity);

            const orderedItemFields = [
                "orderQty",
                "pricePerUOM",
                "received",
                "receivedQty",
                "discount",
                "salesTax",
                "orderPrice",
                "receivedPrice"
            ];

            orderedItemFields.forEach(field => {
                const wrapper = document.createElement("div");
                wrapper.className = "item-field";

                const label = document.createElement("label");
                label.textContent = orderedItemLabels[field] ?? field;

                const input = document.createElement("input");
                input.type = field === "received" ? "date" : "text";
                input.value = field === "received"
                    ? (item.received ? item.received.substring(0, 10) : "")
                    : numberFormat(item[field], fieldFormat[field]);

                if (isClosed) input.setAttribute("readonly", "");

                input.addEventListener("change", () => {
                    if (field === "received") {
                        if (input.value > todayISO()) {
                            this.showNotification("Received date must be today or in the past");
                            input.value = "";
                            item.received = "";
                            return;
                        }
                        item.received = input.value;
                    } else {
                        item[field] = input.value;
                    }

                    this.dirty = true;
                    this.updateSaveButton();

                    if (this.isOrderClosed(ord)) this.renderOrderDetails(ord);
                });

                wrapper.appendChild(label);
                wrapper.appendChild(input);
                row.appendChild(wrapper);
            });

            itemsDiv.appendChild(row);
        });

        if (!isClosed) {
            const newRow = document.createElement("div");
            newRow.className = "order-item-row";

            const identity = document.createElement("div");
            identity.className = "item-identity";
            identity.textContent = "";
            newRow.appendChild(identity);

            const fields = [
                { name: "itemName", label: "Item Name", type: "text", placeholder: "Enter item name" },
                { name: "sku", label: "SKU", type: "text", placeholder: "SKU (optional)" },
                { name: "orderQty", label: "Order Qty", type: "number", placeholder: "0" },
                { name: "pricePerUOM", label: "Price per UOM", type: "number", placeholder: "0.00", step: "0.01" }
            ];

            const inputs = {};

            fields.forEach(f => {
                const wrapper = document.createElement("div");
                wrapper.className = "item-field";

                const label = document.createElement("label");
                label.textContent = f.label;

                const input = document.createElement("input");
                input.type = f.type;
                input.placeholder = f.placeholder;
                if (f.step) input.step = f.step;

                input.addEventListener("input", () => {
                    identity.textContent = inputs.itemName.value.trim();
                });

                inputs[f.name] = input;

                wrapper.appendChild(label);
                wrapper.appendChild(input);
                newRow.appendChild(wrapper);
            });

            const addBtn = document.createElement("button");
            addBtn.textContent = "Add Item";
            addBtn.className = "add-item-btn";

            addBtn.addEventListener("click", () => {
                const name = inputs.itemName.value.trim();
                const sku = inputs.sku.value.trim();
                const qty = Number(inputs.orderQty.value);
                const price = Number(inputs.pricePerUOM.value);

                if (!name || qty <= 0 || price <= 0) {
                    this.showNotification("Item Name, Qty, and Price are required");
                    return;
                }

                ord.items.push({
                    sku,
                    itemName: name,
                    orderQty: qty,
                    pricePerUOM: price,
                    received: "",
                    receivedQty: 0,
                    discount: 0,
                    salesTax: 0,
                    orderPrice: qty * price,
                    receivedPrice: 0
                });

                this.dirty = true;
                this.updateSaveButton();

                this.renderOrderDetails(ord);
            });

            newRow.appendChild(addBtn);
            itemsDiv.appendChild(newRow);
        }

        container.appendChild(itemsDiv);

        const footer = document.createElement("div");
        footer.className = "order-footer";

        const itemCount = ord.items.length;
        const subtotal = ord.items.reduce((sum, it) => sum + Number(it.orderPrice || 0), 0);
        const totalWeight = ord.items.reduce((sum, it) => sum + Number(it.weight || 0), 0);
        const shipping = 0;
        const taxRate = 0;
        const taxTotal = subtotal * taxRate;
        const orderTotal = subtotal + taxTotal + shipping;

        const openOrdersTotal = this.orders
            .filter(o => o.items.length === 0 || o.items.some(it => !it.received || it.received > todayISO()))
            .reduce((sum, o) => {
                return sum + o.items.reduce((s, it) => s + Number(it.orderPrice || 0), 0);
            }, 0);

        footer.innerHTML = `
            <div class="footer-title">Order Totals</div>

            <div class="footer-row">
                <span>${itemCount} items ordered</span>
                <span>Subtotal</span>
                <span>${numberFormat(subtotal, "standard")}</span>
            </div>

            <div class="footer-row">
                <span>${numberFormat(totalWeight, "standard")} Total Weight</span>
                <span>Shipping</span>
                <span>${numberFormat(shipping, "standard")}</span>
            </div>

            <div class="footer-row">
                <span>${numberFormat(taxRate, "percent")}</span>
                <span>Sales Tax</span>
                <span>${numberFormat(taxTotal, "standard")}</span>
            </div>

            <div class="footer-row total">
                <span>Order Total:</span>
                <span>${numberFormat(orderTotal, "standard")}</span>
            </div>

            <hr>

            <div class="footer-row total">
                <span><strong>Open Orders Total:</strong></span>
                <span><strong>${numberFormat(openOrdersTotal, "standard")}</strong></span>
            </div>
        `;

        // ★ Always show Save button, but disable unless dirty
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save Order";
        saveBtn.className = "save-order-btn";
        saveBtn.disabled = !this.dirty;

        saveBtn.addEventListener("click", () => {
            this.saveCallback?.(ord);
            this.dirty = false;
            this.updateSaveButton();
            this.showNotification("Saved");
        });

        footer.appendChild(saveBtn);
        this.saveButton = saveBtn;

        footerContainer.appendChild(footer);
    },

    isOrderClosed(ord) {
        if (ord.items.length === 0) return false;

        return ord.items.every(it =>
            it.received &&
            it.received <= todayISO()
        );
    },

    showNotification(msg) {
        const note = document.createElement("div");
        note.className = "notification";
        note.textContent = msg;

        document.body.appendChild(note);

        setTimeout(() => {
            note.style.opacity = "0";
            setTimeout(() => note.remove(), 500);
        }, 2000);
    }
};

// ============================
// ★ PHP SAVE HOOK — real persistence
// ============================

async function saveOrder(ord) {
    try {
        console.log("➡️ JS: Sending order to PHP:", ord);
        console.log("ORD BEFORE STRINGIFY:", JSON.stringify(ord, null, 2));

        const response = await fetch("/grocerylist/php/saveOrder.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ord)
        });

        const raw = await response.text();
        console.log("⬅️ JS: Raw PHP response:", raw);

        try {
            const parsed = JSON.parse(raw);
            console.log("⬅️ JS: Parsed JSON:", parsed);
        } catch (e) {
            console.error("❌ JS: Could not parse JSON:", e);
        }

    } catch (err) {
        console.error("❌ JS: Fetch failed:", err);
    }
}

order.saveCallback = saveOrder;

// ============================
// FOOTER AUTO-HIDE ON SCROLL
// ============================

let lastScroll = 0;

window.addEventListener("scroll", () => {
    const footer = document.querySelector(".order-footer");
    if (!footer) return;

    const current = window.scrollY;

    if (current > lastScroll) {
        footer.classList.add("footer-hidden");
    } else {
        footer.classList.remove("footer-hidden");
    }

    lastScroll = current;
});
