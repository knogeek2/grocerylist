// ------------------------------------------------------------
// CSV → JSON Converter Tool
// This script powers the tools.html page.
// Features:
//   - Select CSV file from device (primary workflow)
//   - Convert CSV text to JSON
//   - Download JSON output
//   - Clear all fields (CSV, JSON, file input)
// Everything runs client-side.
// ------------------------------------------------------------


// ------------------------------------------------------------
// Convert CSV text into an array of JSON objects.
// Assumes simple CSV with a required header row.
// Every field is forced to a string for consistency.
// ------------------------------------------------------------
function csvToJson(csvText) {
    const lines = csvText.trim().split(/\r?\n/);

    // Require at least header + one row
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());

    const rows = lines.slice(1).map(line => {
        const cols = line.split(",");
        const obj = {};

        headers.forEach((h, i) => {
            const raw = cols[i] ?? "";
            obj[h] = String(raw).trim();
        });

        return obj;
    });

    return rows;
}


// ------------------------------------------------------------
// File picker handler
// Loads the selected CSV file into the CSV textarea.
// ------------------------------------------------------------
const fileInput = document.getElementById("csv-file");

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        document.getElementById("csv-input").value = e.target.result;
    };

    reader.readAsText(file);
});


// ------------------------------------------------------------
// Convert button handler
// Converts CSV text to JSON and displays it.
// ------------------------------------------------------------
document.getElementById("convert-btn").addEventListener("click", () => {
    const csv = document.getElementById("csv-input").value;
    const json = csvToJson(csv);

    document.getElementById("json-output").value =
        JSON.stringify(json, null, 2);
});


// ------------------------------------------------------------
// Download button handler
// Creates a JSON file and triggers a download.
// ------------------------------------------------------------
document.getElementById("download-btn").addEventListener("click", () => {
    const json = document.getElementById("json-output").value;

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
    a.click();

    URL.revokeObjectURL(url);
});


// ------------------------------------------------------------
// Clear button handler
// Resets:
//   - CSV textarea
//   - JSON textarea
//   - File input (so filename disappears)
// ------------------------------------------------------------
document.getElementById("clear-btn").addEventListener("click", () => {
    document.getElementById("csv-input").value = "";
    document.getElementById("json-output").value = "";

    const fileInput = document.getElementById("csv-file");
    fileInput.value = "";   // This clears the chosen file name
});

