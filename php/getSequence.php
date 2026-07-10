async function getNextOrderNumber() {
    try {
        const response = await fetch("php/incrementSequence.php");
        const data = await response.json();

        if (data.success) {
            return data.nextOrderNumber;
        } else {
            throw new Error("Sequence increment failed");
        }
    } catch (e) {
        console.error("Sequence increment failed", e);
        return Date.now(); // fallback
    }
}