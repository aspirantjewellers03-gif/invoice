// ==================== GLOBAL STATE & INIT ====================
let productsDB = JSON.parse(localStorage.getItem('aspirant_products')) || [];
let customersDB = JSON.parse(localStorage.getItem('aspirant_customers')) || [];
let lastInvoiceNumber = localStorage.getItem('lastInvoiceNumber') || (() => {
  const year = new Date().getFullYear();
  return `INV-${year}-001`;
})();

// DOM elements
const invoiceNumberInput = document.getElementById('invoiceNumber');
const invoiceDateInput = document.getElementById('invoiceDate');
const refreshInvoiceBtn = document.getElementById('refreshInvoice');
const customerName = document.getElementById('customerName');
const customerEmail = document.getElementById('customerEmail');
const customerPhone = document.getElementById('customerPhone');
const customerAddress = document.getElementById('customerAddress');
const businessName = document.getElementById('businessName');
const businessAddress = document.getElementById('businessAddress');
const businessPhone = document.getElementById('businessPhone');
const logoUpload = document.getElementById('logoUpload');
const logoPreview = document.getElementById('logoPreview');
const productContainer = document.getElementById('productRowsContainer');
const addProductBtn = document.getElementById('addProductRow');
const subtotalSpan = document.getElementById('subtotal');
const totalGSTSpan = document.getElementById('totalGST');
const totalDiscountSpan = document.getElementById('totalDiscount');
const grandTotalSpan = document.getElementById('grandTotal');
const previewBtn = document.getElementById('previewBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const gmailShareBtn = document.getElementById('gmailShareBtn');
const whatsappShareBtn = document.getElementById('whatsappShareBtn');
const shareEmail = document.getElementById('shareEmail');
const shareWhatsApp = document.getElementById('shareWhatsApp');
const previewModal = document.getElementById('previewModal');
const previewContent = document.getElementById('previewContent');
const modalClose = document.querySelector('.close');
const modalDownloadPdf = document.getElementById('modalDownloadPdf');

// Set initial invoice number & date
invoiceNumberInput.value = lastInvoiceNumber;
const today = new Date().toISOString().slice(0,10);
invoiceDateInput.value = today;

// ==================== INVOICE NUMBER LOGIC ====================
refreshInvoiceBtn.addEventListener('click', () => {
  const currentYear = new Date().getFullYear();
  const match = invoiceNumberInput.value.match(/^INV-(\d{4})-(\d{3})$/);
  let nextNum = 1;
  if (match) {
    const year = parseInt(match[1], 10);
    const num = parseInt(match[2], 10);
    nextNum = (year === currentYear) ? num + 1 : 1;
  }
  const newNumber = `INV-${currentYear}-${nextNum.toString().padStart(3, '0')}`;
  invoiceNumberInput.value = newNumber;
  localStorage.setItem('lastInvoiceNumber', newNumber);
});

// ==================== PRODUCT ROWS MANAGEMENT ====================
function createProductRow(data = {}) {
  const row = document.createElement('div');
  row.className = 'product-row';
  row.innerHTML = `
    <input type="text" class="prod-name" placeholder="Name" value="${data.name || ''}" list="prodSuggest">
    <input type="text" class="prod-id" placeholder="ID" value="${data.id || ''}">
    <select class="prod-category">
      <option value="Ring" ${data.category==='Ring'?'selected':''}>Ring</option>
      <option value="Necklace" ${data.category==='Necklace'?'selected':''}>Necklace</option>
      <option value="Bangle" ${data.category==='Bangle'?'selected':''}>Bangle</option>
      <option value="Earrings" ${data.category==='Earrings'?'selected':''}>Earrings</option>
      <option value="Other" ${data.category==='Other'?'selected':''}>Other</option>
    </select>
    <input type="number" class="prod-qty" placeholder="Qty" min="1" >
    <input type="number" class="prod-price" placeholder="Price" min="0" step="0.01" >
    <input type="number" class="prod-gst" placeholder="GST %" min="0" step="0.1" >
    <input type="number" class="prod-discount" placeholder="Disc %" min="0" step="0.1" >
    <span class="prod-total">₹0.00</span>
    <button class="remove-row"><i class="fas fa-trash-alt"></i></button>
  `;
  row.querySelectorAll('input, select').forEach(el => el.addEventListener('input', calculateTotals));
  row.querySelector('.remove-row').addEventListener('click', () => {
    row.remove();
    calculateTotals();
    updateProductSuggestions();
  });
  row.querySelector('.prod-name').addEventListener('blur', updateProductSuggestions);
  row.querySelector('.prod-price').addEventListener('blur', updateProductSuggestions);
  return row;
}

if (productContainer.children.length === 0) {
  productContainer.appendChild(createProductRow());
}

addProductBtn.addEventListener('click', () => {
  productContainer.appendChild(createProductRow());
  calculateTotals();
});

// ==================== LIVE CALCULATIONS ====================
function calculateTotals() {
  let subtotal = 0, totalGST = 0, totalDiscount = 0, grandTotal = 0;
  const rows = document.querySelectorAll('.product-row');
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.prod-qty').value) || 0;
    const price = parseFloat(row.querySelector('.prod-price').value) || 0;
    const gst = parseFloat(row.querySelector('.prod-gst').value) || 0;
    const disc = parseFloat(row.querySelector('.prod-discount').value) || 0;
    const lineSubtotal = qty * price;
    const discountAmt = lineSubtotal * (disc / 100);
    const afterDiscount = lineSubtotal - discountAmt;
    const gstAmt = afterDiscount * (gst / 100);
    const lineTotal = afterDiscount + gstAmt;
    subtotal += lineSubtotal;
    totalGST += gstAmt;
    totalDiscount += discountAmt;
    grandTotal += lineTotal;
    row.querySelector('.prod-total').textContent = `₹${lineTotal.toFixed(2)}`;
  });
  subtotalSpan.textContent = `₹${subtotal.toFixed(2)}`;
  totalGSTSpan.textContent = `₹${totalGST.toFixed(2)}`;
  totalDiscountSpan.textContent = `₹${totalDiscount.toFixed(2)}`;
  grandTotalSpan.textContent = `₹${grandTotal.toFixed(2)}`;
}

