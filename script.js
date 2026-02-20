// ============================================
// JARGON DICTIONARY
// plain English translations of medical terms
// ============================================
const jargonMap = {
  "myalgia": "muscle pain",
  "nausea": "feeling sick",
  "dyspepsia": "indigestion",
  "pruritus": "itching",
  "erythema": "skin redness",
  "edema": "swelling",
  "tachycardia": "fast heartbeat",
  "hypotension": "low blood pressure",
  "hypertension": "high blood pressure",
  "somnolence": "drowsiness",
  "contraindicated": "should not be used",
  "hepatic": "liver-related",
  "renal": "kidney-related",
  "anaphylaxis": "severe allergic reaction",
  "thrombosis": "blood clot",
  "arrhythmia": "irregular heartbeat",
  "dyspnea": "difficulty breathing",
  "flatulence": "gas",
  "alopecia": "hair loss",
  "vertigo": "dizziness",
  "insomnia": "difficulty sleeping",
  "pyrexia": "fever",
  "arthralgia": "joint pain",
  "rhinitis": "runny nose",
  "urticaria": "hives",
  "xerostomia": "dry mouth",
  "epistaxis": "nosebleed",
  "syncope": "fainting",
  "palpitations": "irregular heartbeat sensation",
  "diarrhea": "loose stools",
  "constipation": "difficulty passing stools",
  "vomiting": "throwing up",
  "headache": "head pain",
  "fatigue": "tiredness",
  "dysphagia": "difficulty swallowing",
  "tinnitus": "ringing in ears",
  "paresthesia": "tingling or numbness",
  "diaphoresis": "excessive sweating",
  "bradycardia": "slow heartbeat"
};

function simplifyJargon(text) {
  if (!text || text === "Not available") return "Not available";
  let result = text;
  Object.entries(jargonMap).forEach(([medical, plain]) => {
    const regex = new RegExp(`\\b${medical}\\b`, "gi");
    result = result.replace(regex, `${medical} (${plain})`);
  });
  return result;
}

// ============================================
// SAFETY BADGE
// ============================================
function getSafetyBadge(data) {
  const text = (
    (data.warnings || "") + " " + (data.sideEffects || "")
  ).toLowerCase();

  if (
    text.includes("death") ||
    text.includes("fatal") ||
    text.includes("life-threatening") ||
    text.includes("serious") ||
    text.includes("severe")
  ) {
    return {
      label: "⚠️ Use With Caution",
      color: "#ef4444"
    };
  } else if (
    text.includes("consult") ||
    text.includes("avoid") ||
    text.includes("risk") ||
    text.includes("caution")
  ) {
    return {
      label: "🟡 Moderate Risk",
      color: "#f59e0b"
    };
  } else {
    return {
      label: "🟢 Generally Safe",
      color: "#10b981"
    };
  }
}

// ============================================
// RECENT SEARCHES
// ============================================
function saveToRecent(name) {
  let recent = JSON.parse(
    localStorage.getItem("recentMeds") || "[]"
  );
  recent = [
    name,
    ...recent.filter(n => n.toLowerCase() !== name.toLowerCase())
  ].slice(0, 5);
  localStorage.setItem("recentMeds", JSON.stringify(recent));
  displayRecent();
}

