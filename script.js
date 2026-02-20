function scanMedicine() {
    const input = document.getElementById("medicineInput").value.toLowerCase();
    const loading = document.getElementById("loading");
    const result = document.getElementById("result");

    const mockDatabase = {
        paracetamol: {
            description: "A pain reliever and fever reducer.",
            warnings: "Do not exceed recommended dosage.",
            interactions: "Avoid alcohol while taking.",
            allergy: "Contains acetaminophen."
        },
        ibuprofen: {
            description: "Reduces inflammation and pain.",
            warnings: "May cause stomach irritation.",
            interactions: "Avoid with blood thinners.",
            allergy: "Avoid if allergic to NSAIDs."
        }
    };

    result.classList.add("hidden");
    loading.classList.remove("hidden");

    setTimeout(() => {
        loading.classList.add("hidden");

        if (mockDatabase[input]) {
            document.getElementById("description").innerText = mockDatabase[input].description;
            document.getElementById("warnings").innerText = mockDatabase[input].warnings;
            document.getElementById("interactions").innerText = mockDatabase[input].interactions;
            document.getElementById("allergy").innerText = mockDatabase[input].allergy;

            result.classList.remove("hidden");
        } else {
            alert("Medicine not found in demo database.");
        }
    }, 1500);
}