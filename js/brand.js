document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("brandForm");
    const tbody = document.getElementById("brandTableBody");
    let brands = [];

    // Load from server first
    fetch("https://artsfirerva.com/grocerylist/json/brand.json")
        .then(response => response.json())
        .then(data => {
            brands = data;
            brands.forEach(addRow);
        })
        .catch(() => {
            brands = JSON.parse(localStorage.getItem("brands") || "[]");
            brands.forEach(addRow);
        });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const id = document.getElementById("brandId").value.trim();
        const name = document.getElementById("brandName").value.trim();

        if (!id || !name) {
            alert("Brand ID and Name are required.");
            return;
        }

        const brand = { id, name };
        brands.push(brand);
        addRow(brand);

        localStorage.setItem("brands", JSON.stringify(brands));

        fetch("https://artsfirerva.com/grocerylist/save_brand.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(brands)
        })
            .then(response => response.text())
            .then(data => console.log("Server response:", data))
            .catch(error => console.error("Sync error:", error));

        form.reset();
    });

    function addRow(brand) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${brand.id}</td>
      <td>${brand.name}</td>
    `;
        tbody.appendChild(row);
    }
});
