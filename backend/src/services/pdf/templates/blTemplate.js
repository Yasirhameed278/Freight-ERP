const { escape, brand, formatDate } = require('./_shared');

const partyBlock = (party, label) => {
  if (!party) return `<div class="party-box"><div class="party-label">${label}</div><div class="party-empty">—</div></div>`;
  const addr = party.addresses?.[0];
  return `
    <div class="party-box">
      <div class="party-label">${label}</div>
      <div class="party-name">${escape(party.companyName)}</div>
      ${addr ? `<div class="party-addr">${escape(addr.street || '')}${addr.city ? ', ' + escape(addr.city) : ''}${addr.country ? ', ' + escape(addr.country) : ''}</div>` : ''}
      ${party.contactPersons?.[0]?.email ? `<div class="party-contact">${escape(party.contactPersons[0].email)}</div>` : ''}
    </div>`;
};

const containerRows = (containers) => {
  if (!containers?.length) {
    return `<tr><td colspan="7" style="text-align:center;color:#888;padding:12px;">No container details entered</td></tr>`;
  }
  return containers.map((c) => `
    <tr>
      <td class="mono">${escape(c.containerNumber || '—')}</td>
      <td>${escape(c.containerType || '—')}</td>
      <td class="mono">${escape(c.sealNumber || '—')}</td>
      <td class="right">${c.packages ? c.packages.toLocaleString() : '—'}</td>
      <td>General Cargo</td>
      <td class="right">${c.grossWeight ? (c.grossWeight / 1000).toFixed(3) + ' MT' : '—'}</td>
      <td class="right">${c.cbm ? c.cbm.toFixed(3) + ' CBM' : '—'}</td>
    </tr>`).join('');
};