// ==================== AI SUGGESTIONS ====================
function updateProductSuggestions() {
  const rows = document.querySelectorAll('.product-row');
  rows.forEach(row => {
    const name = row.querySelector('.prod-name').value.trim();
    const price = parseFloat(row.querySelector('.prod-price').value) || 0;
    if (name && price > 0) {
      const existing = productsDB.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.price = price;
      } else {
        productsDB.push({ name, price });
      }
    }
  });
  const unique = {};
  productsDB.forEach(p => unique[p.name.toLowerCase()] = p);
  productsDB = Object.values(unique);
  localStorage.setItem('aspirant_products', JSON.stringify(productsDB));
  renderProductDatalist();
}

function renderProductDatalist() {
  let html = '';
  productsDB.forEach(p => html += `<option value="${p.name}">`);
  document.getElementById('prodSuggest').innerHTML = html;
}

productContainer.addEventListener('change', (e) => {
  if (e.target.classList.contains('prod-name')) {
    const name = e.target.value;
    const product = productsDB.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (product) {
      const row = e.target.closest('.product-row');
      row.querySelector('.prod-price').value = product.price;
      calculateTotals();
    }
  }
});

function updateCustomersDB() {
  const name = customerName.value.trim();
  if (!name) return;
  const customer = {
    name,
    email: customerEmail.value.trim(),
    phone: customerPhone.value.trim(),
    address: customerAddress.value.trim()
  };
  const existingIndex = customersDB.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    customersDB[existingIndex] = customer;
  } else {
    customersDB.push(customer);
  }
  localStorage.setItem('aspirant_customers', JSON.stringify(customersDB));
  renderCustomerDatalist();
}

function renderCustomerDatalist() {
  let html = '';
  customersDB.forEach(c => html += `<option value="${c.name}">`);
  document.getElementById('customerSuggest').innerHTML = html;
}

customerName.addEventListener('blur', updateCustomersDB);
customerName.addEventListener('change', (e) => {
  const name = e.target.value;
  const customer = customersDB.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (customer) {
    customerEmail.value = customer.email || '';
    customerPhone.value = customer.phone || '';
    customerAddress.value = customer.address || '';
  }
});

// ==================== LOGO UPLOAD & PREVIEW ====================
let logoDataURL = null;
logoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoDataURL = ev.target.result;
      logoPreview.innerHTML = `<img src="${logoDataURL}" alt="Logo">`;
    };
    reader.readAsDataURL(file);
  }
});

