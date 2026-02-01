// js/item.js — Renders items stored in item.json

export async function loadItems() {
    const response = await fetch('./data/item.json');
    const items = await response.json();
    return items;
}

export function renderItems(items, tbody) {
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');

        function cell(value) {
            const td = document.createElement('td');
            td.textContent = value ?? '';
            return td;
        }

        tr.appendChild(cell(item.SKU));
        tr.appendChild(cell(item.ITMNAME));
        tr.appendChild(cell(item.DESCRIPTION));
        tr.appendChild(cell(item.BRAND));
        tr.appendChild(cell(item.VELOCITY));
        tr.appendChild(cell(item.FIRSTAVAILABLE));
        tr.appendChild(cell(item.OBSOLETE));
        tr.appendChild(cell(item.DG));
        tr.appendChild(cell(item.SNAPYES));
        tr.appendChild(cell(item.SHIPWEIGHT));

        tbody.appendChild(tr);
    });
}
