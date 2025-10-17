document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("vendorForm");
    const tbody = document.getElementById("vendorTableBody");
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

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const id = document.getElementById("vendorId").value.trim();
        const name = document.getElementById("vendorName").value.trim();
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
    });

    function addRow(vendor) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${vendor.id}</td>
      <td>${vendor.name}</td>
      <td>${vendor.city}</td>
      <td>${vendor.state}</td>
      <td>${vendor.postal}</td>
      <td>${vendor.active ? "Yes" : "No"}</td>
    `;
        tbody.appendChild(row);
    }
});