// ==================== VALIDATION ====================
function validateForm() {
  let valid = true;
  const requiredFields = [
    { field: customerName, name: 'Customer Name' },
    { field: businessName, name: 'Business Name' }
  ];
  requiredFields.forEach(item => {
    if (!item.field.value.trim()) {
      valid = false;
      item.field.style.borderColor = 'red';
    } else {
      item.field.style.borderColor = '';
    }
  });

  const rows = document.querySelectorAll('.product-row');
  if (rows.length === 0) {
    valid = false;
    alert('Add at least one product.');
    return false;
  }

  rows.forEach((row, idx) => {
    const name = row.querySelector('.prod-name').value.trim();
    const qty = parseFloat(row.querySelector('.prod-qty').value);
    const price = parseFloat(row.querySelector('.prod-price').value);
    if (!name) {
      valid = false;
      row.querySelector('.prod-name').style.borderColor = 'red';
    } else {
      row.querySelector('.prod-name').style.borderColor = '';
    }
    if (isNaN(qty) || qty <= 0) {
      valid = false;
      row.querySelector('.prod-qty').style.borderColor = 'red';
    } else {
      row.querySelector('.prod-qty').style.borderColor = '';
    }
    if (isNaN(price) || price <= 0) {
      valid = false;
      row.querySelector('.prod-price').style.borderColor = 'red';
    } else {
      row.querySelector('.prod-price').style.borderColor = '';
    }
  });

  if (!valid) alert('Please fill all required fields correctly (Customer Name, Business Name, and each product must have a name, quantity > 0, and price > 0).');
  return valid;
}

// ==================== PREVIEW (LocalStorage) ====================
function saveToLocalStorage() {
  const invoiceData = {
    invoiceNumber: invoiceNumberInput.value,
    date: invoiceDateInput.value,
    customer: {
      name: customerName.value,
      email: customerEmail.value,
      phone: customerPhone.value,
      address: customerAddress.value
    },
    business: {
      name: businessName.value,
      address: businessAddress.value,
      phone: businessPhone.value,
      logo: logoDataURL
    },
    products: [],
    totals: {
      subtotal: subtotalSpan.textContent,
      gst: totalGSTSpan.textContent,
      discount: totalDiscountSpan.textContent,
      grand: grandTotalSpan.textContent
    }
  };
  document.querySelectorAll('.product-row').forEach(row => {
    invoiceData.products.push({
      name: row.querySelector('.prod-name').value,
      id: row.querySelector('.prod-id').value,
      category: row.querySelector('.prod-category').value,
      qty: row.querySelector('.prod-qty').value,
      price: row.querySelector('.prod-price').value,
      gst: row.querySelector('.prod-gst').value,
      discount: row.querySelector('.prod-discount').value,
      total: row.querySelector('.prod-total').textContent
    });
  });
  localStorage.setItem('invoicePreview', JSON.stringify(invoiceData));
  return invoiceData;
}

function showPreview() {
  const data = saveToLocalStorage();
  let html = `
    <div style="font-family: Inter, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 1rem;">
        <h2 style="color:#1e3a8a;">ASPIRANT</h2>
        <div><strong>${data.invoiceNumber}</strong><br>${data.date}</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 1.5rem 0;">
        <div><strong>Bill To:</strong><br>${data.customer.name}<br>${data.customer.email}<br>${data.customer.phone}<br>${data.customer.address}</div>
        <div style="text-align:right;"><strong>Business:</strong><br>${data.business.name}<br>${data.business.address}<br>${data.business.phone}</div>
      </div>
      <table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
        <thead style="background:#eef2ff;"><tr><th>Item</th><th>Qty</th><th>Price</th><th>GST%</th><th>Disc%</th><th>Total</th></tr></thead>
        <tbody>
  `;
  data.products.forEach(p => {
    html += `<tr><td>${p.name}</td><td>${p.qty}</td><td>${p.price}</td><td>${p.gst}</td><td>${p.discount}</td><td>${p.total}</td></tr>`;
  });
  html += `
        </tbody>
      </table>
      <div style="border-top: 2px solid #ccc; padding-top:1rem; text-align:right;">
        <p>Subtotal: ${data.totals.subtotal}</p>
        <p>GST: ${data.totals.gst}</p>
        <p>Discount: ${data.totals.discount}</p>
        <h3>Grand Total: ${data.totals.grand}</h3>
      </div>
    </div>
  `;
  previewContent.innerHTML = html;
  previewModal.style.display = 'flex';
}

previewBtn.addEventListener('click', showPreview);
modalClose.addEventListener('click', () => previewModal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === previewModal) previewModal.style.display = 'none'; });

