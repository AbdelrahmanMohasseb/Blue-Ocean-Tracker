const BASE_URL = "http://localhost:5000/api"; // change if needed
const form = document.getElementById("shipmentForm");
const formTitle = document.getElementById("formTitle");

const urlParams = new URLSearchParams(window.location.search);
const shipmentId = urlParams.get("id");

// ✅ Get token from localStorage
const token = localStorage.getItem("token");

// --- 1. Set form title and load data only if ID exists ---
if (shipmentId) {
  formTitle.textContent = "Edit Shipment";
  loadShipmentData(shipmentId);
} else {
  formTitle.textContent = "Add Shipment";
}

// --- 2. Function to load existing shipment data ---
async function loadShipmentData(id) {
  try {
    const res = await fetch(`${BASE_URL}/shipments/${id}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error("Failed to fetch shipment");
    const result = await res.json();
    const s = result.shipment || result; // support both shapes

    Object.keys(s).forEach(key => {
      const el = document.getElementById(key);
      if (el) {
        let value = s[key] ?? "";

        // ✅ If the element is a date input and the value is a valid date
        if (el.type === "date" && value) {
          value = new Date(value).toISOString().split("T")[0]; // format YYYY-MM-DD
        }

        el.value = value;
      }
    });
  } catch (err) {
    console.error(err);
    alert("Failed to load shipment data");
  }
}

// --- 3. Handle form submit ---
form.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {};
  [...form.elements].forEach(el => {
    if (el.id) data[el.id] = el.value;
  });
  // ✅ Fix date values before sending
  const dateFields = [
    "eta", "ata", "collectedDO", "documentsUploaded", "receivedDocument",
    "customsRegistering", "form4Issued", "releaseDate", "lastUpdate"
  ];

  dateFields.forEach(field => {
    if (!data[field]) {
      data[field] = null; // empty -> null
    } else {
      // Convert to ISO string (safe for Sequelize + MSSQL)
      const parsed = new Date(data[field]);
      data[field] = isNaN(parsed) ? null : parsed.toISOString();
    }
  });
  console.log(data);
  try {
    let res;

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    };

    // ✅ Automatically decide based on shipmentId presence
    if (shipmentId && shipmentId.trim() !== "") {
      // Update existing shipment
      res = await fetch(`${BASE_URL}/shipments/${shipmentId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
      });
    } else {
      // Create new shipment
      res = await fetch(`${BASE_URL}/shipments`, {
        method: "POST",
        headers,
        body: JSON.stringify(data)
      });
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Save failed");
    }

    // ✅ Redirect after success
    window.location.href = "dashboard.html";
  } catch (err) {
    alert(`Save failed: ${err.message}`);
  }
});

const fileInput = document.getElementById("fileInput");

// Handle file upload and parse
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileType = file.name.split('.').pop().toLowerCase();

  if (fileType === "csv" || fileType === "xlsx" || fileType === "xls") {
    parseExcelOrCSV(file);
  } else if (fileType === "pdf") {
    alert("📄 PDF reading will be enabled next — please upload CSV/Excel for now.");
  } else if (fileType === "docx") {
    alert("📝 DOCX reading will be enabled next — please upload CSV/Excel for now.");
  } else {
    alert("Unsupported file type!");
  }
});

// js/shipment-form.js
// Requires: XLSX (SheetJS), pdfjsLib, mammoth (see HTML includes above)

