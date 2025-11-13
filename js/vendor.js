// vendor.js

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("vendorForm");
    const tbody = document.getElementById("vendorTableBody");
    const vendorNameInput = document.getElementById("vendorName");
    const vendorIdField = document.getElementById("vendorId");
    let vendors = [];

    // Load from server first
    fetch("https://artsfirerva.com/grocerylist/json/vendor.json")
        .then(response => response.json())
        .then(data => {
            vendors = data;
            vendors.forEach(addRow);
        })
        .catch(() => {
            vendors = JSON.parse(localStorage.getItem("vendors") || "[]");
            vendors.forEach(addRow);
        });

    // Generate VendorID (base name + timestamp fallback)
    function generateKey(name, existingKeys) {
        let base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 25);

        if (!existingKeys.includes(base)) return base;

        // Collision: append timestamp
        let candidate = `${base}-${Date.now()}`;
        while (existingKeys.includes(candidate)) {
            candidate = `${base}-${Date.now()}`;
        }
        return candidate;
    }

    // Live VendorID preview
    vendorNameInput.addEventListener("input", () => {
        const name = vendorNameInput.value.trim();
        if (name) {
            const existingKeys = vendors.map(v => v.id.toLowerCase());
            vendorIdField.value = generateKey(name, existingKeys);
        } else {
            vendorIdField.value = "";
        }
    });

    // Handle form submit
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = vendorNameInput.value.trim();
        const existingKeys = vendors.map(v => v.id.toLowerCase());
        const id = generateKey(name, existingKeys);
        vendorIdField.value = id;

        const address = document.getElementById("vendorAddress").value.trim();
        const city = document.getElementById("vendorCity").value.trim();
        const state = document.getElementById("vendorState").value.trim();
        const postal = document.getElementById("vendorPostal").value.trim();
        const active = document.getElementById("vendorActive").value === "true";

        if (!id || !name) {
            alert("Vendor ID and Name are required.");
            return;
        }

        const vendor = { id, name, address, city, state, postal, active };
        vendors.push(vendor);
        addRow(vendor);

        localStorage.setItem("vendors", JSON.stringify(vendors));

        fetch("https://artsfirerva.com/grocerylist/save_vendor.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vendors)
        })
            .then(response => response.text())
            .then(data => console.log("Server response:", data))
            .catch(error => console.error("Sync error:", error));

        form.reset();
        vendorIdField.value = "";
    });

    // Add row to table
    function addRow(vendor) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${vendor.id}</td>
      <td>${vendor.name}</td>
      <td>${vendor.city || ""}</td>
      <td>${vendor.state || ""}</td>
      <td>${vendor.postal || ""}</td>
      <td>${vendor.active ? "Yes" : "No"}</td>
    `;
        tbody.appendChild(row);
    }
});