// ==================== NEW: RESET FORM AFTER SUCCESSFUL DOWNLOAD ====================
function resetForm() {
  try {
    // 1. Clear customer details
    customerName.value = '';
    customerEmail.value = '';
    customerPhone.value = '';
    customerAddress.value = '';

    // 2. Reset product rows to one empty row
    while (productContainer.firstChild) {
      productContainer.removeChild(productContainer.firstChild);
    }
    productContainer.appendChild(createProductRow({}));

    // 3. Business details remain unchanged – do nothing

    // 4. Invoice number auto‑increment
    const currentYear = new Date().getFullYear();
    const match = invoiceNumberInput.value.match(/^INV-(\d{4})-(\d{3})$/);
    let nextNum = 1;
    if (match) {
      const year = parseInt(match[1], 10);
      const num = parseInt(match[2], 10);
      nextNum = (year === currentYear) ? num + 1 : 1;
    }
    const newNumber = `INV-${currentYear}-${nextNum.toString().padStart(3, '0')}`;
    invoiceNumberInput.value = newNumber;
    localStorage.setItem('lastInvoiceNumber', newNumber);

    // 5. Update invoice date to current date
    const today = new Date().toISOString().slice(0, 10);
    invoiceDateInput.value = today;

    // 6. Recalculate totals (will set everything to ₹0.00)
    calculateTotals();

    // 7. Update AI suggestion lists (optional)
    updateProductSuggestions();
    updateCustomersDB();

  } catch (error) {
    console.error('Error during form reset:', error);
  }
}

// ==================== UPDATED PDF GENERATION ====================
async function generatePDF() {
  if (!validateForm()) return;

  const data = saveToLocalStorage();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  try {
    if (data.business.logo) {
      try {
        let format = 'JPEG';
        if (data.business.logo.startsWith('data:image/png')) {
          format = 'PNG';
        } else if (data.business.logo.startsWith('data:image/jpeg') || data.business.logo.startsWith('data:image/jpg')) {
          format = 'JPEG';
        }
        doc.addImage(data.business.logo, format, 15, 10, 40, 15);
      } catch (logoErr) {
        console.warn('Logo could not be added to PDF:', logoErr);
      }
    }

    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text('ASPIRANT', 140, 20);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Invoice: ${data.invoiceNumber}`, 140, 30);
    doc.text(`Date: ${data.date}`, 140, 36);

    doc.setFontSize(10);
    doc.text('Bill To:', 15, 50);
    doc.text(data.customer.name, 15, 56);
    doc.text(data.customer.email, 15, 62);
    doc.text(data.customer.phone, 15, 68);
    doc.text(data.customer.address, 15, 74);

    doc.text('Business:', 120, 50);
    doc.text(data.business.name, 120, 56);
    doc.text(data.business.address, 120, 62);
    doc.text(data.business.phone, 120, 68);

    const tableColumn = ['Item', 'Qty', 'Price', 'GST%', 'Disc%', 'Total'];
    const tableRows = data.products.map(p => [p.name, p.qty, p.price, p.gst, p.discount, p.total]);
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] }
    });

    let finalY = 85;
    if (typeof doc.lastAutoTable !== 'undefined' && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY + 10;
    } else {
      finalY = 85 + (data.products.length * 10) + 20;
    }

    doc.setFontSize(11);
    doc.text(`Subtotal: ${data.totals.subtotal}`, 140, finalY);
    doc.text(`GST: ${data.totals.gst}`, 140, finalY + 6);
    doc.text(`Discount: ${data.totals.discount}`, 140, finalY + 12);
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text(`Grand Total: ${data.totals.grand}`, 140, finalY + 20);

    doc.save(`Invoice_${data.invoiceNumber}.pdf`);

    localStorage.removeItem('invoicePreview');

    // ----- NEW: Reset form after successful download -----
    resetForm();

  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF. Please check the console for details and try again.');
  }
}

downloadPdfBtn.addEventListener('click', generatePDF);
modalDownloadPdf.addEventListener('click', () => {
  generatePDF();
  previewModal.style.display = 'none';
});

// ==================== GMAIL & WHATSAPP SHARE ====================
gmailShareBtn.addEventListener('click', () => {
  const email = shareEmail.value.trim();
  if (!email) { alert('Enter an email address'); return; }
  const subject = `Invoice ${invoiceNumberInput.value} from ASPIRANT`;
  const body = `Dear Customer,\n\nPlease find attached invoice ${invoiceNumberInput.value} dated ${invoiceDateInput.value}.\n\nGrand Total: ${grandTotalSpan.textContent}\n\nThank you for your business.\n\nASPIRANT`;
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

whatsappShareBtn.addEventListener('click', () => {
  const phone = shareWhatsApp.value.trim().replace(/\D/g,'');
  if (!phone) { alert('Enter a WhatsApp number'); return; }
  const text = `Invoice ${invoiceNumberInput.value} from ASPIRANT\nDate: ${invoiceDateInput.value}\nGrand Total: ${grandTotalSpan.textContent}\nPlease check attached PDF.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
});

// ==================== INITIAL RENDER ====================
calculateTotals();
renderProductDatalist();
renderCustomerDatalist();