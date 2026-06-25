// js/order.js

import { currentTimestamp, todayISO, numberFormat, itemIdentity } from "./global.js";
import { orderedItemLabels } from "./orderedItemLabels.js";

export const order = {

    saveCallback: null,   // AUTOSAVE HOOK

    // ============================
    // Create a new blank order
    // ============================
    createBlankOrder() {
        return {
            orderNumber: "NEW-" + Date.now(),
            vendor: "",
            vendorOrderNumber: "",
            orderDate: new Date().toISOString(),   // full timestamp
            paymentMethod: "",
            shippingMethod: "",
            trackingNumber: "",
            orderType: "Order",
            items: []
        };
    },

    // ============================
    // Load order.json
    // ============================
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
                    received: row.received || "2045-12-31",
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

    // ============================
    // Render recent orders
    // ============================
    renderRecent(container, mode = "open") {
        container.innerHTML = "";

        if (!this.orders || this.orders.length === 0) {
            container.textContent = "No orders found.";
            return;
        }

        let filtered = this.orders;

        if (mode === "open") {
            filtered = filtered.filter(ord =>
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

    // ============================
    // Render a single order
    // ============================
    renderOrderDetails(ord) {
        const container = document.getElementById("order-details");
        const footerContainer = document.getElementById("order-footer-container");

        container.innerHTML = "";
        footerContainer.innerHTML = "";

        const header = document.createElement("div");
        header.className = "order-header";

        const displayDate = ord.orderDate.substring(0, 10);

        header.innerHTML = `
            <h2>Order ${ord.orderNumber}</h2>
            <div><strong>Vendor:</strong> ${ord.vendor}</div>
            <div><strong>Order Date:</strong> ${displayDate}</div>
            <div><strong>Vendor Order #:</strong> ${ord.vendorOrderNumber}</div>
            <div><strong>Payment:</strong> ${ord.paymentMethod}</div>
            <div><strong>Shipping:</strong> ${ord.shippingMethod}</div>
            <div><strong>Tracking:</strong> ${ord.trackingNumber}</div>
        `;

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
                input.type = "text";
                input.value = numberFormat(item[field], fieldFormat[field]);

                input.addEventListener("change", () => {
                    item[field] = input.value;

                    // AUTOSAVE
                    if (order.saveCallback) {
                        order.saveCallback(ord);
                    }
                });

                wrapper.appendChild(label);
                wrapper.appendChild(input);
                row.appendChild(wrapper);
            });

            itemsDiv.appendChild(row);
        });

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

        // Compute global open orders total
        const openOrdersTotal = this.orders
            .filter(o => o.items.some(it => !it.received || it.received > todayISO()))
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

        footerContainer.appendChild(footer);
    }
};
