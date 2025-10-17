document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("itemVendorForm");
    const itemSelect = document.getElementById("itemSku");
    const vendorSelect = document.getElementById("vendorId");
    const tbody = document.getElementById("itemVendorTableBody");
    let itemVendorLinks = [];
    let items = [];
    let vendors = [];

    // Hydrate item dropdown
    fetch("https://artsfirerva.com/grocerylist/json/item.json")
        .then(response => response.json())
        .then(data => {
            items = data;
            items.forEach(item => {
                const option = document.createElement("option");
                option.value = item.sku;
                option.textContent = `${item.sku} — ${item.itmname}`;
                itemSelect.appendChild(option);
            });
        });

    // Hydrate vendor dropdown
    fetch("https://artsfirerva.com/grocerylist/json/vendor.json")
        .then(response => response.json())
        .then(data => {
            vendors = data;
            vendors.forEach(vendor => {
                const option = document.createElement("option");
                option.value = vendor.id;
                option.textContent = `${vendor.id} — ${vendor.name}`;
                vendorSelect.appendChild(option);
            });
        });

    // Load existing links
    fetch("https://artsfirerva.com/grocerylist/json/itemvendor.json")
        .then(response => response.json())
        .then(data => {
            itemVendorLinks = data;
            itemVendorLinks.forEach(addRow);
        })
        .catch(() => {
            itemVendorLinks = JSON.parse(localStorage.getItem("itemvendor") || "[]");
            itemVendorLinks.forEach(addRow);
        });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const sku = itemSelect.value;
        const vendorId = vendorSelect.value;
        const leadtime = parseInt(document.getElementById("leadtime").value) || null;
        const lastPurchased = document.getElementById("lastPurchased").value;
        const unavailableSince = document.getElementById("unavailableSince").value;

        if (!sku || !vendorId) {
            alert("Both Item and Vendor must be selected.");
            return;
        }

        const link = { sku, vendorId, leadtime, lastPurchased, unavailableSince };
        itemVendorLinks.push(link);
        addRow(link);

        localStorage.setItem("itemvendor", JSON.stringify(itemVendorLinks));

        fetch("https://artsfirerva.com/grocerylist/save_itemvendor.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemVendorLinks)
        })
            .then(response => response.text())
            .then(data => console.log("Server response:", data))
            .catch(error => console.error("Sync error:", error));

        form.reset();
    });

    function addRow(link) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${link.sku}</td>
      <td>${link.vendorId}</td>
      <td>${link.leadtime ?? ""}</td>
      <td>${link.lastPurchased || ""}</td>
      <td>${link.unavailableSince || ""}</td>
    `;
        tbody.appendChild(row);
    }
});
