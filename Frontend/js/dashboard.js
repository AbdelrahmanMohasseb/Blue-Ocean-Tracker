const BASE_URL = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}
function showAlert(msg, type = "danger", timeout = 5000) {
  const box = document.getElementById("alertBox");
  box.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
    ${msg}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
  if (timeout) setTimeout(() => { box.innerHTML = ""; }, timeout);
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString();
}
function statusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("pending")) return `<span class="badge bg-secondary">${status}</span>`;
  if (s.includes("in-transit") || s.includes("transit") || s.includes("in transit")) return `<span class="badge bg-info text-dark">${status}</span>`;
  if (s.includes("arrived")) return `<span class="badge bg-primary">${status}</span>`;
  if (s.includes("cleared")) return `<span class="badge bg-success">${status}</span>`;
  if (s.includes("delivered")) return `<span class="badge bg-success">${status}</span>`;
  if (s.includes("archived")) return `<span class="badge bg-dark">${status}</span>`;
  return `<span class="badge bg-light text-dark">${status}</span>`;
}


async function fetchAllShipments() {
  const token = getToken();
  if (!token) { window.location.href = "index.html"; return; }

  try {
    const res = await fetch(`${BASE_URL}/shipments`, {
      method: "GET",
      headers: { "Accept": "application/json", "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch shipments (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    throw err;
  }
}

async function fetchShipmentById(id) {
  const token = getToken();
  try {
    const res = await fetch(`${BASE_URL}/shipments/${id}`, {
      method: "GET",
      headers: { "Accept": "application/json", "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Failed to fetch shipment");
    }
    return await res.json();
  } catch (err) { throw err; }
}

async function searchByUniversalId(uid) {
  const token = getToken();
  try {
    const res = await fetch(`${BASE_URL}/shipments/search/by-uid?uid=${encodeURIComponent(uid)}`, {
      method: "GET",
      headers: { "Accept": "application/json", "Authorization": "Bearer " + token }
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Search failed");
    }
    return await res.json();
  } catch (err) { throw err; }
}

async function archiveShipment(id) {
  const token = getToken();
  try {
    const res = await fetch(`${BASE_URL}/shipments/${id}`, {
      method: "Put",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ archive: true })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Archive failed");
    }
    return await res.json();
  } catch (err) { throw err; }
}



function renderShipmentsTable(list) {
  const tbody = document.getElementById("shipmentsTbody");
  tbody.innerHTML = "";
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="27" class="text-center text-muted">No shipments found</td></tr>`;
    document.getElementById("statsRow").style.display = "none";
    return;
  }

  document.getElementById("statsRow").style.display = "flex";
  document.getElementById("statTotal").textContent = list.length;
  document.getElementById("statInTransit").textContent = list.filter(s => (s.status || "").toLowerCase().includes("transit")).length;
  document.getElementById("statDelivered").textContent = list.filter(s => (s.status || "").toLowerCase().includes("delivered")).length;

  for (const s of list) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(s.universalId || "")}</td>
      <td>${escapeHtml(s.customerName || "")}</td>
      <td>${escapeHtml(s.supplier || "")}</td>
      <td>${escapeHtml(s.commodityType || "")}</td>
      <td>${escapeHtml(s.representativeName || "")}</td>
      <td>${escapeHtml(s.operNum || "")}</td>
      <td>${escapeHtml(s.acid || "")}</td>
      <td>${escapeHtml(s.mbl || "")}</td>
      <td>${escapeHtml(s.bl || "")}</td>
      <td>${escapeHtml(s.blType || "")}</td>
      <td>${escapeHtml(s.shippingLine || "")}</td>
      <td>${escapeHtml(s.containersPackages || "")}</td>
      <td>${escapeHtml(s.pod || "")}</td>
      <td>${formatDate(s.eta)}</td>
      <td>${formatDate(s.ata)}</td>
      <td>${formatDate(s.collectedDO || "")}</td>
      <td>${formatDate(s.documentsUploaded || "")}</td>
      <td>${formatDate(s.receivedDocument || "")}</td>
      <td>${escapeHtml(s.declarationNo || "")}</td>
      <td>${formatDate(s.customsRegistering || "")}</td>
      <td>${formatDate(s.form4Issued || "")}</td>
      <td>${formatDate(s.releaseDate)}</td>
      <td>${statusBadge(s.status || "")}</td>
      <td>${formatDate(s.lastUpdate)}</td>
      <td>${escapeHtml(s.remarks || "")}</td>
      <td>${escapeHtml(s.archive || "")}</td>
      <td>
  <div class="d-flex gap-1 justify-content-center">
    <button class="btn btn-sm btn-outline-primary btn-view" data-id="${s.id}">View</button>
    <a class="btn btn-sm btn-warning" href="shipment-form.html?id=${s.id}">Edit</a>
    <button class="btn btn-sm btn-outline-danger btn-archive" data-id="${s.id}">Archive</button>
    <button class="btn btn-sm btn-danger btn-delete" data-id="${s.id}">Delete</button>
  </div>
</td>

    `;
    tbody.appendChild(tr);
  }


  tbody.querySelectorAll(".btn-view").forEach(b => b.addEventListener("click", onViewClicked));
  tbody.querySelectorAll(".btn-archive").forEach(b => b.addEventListener("click", onArchiveClicked));
  tbody.querySelectorAll(".btn-delete").forEach(b => b.addEventListener("click", onDeleteClicked));
}

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function loadAndRenderAll() {
  try {
    showAlert("Loading shipments...", "info", 2000);
    const list = await fetchAllShipments();
    renderShipmentsTable(list);
  } catch (err) {
    showAlert(err.message || "Failed to load shipments");
  }
}

async function onSearchClicked() {
  const uid = document.getElementById("uidInput").value.trim();
  if (!uid) {
    return loadAndRenderAll();
  }
  try {
    showAlert("Searching...", "info", 2000);
    const res = await searchByUniversalId(uid);
    if (!res) {
      renderShipmentsTable([]);
      showAlert("No shipment found with that Universal ID", "warning", 3000);
      return;
    }
    renderShipmentsTable([res]);
  } catch (err) {
    showAlert(err.message || "Search failed");
  }
}

function onSearchClear() {
  document.getElementById("uidInput").value = "";
  loadAndRenderAll();
}

async function onViewClicked(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const res = await fetchShipmentById(id);
    const body = document.getElementById("viewModalBody");

    body.innerHTML = `
      <dl class="row">
        <dt class="col-sm-4">Universal ID</dt><dd class="col-sm-8">${escapeHtml(res.universalId || '')}</dd>
        <dt class="col-sm-4">Customer</dt><dd class="col-sm-8">${escapeHtml(res.customerName || '')}</dd>
        <dt class="col-sm-4">Supplier</dt><dd class="col-sm-8">${escapeHtml(res.supplier || '')}</dd>
        <dt class="col-sm-4">Commodity Type</dt><dd class="col-sm-8">${escapeHtml(res.commodityType || '')}</dd>
        <dt class="col-sm-4">Representative</dt><dd class="col-sm-8">${escapeHtml(res.representativeName || '')}</dd>
        <dt class="col-sm-4">OperNum</dt><dd class="col-sm-8">${escapeHtml(res.operNum || '')}</dd>
        <dt class="col-sm-4">ACID</dt><dd class="col-sm-8">${escapeHtml(res.acid || '')}</dd>
        <dt class="col-sm-4">MBL</dt><dd class="col-sm-8">${escapeHtml(res.mbl || '')}</dd>
        <dt class="col-sm-4">BL</dt><dd class="col-sm-8">${escapeHtml(res.bl || '')}</dd>
        <dt class="col-sm-4">BL Type</dt><dd class="col-sm-8">${escapeHtml(res.blType || '')}</dd>
        <dt class="col-sm-4">Shipping Line</dt><dd class="col-sm-8">${escapeHtml(res.shippingLine || '')}</dd>
        <dt class="col-sm-4">Containers/Packages</dt><dd class="col-sm-8">${escapeHtml(res.containersPackages || '')}</dd>
        <dt class="col-sm-4">POD</dt><dd class="col-sm-8">${escapeHtml(res.pod || '')}</dd>
        <dt class="col-sm-4">ETA</dt><dd class="col-sm-8">${formatDate(res.eta)}</dd>
        <dt class="col-sm-4">ATA</dt><dd class="col-sm-8">${formatDate(res.ata)}</dd>
        <dt class="col-sm-4">Collected DO</dt><dd class="col-sm-8">${escapeHtml(res.collectedDO || '')}</dd>
        <dt class="col-sm-4">Documents Uploaded</dt><dd class="col-sm-8">${escapeHtml(res.documentsUploaded || '')}</dd>
        <dt class="col-sm-4">Received Document</dt><dd class="col-sm-8">${escapeHtml(res.receivedDocument || '')}</dd>
        <dt class="col-sm-4">Declaration No</dt><dd class="col-sm-8">${escapeHtml(res.declarationNo || '')}</dd>
        <dt class="col-sm-4">Customs Registering</dt><dd class="col-sm-8">${escapeHtml(res.customsRegistering || '')}</dd>
        <dt class="col-sm-4">Form 4 Issued</dt><dd class="col-sm-8">${escapeHtml(res.form4Issued || '')}</dd>
        <dt class="col-sm-4">Release Date</dt><dd class="col-sm-8">${formatDate(res.releaseDate)}</dd>
        <dt class="col-sm-4">Status</dt><dd class="col-sm-8">${escapeHtml(res.status || '')}</dd>
        <dt class="col-sm-4">Last Update</dt><dd class="col-sm-8">${formatDate(res.lastUpdate)}</dd>
        <dt class="col-sm-4">Remarks</dt><dd class="col-sm-8">${escapeHtml(res.remarks || '')}</dd>
        <dt class="col-sm-4">Archive</dt><dd class="col-sm-8">${escapeHtml(res.archive || '')}</dd>
      </dl>
    `;

    const modal = new bootstrap.Modal(document.getElementById("viewModal"));
    modal.show();
  } catch (err) {
    showAlert(err.message || "Failed to load shipment details");
  }
}


async function onArchiveClicked(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Archive this shipment?")) return;
  try {
    console.log("Archiving shipment ID:", id);
    
    await archiveShipment(id);
    showAlert("Shipment archived", "success", 2000);
    loadAndRenderAll();
  } catch (err) {
    showAlert(err.message || "Failed to archive");
  }
}
async function deleteShipment(id) {
  const token = getToken();
  try {
    const res = await fetch(`${BASE_URL}/shipments/${id}`, {
      method: "DELETE",
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + token
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Delete failed");
    }
    return await res.json();
  } catch (err) { throw err; }
}

async function onDeleteClicked(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Are you sure you want to delete this shipment?")) return;
  try {
    await deleteShipment(id);
    showAlert("Shipment deleted", "success", 2000);
    loadAndRenderAll();
  } catch (err) {
    showAlert(err.message || "Failed to delete shipment");
  }
}


function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) { window.location.href = "index.html"; return; }

  document.getElementById("uidSearchBtn").addEventListener("click", onSearchClicked);
  document.getElementById("uidClearBtn").addEventListener("click", onSearchClear);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  loadAndRenderAll();
});


document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarFloatingToggle = document.getElementById("sidebarFloatingToggle");
  const main = document.querySelector("main");
  const contentArea = document.querySelector(".content-area");

  if (!sidebar || !sidebarToggle || !sidebarFloatingToggle || !main || !contentArea) {
    console.warn("Sidebar toggle elements missing. Toggle disabled.");
    return;
  }

  function showSidebar() {
    sidebar.classList.remove("hidden");
    sidebarFloatingToggle.classList.add("d-none");
    main.classList.remove("expanded");
    contentArea.classList.remove("expanded");
  }

  function hideSidebar() {
    sidebar.classList.add("hidden");
    sidebarFloatingToggle.classList.remove("d-none");
    main.classList.add("expanded");
    contentArea.classList.add("expanded");
  }

  sidebarToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("hidden")) showSidebar();
    else hideSidebar();
  });

  sidebarFloatingToggle.addEventListener("click", () => {
    showSidebar();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      showSidebar();
    } else {
      hideSidebar();
    }
  });

  if (window.innerWidth < 768) hideSidebar();
  else showSidebar();

});
