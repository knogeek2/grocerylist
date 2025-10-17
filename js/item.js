document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("itemForm");
    const tbody = document.getElementById("itemTableBody");
    const brandSelect = document.getElementById("brand");
    let items = [];

    // Hydrate brand dropdown
    fetch("https://artsfirerva.com/grocerylist/json/brand.json")
        .then(response => response.json())
        .then(brands => {
            brands.forEach(b => {
                const option = document.createElement("option");
                option.value = b.id;
                option.textContent = b.name;
                brandSelect.appendChild(option);
            });
        });

    // Load items from server
    fetch("https://artsfirerva.com/grocerylist/json/item.json")
        .then(response => response.json())
        .then(data => {
            items = data;
            items.forEach(addRow);
        })
        .catch(() => {
            items = JSON.parse(localStorage.getItem("items") || "[]");
            items.forEach(addRow);
        });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const sku = document.getElementById("sku").value.trim();
        const upc = document.getElementById("upc").value.trim();
        const itmname = document.getElementById("itmname").value.trim();
        const description = document.getElementById("description").value.trim();
        const brand = document.getElementById("brand").value;
        const velocity = parseInt(document.getElementById("velocity").value) || null;
        const firstavailable = document.getElementById("firstavailable").value;
        const delisted = document.getElementById("delisted").value;
        const snapyes = document.getElementById("snapyes").value === "true";

        if (!sku || !itmname) {
            alert("SKU and Item Name are required.");
            return;
        }

        const item = { sku, upc, itmname, description, brand, velocity, firstavailable, delisted, snapyes };
        items.push(item);
        addRow(item);

        localStorage.setItem("items", JSON.stringify(items));

        fetch("https://artsfirerva.com/grocerylist/save_item.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(items)
        })
            .then(response => response.text())
            .then(data => console.log("Server response:", data))
            .catch(error => console.error("Sync error:", error));

        form.reset();
    });

    function addRow(item) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.itmname}</td>
      <td>${item.brand}</td>
      <td>${item.velocity ?? ""}</td>
      <td>${item.firstavailable || ""}</td>
      <td>${item.delisted || ""}</td>
      <td>${item.snapyes ? "Yes" : "No"}</td>
    `;
        tbody.appendChild(row);
    }
});
