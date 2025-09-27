// dataLoader.js

const DATA_PATH = './json/';

let itemMaster = [];
let itemVendor = [];
let paymentHistory = [];

async function loadJSON(filename) {
    const response = await fetch(`${DATA_PATH}${filename}`);
    if (!response.ok) throw new Error(`Failed to load ${filename}`);
    return await response.json();
}

async function loadAllData() {
    try {
        itemMaster = await loadJSON('itemmaster.json');
        itemVendor = await loadJSON('itemvendor.json');
        paymentHistory = await loadJSON('paymentHistory.json');
        console.log('Data loaded successfully');
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// Call this once during app initialization
loadAllData();
