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
        .catch(error => {
            console.error("Failed to load brands:", error);
            alert("Brand fetch failed. Check console for details.");

            // Fallback quoted out for debugging clarity
            // brands = JSON.parse(localStorage.getItem("brands") || "[]");
            // brands.forEach(addRow);
        });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const nameInput = document.getElementById("brandName");
        const name = nameInput.value.trim();

        if (!name) {
            alert("Brand Name is required.");
            nameInput.focus();
            return;
        }

        const existingKeys = brands.map(b => b.id);
        const id = generateKey(name, existingKeys);

        if (!id) {
            alert("Failed to generate Brand ID.");
            return;
        }

        document.getElementById("brandId").value = id;

        const brand = { id, name };
        brands.push(brand);
        addRow(brand);

        // ...sync logic...
        form.reset();
    });




        // Fallback quoted out for debugging clarity
        // localStorage.setItem("brands", JSON.stringify(brands));

    localStorage.setItem("brands", JSON.stringify(brands));

    fetch("https://artsfirerva.com/grocerylist/php/save_brand.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brands)
    })
        .then(response => response.text())
        .then(data => {
            console.log("Server response:", data);
            alert("Brand saved to server.");
        })
        .catch(error => {
            console.error("Sync error:", error);
            alert("Brand save failed. Check console for details.");
        });

    form.reset();

    function generateKey(name, existingKeys) {
        const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!existingKeys.includes(base)) return base;

        let counter = 1;
        while (existingKeys.includes(`${base}_${counter}`)) {
            counter++;
        }
        return `${base}_${counter}`;
    }

function findOrCreateBrand(name, brands) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = brands.find(b => b.id === normalized);

    if (existing) return existing.id;

    const existingKeys = brands.map(b => b.id);
    const id = generateKey(name, existingKeys);
    const newBrand = { id, name };
    brands.push(newBrand);
    addRow(newBrand);

    // Optional sync
    fetch("https://artsfirerva.com/grocerylist/php/save_brand.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brands)
    });

    return id;
}

    function addRow(brand) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${brand.id}</td>
      <td>${brand.name}</td>
    `;
        tbody.appendChild(row);
    }
});
