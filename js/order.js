// js/order.js

import { currentTimestamp, nz, todayISO } from "./global.js";

export const order = {
    containerId: "recent-orders-container",

    list: [],     // all grouped orders, sorted newest → oldest
    recent: [],   // the top 10 (or fewer)

    // ────────────────────────────────────────────────
    // Data loading & grouping
    // ────────────────────────────────────────────────

    async loadAndGroupAll() {
        const response = await fetch("./data/order.json");
        if (!response.ok) {
            throw new Error(`Failed to load order.json - status: ${response.status}`);
        }

        const rows = await response.json();

        const map = new Map();

        rows.forEach(row => {
            // Try several possible field names for the order identifier
            const key = nz(row.ORDERNOTXT || row.ORDERNO || row.OrdNo || row.OrderNumber || row.ORDER_NUMBER, "string");
            if (!key) return;

            if (!map.has(key)) {
                map.set(key, {
                    orderNumber: key,
                    vendor: nz(row.VENDOR || row.VendorName || row.Supplier || row.VENDOR_NAME, "string"),
                    orderDate: nz(row.ORDERDATE || row.OrderDate || row.Date || row.ORDER_DATE || row.Order_Date, "date"),
                    items: []
                });
            }

            const ord = map.get(key);
            ord.items.push(row);
        });

        this.list = Array.from(map.values());

        // Sort newest first
        this.list.sort((a, b) => {
            const da = new Date(a.orderDate || "1900-01-01");
            const db = new Date(b.orderDate || "1900-01-01");
            return db - da;
        });

        // ─────────────── Debug output ───────────────
        console.log(`Grouped ${this.list.length} unique orders`);
        if (this.list.length > 0) {
            console.log("First grouped order:", this.list[0]);
        } else {
            console.log("No orders grouped → check field names in order.json (ORDERNO/ORDERNOTXT/ORDERDATE/VENDOR)");
        }
    },

    async loadRecent(limit = 10) {
        if (this.list.length === 0) {
            await this.loadAndGroupAll();
        }
        this.recent = this.list.slice(0, limit);
        console.log(`Recent orders loaded: ${this.recent.length}`);
        return this.recent;
    },

    // ────────────────────────────────────────────────
    // UI / Page initialization
    // ────────────────────────────────────────────────

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
        } catch (err) {
            console.error("Failed to initialize recent orders:", err);
            container.innerHTML = '<p class="recent-error">Could not load recent orders. Check console.</p>';
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
            tr.addEventListener("click", () => {
                window.location = `order.html?order=${encodeURIComponent(o.orderNumber)}`;
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

    // ────────────────────────────────────────────────
    // Original methods (unchanged)
    // ────────────────────────────────────────────────

    async loadAll() {
        const response = await fetch("./data/order.json");
        this.list = await response.json();

        this.list.forEach(o => {
            o.orderNumber = nz(o.orderNumber, "string");
            o.vendor = nz(o.vendor, "string");
            o.orderDate = nz(o.orderDate, "date");
            o.paymentMethod = nz(o.paymentMethod, "string");
            o.shippingMethod = nz(o.shippingMethod, "string");
            o.trackingNumber = nz(o.trackingNumber, "string");
            o.orderType = nz(o.orderType, "string");
            o.createdAt = nz(o.createdAt, "number");
            o.items = nz(o.items, "array");
        });
    },

    async load(orderNumber) {
        const response = await fetch("./data/order.json");
        const allOrders = await response.json();
        const foundOrder = allOrders.find(o => o.orderNumber === orderNumber);

        if (foundOrder) {
            foundOrder.orderNumber = nz(foundOrder.orderNumber, "string");
            foundOrder.vendor = nz(foundOrder.vendor, "string");
            foundOrder.orderDate = nz(foundOrder.orderDate, "date");
            foundOrder.paymentMethod = nz(foundOrder.paymentMethod, "string");
            foundOrder.shippingMethod = nz(foundOrder.shippingMethod, "string");
            foundOrder.trackingNumber = nz(foundOrder.trackingNumber, "string");
            foundOrder.orderType = nz(foundOrder.orderType, "string");
            foundOrder.createdAt = nz(foundOrder.createdAt, "number");
            foundOrder.items = nz(foundOrder.items, "array");
        }

        return foundOrder;
    },

    createBlank() {
        return {
            orderNumber: "",
            vendor: "",
            orderDate: todayISO(),
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
        return this.list.reduce((latest, current) =>
            current.createdAt > latest.createdAt ? current : latest
        );
    },

    isClosed(order) {
        return order.items.length > 0 &&
            order.items.every(item => item.received >= item.qty);
    },

    getLockState(order) {
        return {
            editable: !this.isClosed(order)
        };
    }
};