exports.renderBL = (shipment) => {
  const b = brand();

  const totalContainers = shipment.containers?.length || 0;
  const totalWeight = (shipment.containers || []).reduce((s, c) => s + (c.grossWeight || 0), 0);
  const totalCbm    = (shipment.containers || []).reduce((s, c) => s + (c.cbm || 0), 0);

  const containerSummary = totalContainers > 0
    ? `${totalContainers} x ${shipment.containers[0]?.containerType || 'CONTAINER'}`
    : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px;
    color: #1a1d23;
    line-height: 1.4;
    background: #fff;
  }
  .doc { width: 210mm; min-height: 297mm; padding: 12mm 14mm; }

  /* Header */
  .bl-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid ${b.color};
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  .brand-name { font-size: 20px; font-weight: 800; color: ${b.color}; }
  .brand-meta  { font-size: 9px; color: #5a6270; margin-top: 3px; line-height: 1.5; }
  .bl-title    { text-align: right; }
  .bl-title h1 {
    font-size: 22px;
    font-weight: 300;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: ${b.color};
  }
  .bl-number { font-size: 12px; font-weight: 700; margin-top: 4px; }
  .bl-type   { font-size: 9px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }

  /* Grid layout */
  .bl-grid { display: grid; gap: 0; border: 1px solid #ccc; margin-bottom: 8px; }
  .row     { display: flex; border-bottom: 1px solid #ccc; }
  .row:last-child { border-bottom: none; }
  .cell    { padding: 6px 8px; border-right: 1px solid #ccc; flex: 1; min-width: 0; }
  .cell:last-child { border-right: none; }
  .cell-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #5a6270;
    margin-bottom: 3px;
  }
  .cell-value { font-size: 10px; font-weight: 500; }
  .cell-value.lg { font-size: 12px; font-weight: 700; color: ${b.color}; }

  /* Party boxes */
  .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ccc; margin-bottom: 8px; }
  .party-box  { padding: 7px 9px; border-right: 1px solid #ccc; min-height: 55px; }
  .party-box:last-child { border-right: none; }
  .party-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #5a6270; margin-bottom: 3px; }
  .party-name  { font-size: 11px; font-weight: 700; color: #1a1d23; }
  .party-addr  { font-size: 9px; color: #555; margin-top: 2px; }
  .party-contact { font-size: 9px; color: #888; margin-top: 1px; }
  .party-empty { color: #ccc; font-style: italic; font-size: 9px; }

  /* Container table */
  .container-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
  .container-table th {
    background: ${b.color};
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 700;
  }
  .container-table td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  .container-table .right { text-align: right; }
  .container-table .mono  { font-family: monospace; font-size: 10px; }
  .container-table tfoot td {
    font-weight: 700;
    border-top: 2px solid #1a1d23;
    background: #f5f7fb;
  }

  /* Totals strip */
  .totals-strip {
    display: flex;
    gap: 0;
    border: 1px solid #ccc;
    margin-bottom: 8px;
  }
  .totals-strip .item { flex: 1; padding: 6px 10px; border-right: 1px solid #ccc; text-align: center; }
  .totals-strip .item:last-child { border-right: none; }
  .totals-strip .t-label { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
  .totals-strip .t-value { font-size: 13px; font-weight: 800; color: ${b.color}; }

  /* Freight & terms */
  .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ccc; margin-bottom: 8px; }
  .terms-cell { padding: 7px 9px; border-right: 1px solid #ccc; }
  .terms-cell:last-child { border-right: none; }

  /* Signature block */
  .sig-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 16px;
    border-top: 1px solid #ccc;
    padding-top: 12px;
  }
  .sig-label { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 20px; }
  .sig-line  { border-bottom: 1px solid #333; margin-top: 20px; }
  .sig-sub   { font-size: 8px; color: #888; margin-top: 3px; }

  /* Status bar */
  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    margin-bottom: 8px;
    font-size: 9px;
    color: #888;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-approved  { background: #d1fae5; color: #065f46; }
  .badge-pending   { background: #fef3c7; color: #92400e; }
  .badge-prepaid   { background: #dbeafe; color: #1e40af; }
  .badge-collect   { background: #fee2e2; color: #991b1b; }

  .section-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${b.color};
    margin-bottom: 5px;
    border-bottom: 1px solid ${b.color}22;
    padding-bottom: 3px;
  }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="doc">

  <!-- Header -->
  <div class="bl-header">
    <div>
      <div class="brand-name">${escape(b.name)}</div>
      <div class="brand-meta">
        ${b.address ? escape(b.address) + '<br>' : ''}
        ${b.phone ? 'Tel: ' + escape(b.phone) + '  ' : ''}
        ${b.email ? escape(b.email) : ''}
        ${b.website ? '<br>' + escape(b.website) : ''}
      </div>
    </div>
    <div class="bl-title">
      <h1>Bill of Lading</h1>
      <div class="bl-number">${escape(shipment.hblNumber || shipment.shipmentNumber)}</div>
      <div class="bl-type">${escape(shipment.type || 'FCL')} · ${escape(shipment.mode?.toUpperCase() || 'SEA')}</div>
    </div>
  </div>

  <!-- Status bar -->
  <div class="status-bar">
    <span class="badge ${shipment.approvalStatus === 'approved' ? 'badge-approved' : 'badge-pending'}">
      ${shipment.approvalStatus === 'approved' ? 'Approved' : 'Draft'}
    </span>
    <span class="badge ${(shipment.paymentTerms || '').toLowerCase().includes('collect') ? 'badge-collect' : 'badge-prepaid'}">
      ${escape(shipment.paymentTerms || 'Prepaid')}
    </span>
    <span>Issued: ${formatDate(new Date())}</span>
    ${shipment.bookingNumber ? `<span>Booking: <strong>${escape(shipment.bookingNumber)}</strong></span>` : ''}
    ${shipment.mblNumber ? `<span>MBL: <strong>${escape(shipment.mblNumber)}</strong></span>` : ''}
  </div>

  <!-- Parties -->
  <div class="party-grid">
    ${partyBlock(shipment.shipper,     'Shipper / Exporter')}
    ${partyBlock(shipment.consignee,   'Consignee')}
  </div>
  <div class="party-grid">
    ${partyBlock(shipment.notifyParty, 'Notify Party')}
    <div class="party-box">
      <div class="party-label">Also Notify / Agent</div>
      <div class="party-name">${escape(b.name)}</div>
      ${b.address ? `<div class="party-addr">${escape(b.address)}</div>` : ''}
      ${b.phone   ? `<div class="party-contact">Tel: ${escape(b.phone)}</div>` : ''}
    </div>
  </div>

  <!-- Routing -->
  <div class="section-title">Routing &amp; Transport</div>
  <div class="bl-grid">
    <div class="row">
      <div class="cell" style="flex:1.5">
        <div class="cell-label">Place of Receipt</div>
        <div class="cell-value">${escape(shipment.placeOfReceipt?.name || shipment.placeOfReceipt?.city || '—')}</div>
      </div>
      <div class="cell" style="flex:1.5">
        <div class="cell-label">Port of Loading</div>
        <div class="cell-value lg">${escape(shipment.portOfLoading?.name || shipment.portOfLoading?.city || '—')} ${shipment.portOfLoading?.code ? '(' + escape(shipment.portOfLoading.code) + ')' : ''}</div>
      </div>
      <div class="cell" style="flex:1.5">
        <div class="cell-label">Port of Discharge</div>
        <div class="cell-value lg">${escape(shipment.portOfDischarge?.name || shipment.portOfDischarge?.city || '—')} ${shipment.portOfDischarge?.code ? '(' + escape(shipment.portOfDischarge.code) + ')' : ''}</div>
      </div>
      <div class="cell" style="flex:1.5">
        <div class="cell-label">Place of Delivery</div>
        <div class="cell-value">${escape(shipment.placeOfDelivery?.name || shipment.placeOfDelivery?.city || '—')}</div>
      </div>
    </div>
    <div class="row">
      <div class="cell" style="flex:2">
        <div class="cell-label">Vessel / Voyage</div>
        <div class="cell-value">${escape(shipment.vesselName || '—')} ${shipment.voyageNumber ? '· Voy ' + escape(shipment.voyageNumber) : ''}</div>
      </div>
      <div class="cell" style="flex:1">
        <div class="cell-label">Carrier</div>
        <div class="cell-value">${escape(shipment.carrier || '—')}</div>
      </div>
      <div class="cell" style="flex:1">
        <div class="cell-label">ETD</div>
        <div class="cell-value">${formatDate(shipment.etd)}</div>
      </div>
      <div class="cell" style="flex:1">
        <div class="cell-label">ETA</div>
        <div class="cell-value">${formatDate(shipment.eta)}</div>
      </div>
      <div class="cell" style="flex:1">
        <div class="cell-label">Incoterm</div>
        <div class="cell-value">${escape(shipment.incoterm || '—')}</div>
      </div>
    </div>
  </div>

  <!-- Container details -->
  <div class="section-title">Container &amp; Cargo Details</div>
  <table class="container-table">
    <thead>
      <tr>
        <th>Container #</th>
        <th>Type</th>
        <th>Seal #</th>
        <th class="right">Pkgs</th>
        <th>Description of Goods</th>
        <th class="right">Gross Weight</th>
        <th class="right">Volume</th>
      </tr>
    </thead>
    <tbody>
      ${containerRows(shipment.containers)}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3"><strong>Total: ${containerSummary}</strong></td>
        <td class="right">—</td>
        <td></td>
        <td class="right">${totalWeight > 0 ? (totalWeight / 1000).toFixed(3) + ' MT' : '—'}</td>
        <td class="right">${totalCbm > 0 ? totalCbm.toFixed(3) + ' CBM' : '—'}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Summary strip -->
  <div class="totals-strip">
    <div class="item">
      <div class="t-label">Total Containers</div>
      <div class="t-value">${totalContainers}</div>
    </div>
    <div class="item">
      <div class="t-label">Container Summary</div>
      <div class="t-value" style="font-size:10px">${escape(containerSummary)}</div>
    </div>
    <div class="item">
      <div class="t-label">Total Gross Weight</div>
      <div class="t-value">${totalWeight > 0 ? (totalWeight / 1000).toFixed(2) + ' MT' : '—'}</div>
    </div>
    <div class="item">
      <div class="t-label">Total Volume</div>
      <div class="t-value">${totalCbm > 0 ? totalCbm.toFixed(2) + ' CBM' : '—'}</div>
    </div>
    <div class="item">
      <div class="t-label">Freight Terms</div>
      <div class="t-value" style="font-size:10px">${escape(shipment.paymentTerms || 'Prepaid')}</div>
    </div>
  </div>

  <!-- Terms -->
  <div class="section-title">Freight &amp; Charges</div>
  <div class="terms-grid">
    <div class="terms-cell">
      <div class="cell-label">Freight Charges</div>
      <div class="cell-value" style="font-size:9px;color:#555;margin-top:4px;">
        As per agreement. All charges are subject to the carrier's tariff and applicable surcharges.
        Freight ${(shipment.paymentTerms || '').toLowerCase().includes('collect') ? '<strong>COLLECT</strong>' : '<strong>PREPAID</strong>'}.
      </div>
    </div>
    <div class="terms-cell">
      <div class="cell-label">Special Instructions / Marks</div>
      <div class="cell-value" style="font-size:9px;color:#555;margin-top:4px;">
        ${escape(shipment.notes || '—')}
      </div>
    </div>
  </div>

  <!-- Conditions notice -->
  <div style="font-size:8px;color:#888;border:1px solid #e5e7eb;padding:5px 8px;margin-bottom:12px;line-height:1.5;">
    RECEIVED by the Carrier in apparent good order and condition, unless otherwise noted herein, the goods or packages said to contain the cargo described above.
    In accepting this Bill of Lading the shipper, consignee and owner of the goods agree to be bound by the terms and conditions of this Bill of Lading, including those on the reverse side,
    whether signed by the shipper or not. One of these Bills of Lading must be surrendered duly endorsed in exchange for the goods.
  </div>

  <!-- Signature block -->
  <div class="sig-block">
    <div>
      <div class="sig-label">Shipper's Declaration</div>
      <div style="font-size:9px;color:#555;">
        I/We declare that the contents of this consignment are fully and accurately described above and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport by air/sea according to applicable international and national governmental regulations.
      </div>
      <div class="sig-line"></div>
      <div class="sig-sub">Signature &amp; Date</div>
    </div>
    <div>
      <div class="sig-label">Carrier / Agent Declaration</div>
      <div style="font-size:9px;color:#555;">
        As carrier or agent for the carrier, I declare that this shipment has been accepted in good order and that it conforms to applicable regulations.
      </div>
      <div style="margin-top:14px;">
        <div style="font-size:10px;font-weight:700;">${escape(b.name)}</div>
        ${b.address ? `<div style="font-size:9px;color:#555;">${escape(b.address)}</div>` : ''}
      </div>
      <div class="sig-line"></div>
      <div class="sig-sub">Authorised Signature &amp; Stamp</div>
    </div>
  </div>

  <div style="text-align:center;font-size:8px;color:#aaa;margin-top:12px;border-top:1px solid #e5e7eb;padding-top:6px;">
    ${escape(shipment.hblNumber || shipment.shipmentNumber)} · Generated by ${escape(b.name)} · ${formatDate(new Date())}
  </div>

</div>
</body>
</html>`;
};
