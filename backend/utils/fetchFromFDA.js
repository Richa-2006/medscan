const axios = require("axios");

async function fetchFromFDA(searchType, name) {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.${searchType}:"${encodeURIComponent(name)}"&limit=1`;
    const response = await axios.get(url, { timeout: 8000 });
    return response.data.results?.[0] || null;
  } catch {
    return null;
  }
}

module.exports = fetchFromFDA;