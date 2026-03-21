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
            const key = row.orderNo || row.orderNumber || "";
            if (!key) return;

            if (!map.has(key)) {
                map.set(key, {
                    orderNumber: key,
                    vendor: row.vendor ?? "",
                    orderDate: row.orderDate ?? "",
                    vendorOrderNo: row.vendorOrderNo ?? "",
                    paymentMethod: row.paymentMethod ?? "",
                    shippingMethod: row.shippingMethod ?? "",
                    trackingNumber: row.trackingNumber ?? "",
                    items: []
                });
            }

            const ord = map.get(key);

            ord.items.push({
                sku: row.sku ?? "",
                description: row.description || row.itemDesc || "",
                qty: Number(row.qty ?? 0),
                price: Number(row.price ?? 0),
                received: row.received ?? ""
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
        const response = await fetch("data/order.json");
        if (!response.ok) throw new Error("Failed to fetch order.json");

        const allRows = await response.json();

        const itemsForOrder = allRows.filter(r =>
            (r.orderNo || r.orderNumber || "") === orderNumber
        );

        if (itemsForOrder.length === 0) return null;

        const first = itemsForOrder[0];

        return {
            orderNumber: first.orderNo || first.orderNumber || "",
            vendor: first.vendor ?? "",
            orderDate: first.orderDate ?? "",
            vendorOrderNo: first.vendorOrderNo ?? "",
            paymentMethod: first.paymentMethod ?? "",
            shippingMethod: first.shippingMethod ?? "",
            trackingNumber: first.trackingNumber ?? "",
            items: itemsForOrder.map(row => ({
                sku: row.sku ?? "",
                description: row.description || row.itemDesc || "",
                qty: Number(row.qty ?? 0),
                price: Number(row.price ?? 0),
                received: row.received ?? ""
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
        this.populateTotals?.(selected); // optional if you add totals later

        return true;
    },

    populateHeader(order) {
        const mappings = {
            "orderNumber": order.orderNumber || "",
            "vendor": order.vendor || "",
            "vendorOrderNumber": order.vendorOrderNo || "",
            "orderDate": order.orderDate || "",
            "paymentMethod": order.paymentMethod || "",
            "shippingMethod": order.shippingMethod || "",
            "trackingNumber": order.trackingNumber || "",
            "orderType": order.orderType || "Order"
        };

        Object.entries(mappings).forEach(([name, value]) => {
            const input = document.querySelector(`[name="${name}"]`);
            if (input) input.value = value ?? "";
        });
    },

    populateItems(items) {
        const container = document.getElementById("order-items-container");
        if (!container) {
            console.warn("Items container not found");
            return;
        }

        container.innerHTML = "";

        if (!Array.isArray(items) || items.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.className = "item-row empty-message";
            emptyMsg.textContent = "No items in this order.";
            container.appendChild(emptyMsg);
            return;
        }

        items.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "item-row";
            row.dataset.itemIndex = index;

            const descInput = document.createElement("input");
            descInput.type = "text";
            descInput.value = item.description || "";
            descInput.placeholder = "Description";
            descInput.name = `item-description-${index}`;

            const qtyInput = document.createElement("input");
            qtyInput.type = "number";
            qtyInput.value = Number(item.qty) || 1;
            qtyInput.step = "0.01";
            qtyInput.min = "0";
            qtyInput.placeholder = "Qty";
            qtyInput.name = `item-qty-${index}`;

            const priceInput = document.createElement("input");
            priceInput.type = "number";
            priceInput.value = Number(item.price) || 0;
            priceInput.step = "0.01";
            priceInput.min = "0";
            priceInput.placeholder = "Price";
            priceInput.name = `item-price-${index}`;

            const receivedInput = document.createElement("input");
            receivedInput.type = "text";
            receivedInput.value = item.received || "";
            receivedInput.placeholder = "Received";
            receivedInput.name = `item-received-${index}`;

            row.appendChild(descInput);
            row.appendChild(qtyInput);
            row.appendChild(priceInput);
            row.appendChild(receivedInput);

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
        return
    }
}