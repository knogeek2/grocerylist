// js/order.js

import { currentTimestamp, nz, todayISO } from "./global.js";

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
            const key = nz(row.orderNo || row.orderNumber, "string");
            if (!key) return;

            if (!map.has(key)) {
                map.set(key, {
                    orderNumber: key,
                    vendor: nz(row.vendor, "string"),
                    orderDate: nz(row.orderDate, "date"),
                    vendorOrderNo: nz(row.vendorOrderNo, "string"),
                    paymentMethod: nz(row.paymentMethod, "string"),
                    shippingMethod: nz(row.shippingMethod, "string"),
                    trackingNumber: nz(row.trackingNumber, "string"),
                    items: []
                });
            }

            const ord = map.get(key);

            ord.items.push({
                sku: nz(row.sku, "string"),
                description: nz(row.description || row.itemDesc, "string"),
                qty: nz(row.qty, "number"),
                price: nz(row.price, "number"),
                received: nz(row.received, "date"),   // or string if you prefer to keep as-is
                // Add any other item fields you need
            });
        });

        this.list = Array.from(map.values());

        this.list.sort((a, b) => {
            const da = new Date(a.orderDate || "1900-01-01");
            const db = new Date(b.orderDate || "1900-01-01");
            return db - da;
        });

        console.log(`Grouped ${this.list.length} unique orders`);
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

    async load(orderNumber) {
        const response = await fetch("./data/order.json");
        if (!response.ok) throw new Error("Failed to fetch order.json");

        const allRows = await response.json();

        // Group on-the-fly for a single order (or use pre-grouped list if available)
        const itemsForOrder = allRows.filter(r => nz(r.orderNo || r.orderNumber, "string") === orderNumber);

        if (itemsForOrder.length === 0) return null;

        // Take header info from first row
        const first = itemsForOrder[0];

        return {
            orderNumber: nz(first.orderNo || first.orderNumber, "string"),
            vendor: nz(first.vendor, "string"),
            orderDate: nz(first.orderDate, "date"),
            vendorOrderNo: nz(first.vendorOrderNo, "string"),
            paymentMethod: nz(first.paymentMethod, "string"),
            shippingMethod: nz(first.shippingMethod, "string"),
            trackingNumber: nz(first.trackingNumber, "string"),
            items: itemsForOrder.map(row => ({
                sku: nz(row.sku, "string"),
                description: nz(row.description || row.itemDesc, "string"),
                qty: nz(row.qty, "number"),
                price: nz(row.price, "number"),
                received: nz(row.received, "date"),
            }))
        };
    },

    async initPage() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container #${this.containerId} not found`);
            return;
        }

        container.innerHTML = '<p class="recent-loading">Loading recent orders…</p>';

        try {
            const recent = await this.loadRecent(10);
            this.renderRecent(recent, container);

            if (recent.length > 0) {
                const mostRecent = recent[0].orderNumber;
                console.log(`Auto-populating most recent order: ${mostRecent}`);
                await this.loadAndPopulate(mostRecent);
            }
        } catch (err) {
            console.error("Init failed:", err);
            container.innerHTML = '<p class="recent-error">Could not load orders. See console.</p>';
        }
    },

    renderRecent(orders, container) {
        container.innerHTML = "";

        if (orders.length === 0) {
            container.innerHTML = '<p class="recent-loading">No recent orders found.</p>';
            return;
        }

        const table = document.createElement("table");
        table.className = "recent-table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Order #</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th class="items-count">Items</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.tBodies[0];

        orders.forEach(o => {
            const tr = document.createElement("tr");
            tr.addEventListener("click", async () => {
                const success = await this.loadAndPopulate(o.orderNumber);
                if (success) {
                    tbody.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
                    tr.classList.add("selected");
                }
            });

            tr.innerHTML = `
                <td class="order-number">${o.orderNumber}</td>
                <td>${o.vendor || "—"}</td>
                <td>${o.orderDate || "—"}</td>
                <td class="items-count">${o.items.length}</td>
            `;

            tbody.appendChild(tr);
        });

        container.appendChild(table);
    },

    async loadAndPopulate(orderNumber) {
        const selected = await this.load(orderNumber);
        if (!selected) {
            console.warn(`Order ${orderNumber} not found`);
            return false;
        }

        this.populateHeader(selected);
        this.populateItems(selected.items || []);
        this.populateTotals(selected);

        return true;
    },

    populateHeader(order) {
        const mappings = {
            "orderNumber": order.orderNumber,
            "vendor": order.vendor,
            "vendorOrderNumber": order.vendorOrderNo,
            "orderDate": order.orderDate,
            "paymentMethod": order.paymentMethod,
            "shippingMethod": order.shippingMethod,
            "trackingNumber": order.trackingNumber,
            "orderType": order.orderType || "Order"
        };

        Object.entries(mappings).forEach(([name, value]) => {
            const el = document.querySelector(`[name="${name}"]`);
            if (el) el.value = value ?? "";
        });
    },

    populateItems(items) {
        const container = document.getElementById("order-items-container");
        if (!container) return;

        container.innerHTML = "";

        if (items.length === 0) {
            container.innerHTML = '<div class="item-row empty-message">No items in this order.</div>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement("div");
            row.className = "item-row";

            row.innerHTML = `
                <input type="text" value="${item.description || ""}" placeholder="Description">
                <input type="number" value="${item.qty || 1}" step="0.01" placeholder="Qty">
                <input type="number" value="${item.price || 0}" step="0.01" placeholder="Price">
                <input type="text" value="${item.received || ""}" placeholder="Received">
                <!-- expand with more fields as needed -->
            `;

            container.appendChild(row);
        });
    },

    populateTotals(order) {
        // Simple example – adjust based on your actual calculation needs
        const subtotal = order.items.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);
        const shipping = 0;     // pull from order.shipping if available
        const salesTax = 0;     // pull from order.salesTax or calculate
        const grandTotal = subtotal + shipping + salesTax;

        const setValue = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = Number(val).toFixed(2);
        };

        setValue("subtotal", subtotal);
        setValue("totalWeight", 0);     // calculate if needed
        setValue("shipping", shipping);
        setValue("totalSalesTax", salesTax);
        setValue("total", grandTotal);
    },

    // ────────────────────────────────────────────────
    // Other original methods (kept, with minor camelCase consistency)
    // ────────────────────────────────────────────────

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
        return this.list.filter(o =>
            o.orderNumber.includes(term) ||
            o.vendor.toLowerCase().includes(term)
        );
    },

    getMostRecent() {
        if (this.list.length === 0) return null;
        return this.list.reduce((latest, curr) =>
            new Date(curr.orderDate) > new Date(latest.orderDate) ? curr : latest
        );
    },

    isClosed(order) {
        return order.items.length > 0 &&
            order.items.every(item => (item.received || 0) >= (item.qty || 0));
    },

    getLockState(order) {
        return {
            editable: !this.isClosed(order)
        };
    }
};