(function () {
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("shipmentForm");

  if (!fileInput || !form) {
    console.warn("fileInput or shipmentForm not found");
    return;
  }

  // --- helper utilities ---------------------------------------------------
  const normalize = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // map of canonical input IDs in your form for quick matching by normalized name
  const formInputs = (() => {
    const map = {};
    [...form.elements].forEach(el => {
      if (!el.id) return;
      map[normalize(el.id)] = el;
    });
    return map;
  })();

  // known fields and common label variants — used for PDF/DOCX free-text parsing
  const KNOWN_FIELDS = {
    universalId: ["universal id", "universalid", "universal_id", "uid", "id"],
    customerName: ["customer", "customer name", "consignee", "shipper"],
    supplier: ["supplier", "vendor"],
    commodityType: ["commodity", "commodity type", "goods"],
    representativeName: ["representative", "representative name", "agent"],
    operNum: ["oper", "oper num", "operation number", "oper #", "operation no"],
    acid: ["acid"],
    mbl: ["mbl", "master bl", "master bill", "masterbl"],
    bl: ["bl", "bill of lading", "bl no", "bl number"],
    blType: ["bl type", "bill type"],
    shippingLine: ["shipping line", "line"],
    containersPackages: ["containers", "containers/packages", "packages", "container"],
    pod: ["pod", "port of discharge"],
    eta: ["eta", "etd", "estimated time of arrival"],
    ata: ["ata", "actual time of arrival"],
    collectedDO: ["collected do", "collected do date", "do collected"],
    documentsUploaded: ["documents uploaded", "docs uploaded", "documentsuploaded"],
    receivedDocument: ["received document", "received docs"],
    declarationNo: ["declaration no", "declaration", "declaration number"],
    customsRegistering: ["customs registering", "customs register", "customs registering date"],
    form4Issued: ["form 4", "form4", "form 4 issued"],
    releaseDate: ["release date", "releasedate"],
    status: ["status"],
    lastUpdate: ["last update", "lastupdated", "updated"],
    remarks: ["remarks", "note", "notes"],
    archive: ["archive"]
  };

  const ALL_FIELD_IDS = Object.keys(KNOWN_FIELDS);

  // convert date-like strings into yyyy-mm-dd (for date inputs)
  function toDateInputValue(value) {
    if (!value) return "";
    // try native Date parse
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      // return local yyyy-mm-dd
      const year = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
    // fallback: try common format dd/mm/yyyy or dd-mm-yyyy
    const m1 = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m1) {
      let day = m1[1].padStart(2, "0");
      let mon = m1[2].padStart(2, "0");
      let year = m1[3];
      if (year.length === 2) year = '20' + year;
      return `${year}-${mon}-${day}`;
    }
    return ""; // unknown -> empty to avoid invalid SQL conversion
  }

  // try to fill form inputs from a key/value object
  function autofillFromObject(obj) {
    // create mapping of normalized keys from object
    const normalizedObj = {};
    Object.keys(obj).forEach(k => normalizedObj[normalize(k)] = obj[k]);

    // try exact matches first: key names similar to input IDs
    Object.keys(formInputs).forEach(nid => {
      if (normalizedObj[nid] !== undefined) {
        setInputValue(formInputs[nid], normalizedObj[nid]);
      }
    });

    // second pass: match by known field variants (for CSV headers or doc text)
    ALL_FIELD_IDS.forEach(fieldId => {
      if (formInputs[normalize(fieldId)]) {
        const variants = KNOWN_FIELDS[fieldId];
        for (const v of variants) {
          const nn = normalize(v);
          if (normalizedObj[nn] !== undefined) {
            setInputValue(formInputs[normalize(fieldId)], normalizedObj[nn]);
            break;
          }
        }
      }
    });

    // third pass: try fuzzy: if header contains part of input id
    Object.keys(normalizedObj).forEach(nk => {
      for (const inputKey of Object.keys(formInputs)) {
        if (!formInputs[inputKey].value && (inputKey.includes(nk) || nk.includes(inputKey))) {
          setInputValue(formInputs[inputKey], normalizedObj[nk]);
        }
      }
    });
  }

  function setInputValue(el, value) {
    if (!el) return;
    if (el.tagName === "TEXTAREA") {
      el.value = value ?? "";
      return;
    }
    if (el.type === "date") {
      el.value = toDateInputValue(value) ?? "";
      return;
    }
    el.value = value ?? "";
  }

  // parse CSV/XLSX using SheetJS
  async function parseExcelOrCSV(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" }); // array of rows (objects)
      if (!json || json.length === 0) {
        alert("No rows found in the uploaded spreadsheet.");
        return;
      }

      if (json.length === 1) {
        autofillFromObject(json[0]);
        alert("Imported row 1 into form.");
        return;
      }

      // multiple rows: prefer exact header match to form ids, otherwise take first row
      // Attempt to find a row where at least one primary field exists
      let best = json[0];
      const primaryKeys = ["universalid", "customername", "universal_id", "uid"];
      for (const row of json) {
        const normalizedRowKeys = Object.keys(row).map(k => normalize(k));
        if (primaryKeys.some(pk => normalizedRowKeys.includes(pk))) {
          best = row;
          break;
        }
      }

      autofillFromObject(best);
      alert(`Imported first matching row into form (found ${json.length} rows).`);
    } catch (err) {
      console.error(err);
      alert("Failed to parse spreadsheet: " + (err.message || err));
    }
  }

  // parse PDF using pdf.js and extract text
  async function parsePdf(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(it => it.str);
        fullText += strings.join(" ") + "\n";
      }
      const parsed = parseKeyValueText(fullText);
      if (Object.keys(parsed).length === 0) {
        alert("Could not detect structured fields in PDF. Try CSV/XLSX or simpler PDF layout.");
      } else {
        autofillFromObject(parsed);
        alert("PDF parsed and form filled where possible.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse PDF: " + (err.message || err));
    }
  }

  // parse DOCX using mammoth -> convert to plain text then parse
  async function parseDocx(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value; // HTML string
      // strip tags to get plain text
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const text = tmp.innerText || tmp.textContent || "";
      const parsed = parseKeyValueText(text);
      if (Object.keys(parsed).length === 0) {
        alert("Could not detect structured fields in DOCX. Try CSV/XLSX or ensure document uses 'Field: Value' format.");
      } else {
        autofillFromObject(parsed);
        alert("DOCX parsed and form filled where possible.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse DOCX: " + (err.message || err));
    }
  }

  // parse a plain text blob (lines) to extract key: value pairs using known labels
  function parseKeyValueText(text) {
    const lines = (text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const found = {};

    // first pass: look for "Label: value" or "Label - value" or "Label\tvalue"
    lines.forEach(line => {
      const parts = line.split(/[:\-\t]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const keyCandidate = normalize(parts[0]);
        const valCandidate = parts.slice(1).join(':').trim();
        // check against known fields labels
        for (const fid of ALL_FIELD_IDS) {
          const variants = KNOWN_FIELDS[fid];
          if (variants.some(v => normalize(v) === keyCandidate || normalize(v).includes(keyCandidate) || keyCandidate.includes(normalize(v)))) {
            found[fid] = valCandidate;
          }
        }
      }
    });

    // second pass: try searching whole text for "label value" patterns using regex
    const lowerText = text.toLowerCase();
    for (const fid of ALL_FIELD_IDS) {
      if (found[fid]) continue;
      for (const label of KNOWN_FIELDS[fid]) {
        const re = new RegExp(label.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\s*[:\\-]?\\s*([^\\n\\r]{1,200})", "i");
        const m = lowerText.match(re);
        if (m && m[1]) {
          found[fid] = m[1].trim();
          break;
        }
      }
    }

    return found;
  }

  // file input handler
  fileInput.addEventListener("change", async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;

    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (["xlsx", "xls", "csv"].includes(ext)) {
      await parseExcelOrCSV(f);
    } else if (ext === "pdf") {
      await parsePdf(f);
    } else if (ext === "docx") {
      await parseDocx(f);
    } else {
      alert("Unsupported file type. Supported: CSV, XLSX, XLS, PDF, DOCX.");
    }
    // reset input so same file can be re-uploaded if needed
    fileInput.value = "";
  });

  // Also expose a small debug helper if you want to call from console
  window.__shipmentFileHelpers = {
    autofillFromObject, parseExcelOrCSV, parsePdf, parseDocx, parseKeyValueText
  };
})();