function displayRecent() {
  const recent = JSON.parse(
    localStorage.getItem("recentMeds") || "[]"
  );
  const container = document.getElementById("recentSearches");
  if (recent.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML =
    `<span class="recent-label">Recent:</span>` +
    recent
      .map(name => `<span onclick="quickSearch('${name}')">${name}</span>`)
      .join("");
}

function quickSearch(name) {
  document.getElementById("searchInput").value = name;
  handleSearch();
}

// ============================================
// API — FETCH MEDICINE DATA
// ============================================
async function fetchFromFDA(searchType, searchValue) {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.${searchType}:"${encodeURIComponent(searchValue)}"&limit=1`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.error || !data.results || data.results.length === 0) {
    return null;
  }
  return data.results[0];
}

async function searchMedicine(medicineName) {
  const name = medicineName.trim();

  // try brand name first
  let result = await fetchFromFDA("brand_name", name);

  // try generic name
  if (!result) {
    result = await fetchFromFDA("generic_name", name);
  }

  // try substance name
  if (!result) {
    result = await fetchFromFDA("substance_name", name);
  }

  if (!result) return null;
  return parseMedicineData(result);
}

// ============================================
// PARSE FDA RESPONSE
// ============================================
function parseMedicineData(result) {
  return {
    name:
      result.openfda?.brand_name?.[0] ||
      result.openfda?.generic_name?.[0] ||
      "Unknown Medicine",
    genericName:
      result.openfda?.generic_name?.[0] || "Not available",
    manufacturer:
      result.openfda?.manufacturer_name?.[0] || "Not available",
    purpose:
      result.indications_and_usage?.[0] ||
      result.purpose?.[0] ||
      "Not available",
    ingredients:
      result.active_ingredient?.[0] ||
      result.spl_product_data_elements?.[0] ||
      "Not available",
    sideEffects:
      result.adverse_reactions?.[0] ||
      result.side_effects?.[0] ||
      "Not available",
    warnings:
      result.boxed_warning?.[0] ||
      result.warnings?.[0] ||
      result.warnings_and_cautions?.[0] ||
      "Not available",
    interactions:
      result.drug_interactions?.[0] || "Not available",
    dosage:
      result.dosage_and_administration?.[0] || "Not available",
    whoShouldAvoid:
      result.contraindications?.[0] ||
      result.when_using?.[0] ||
      "Not available"
  };
}

// ============================================
// DISPLAY RESULTS ON PAGE
// ============================================
function displayResults(data) {

  // medicine header
  document.getElementById("medicineName").innerText = data.name;
  document.getElementById("genericName").innerText =
    `Generic Name: ${data.genericName}`;
  document.getElementById("manufacturer").innerText =
    `Manufacturer: ${data.manufacturer}`;

  // safety badge
  const badge = getSafetyBadge(data);
  const badgeEl = document.getElementById("safetyBadge");
  badgeEl.innerText = badge.label;
  badgeEl.style.background = badge.color + "18";
  badgeEl.style.color = badge.color;
  badgeEl.style.borderColor = badge.color;

  // cards
  document.getElementById("purpose").innerText =
    data.purpose;
  document.getElementById("ingredients").innerText =
    data.ingredients;
  document.getElementById("sideEffects").innerText =
    simplifyJargon(data.sideEffects);
  document.getElementById("warnings").innerText =
    simplifyJargon(data.warnings);
  document.getElementById("interactions").innerText =
    data.interactions;
  document.getElementById("dosage").innerText =
    data.dosage;
  document.getElementById("whoShouldAvoid").innerText =
    data.whoShouldAvoid;

  // show results section
  document.getElementById("results").classList.remove("hidden");

  // smooth scroll to results
  document.getElementById("results").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ============================================
// MAIN SEARCH HANDLER
// ============================================
async function handleSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const name = input.value.trim();

  // validate input
  if (!name) {
    alert("Please enter a medicine name");
    return;
  }

  // reset all sections
  document.getElementById("results").classList.add("hidden");
  document.getElementById("error").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");

  // disable button while searching
  btn.disabled = true;
  btn.innerText = "Searching...";

  try {
    const data = await searchMedicine(name);

    // hide loading
    document.getElementById("loading").classList.add("hidden");

    // re-enable button
    btn.disabled = false;
    btn.innerText = "Analyze";

    if (!data) {
      document.getElementById("error").classList.remove("hidden");
      return;
    }

    // display and save
    displayResults(data);
    saveToRecent(name);

  } catch (err) {
    // handle network errors
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("error").classList.remove("hidden");
    btn.disabled = false;
    btn.innerText = "Analyze";
    console.error("Search error:", err);
  }
}

// ============================================
// ENTER KEY SUPPORT
// ============================================
document.getElementById("searchInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") handleSearch();
  });

// ============================================
// ON PAGE LOAD
// ============================================
window.onload = function () {
  displayRecent();
};