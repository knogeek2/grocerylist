// js/order.js

import { currentTimestamp, todayISO } from "./global.js";

export const order = {
    containerId: "recent-orders-container",

    list: [],     // all grouped orders, sorted newest → oldest
    recent: [],   // the top 10 (or fewer)

    async loadAndGroupAll() {
        const response = await fetch("./data/order.json");
        if (!response.ok) {
            throw new Error(`Failed to load order.json - status: ${response.status}`);
        }

        const rows = await response.json();
        const map = new Map();

        rows.forEach(row => {
            const key = row.orderNumber;
            if (!key) return;

            // 1. If we haven't seen this orderNumber yet, initialize the Header data
            if (!map.has(key)) {
                map.set(key, {
                    orderNumber: row.orderNumber,
                    vendor: row.vendor ?? "",
                    orderType: row.orderType ?? "Order",
                    vendorOrderNumber: row.vendorOrderNumber ?? "",
                    orderDate: row.orderDate || "2045-12-31",
                    paymentMethod: row.paymentMethod ?? "",
                    shippingMethod: row.shippingMethod ?? "",
                    trackingNumber: row.trackingNumber ?? "",
                    items: [] // This will hold our Detail rows
                });
            }

            const ord = map.get(key);

            // 2. Every row contains item details, so push them into the Header's items array
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

        this.list = Array.from(map.values());

        // Sort newest → oldest based on Access orderDate
        this.list.sort((a, b) => {
            const da = new Date(a.orderDate || "1900-01-01");
            const db = new Date(b.orderDate || "1900-01-01");
            return db - da;
        });

        console.log(`Grouped ${this.list.length} unique orders from flat database rows`);
        if (this.list.length > 0) {
            console.log("Sample recent order:", this.list[0]);
        }

        return this.list;
    },

    async loadRecent(limit = 10) {
        if (this.list.length === 0) {
            await this.loadAndGroupAll();
        }
        this.recent = this.list.slice(0, limit);
        console.log(`Showing ${this.recent.length} most recent orders`);
        return this.recent;
    },

    renderRecent(containerId = this.containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "";

        if (this.recent.length === 0) {
            container.innerHTML = "<p>No recent orders found.</p>";
            return;
        }

        const ul = document.createElement("ul");
        ul.className = "recent-orders-list";

        this.recent.forEach(ord => {
            const li = document.createElement("li");
            li.className = "recent-order-item";
            li.dataset.orderNumber = ord.orderNumber;

            // Simple preview text for the sidebar row
            li.innerHTML = `
                <div class="ro-main"><strong>#${ord.orderNumber}</strong> — ${ord.vendor}</div>
                <div class="ro-sub">${ord.orderDate} &bull; ${ord.items.length} items</div>
            `;

            li.addEventListener("click", () => {
                // Remove active styling from previous selection
                document.querySelectorAll(".recent-order-item").forEach(el => {
                    el.classList.remove("active");
                });
                li.classList.add("active");

                // Populate main panel details
                this.viewOrderDetails(ord);
            });

            ul.appendChild(li);
        });

        container.appendChild(ul);
    },

    viewOrderDetails(ord) {
        // Map headers to form elements
        const fields = [
            "orderNumber", "vendor", "vendorOrderNumber", "orderDate",
            "paymentMethod", "shippingMethod", "trackingNumber", "orderType"
        ];

        fields.forEach(f => {
            const input = document.querySelector(`#order-details input[name="${f}"]`);
            if (input) {
                input.value = ord[f] ?? "";
            }
        });

        // Render line items section
        const container = document.getElementById("order-items-container");
        if (!container) return;

        container.innerHTML = "";

        if (!ord.items || ord.items.length === 0) {
            container.innerHTML = "<p>This order has no items listed.</p>";
            return;
        }

        ord.items.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "order-item-row";

            // Array mapping of detail inputs to construct
            const itemFields = [
                ["sku", "text", "SKU"],
                ["itemName", "text", "Item Name"],
                ["orderQty", "number", "Order Qty"],
                ["pricePerUOM", "number", "Price/UOM"],
                ["received", "text", "Received Date"],
                ["receivedQty", "number", "Received Qty"],
                ["discount", "number", "Discount"],
                ["salesTax", "number", "Sales Tax"],
                ["orderPrice", "number", "Order Price"],
                ["receivedPrice", "number", "Received Price"]
            ];

            itemFields.forEach(([key, type, placeholder]) => {
                const input = document.createElement("input");

                if (type === "number") {
                    input.type = "number";
                    input.step = "0.01";
                    input.min = "0";
                    input.value = Number(item[key] ?? 0);
                } else {
                    input.type = "text";
                    input.value = item[key] ?? "";
                }

                input.placeholder = placeholder;
                input.name = `item-${key}-${index}`;
                row.appendChild(input);
            });

            container.appendChild(row);
        });
    },

    createBlank() {
        return {
            orderNumber: "",
            vendor: "",
            orderDate: todayISO(),
            vendorOrderNo: "",
            paymentMethod: "",
            shippingMethod: "",
            trackingNumber: "",
            orderType: "Order",
            createdAt: currentTimestamp(),
            items: []
        };
    },

    search(term) {
        term = term.toLowerCase();
        return this.list.filter(ord =>
            String(ord.orderNumber).toLowerCase().includes(term) ||
            ord.vendor.toLowerCase().includes(term)
        );
    }
};
