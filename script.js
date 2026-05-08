// Catálogo de Productos
const catalog = [
    { name: "Laptop básica", price: 385000 },
    { name: "Laptop premium", price: 895000 },
    { name: "Monitor de 24 pulgadas", price: 185000 },
    { name: "Kit de teclado y mouse inalámbrico", price: 45000 },
    { name: "Impresora multifuncional", price: 320000 },
    { name: "Servicio de instalación de equipo", price: 35000 },
    { name: "Mantenimiento preventivo anual", price: 85000 }
];

function getStoredHistory() {
    return JSON.parse(localStorage.getItem('quoteHistory')) || [];
}

function generateQuoteNumber() {
    const history = getStoredHistory();
    const nextNumber = history.length + 1;
    return "COT-" + nextNumber.toString().padStart(3, '0');
}

// Estado de la aplicación
let currentQuote = {
    number: "", 
    date: new Date().toLocaleDateString(),
    expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    client: { name: "", company: "", phone: "", type: "nuevo" },
    vendor: { name: "", role: "junior", discount: 0 },
    items: [],
    status: "Borrador",
    totals: {
        subtotal: 0,
        clientDiscount: 0,
        volumeDiscount: 0,
        vendorDiscount: 0,
        iva: 0,
        grandTotal: 0
    }
};

// Elementos del DOM
const productSelect = document.getElementById('product-list');
const itemsBody = document.getElementById('items-body');
const historyBody = document.getElementById('history-body');

// Inicialización
function init() {
    currentQuote.number = generateQuoteNumber();
    populateProductList();
    updateUI();
    renderHistory();
    setupEventListeners();
}

function populateProductList() {
    catalog.forEach((product, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${product.name} - ₡${product.price.toLocaleString()}`;
        productSelect.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('add-product-btn').addEventListener('click', addProduct);
    
    // Sincronizar inputs con el estado
    ['client-name', 'client-company', 'client-phone', 'client-type', 'vendor-name', 'vendor-role', 'vendor-discount'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            const val = el.value;
            if (id.startsWith('client-')) {
                currentQuote.client[id.replace('client-', '')] = val;
            } else if (id.startsWith('vendor-')) {
                currentQuote.vendor[id.replace('vendor-', '')] = val;
            }
            calculateTotals();
        });
    });

    document.getElementById('save-quote-btn').addEventListener('click', saveQuote);
    document.getElementById('print-pdf-btn').addEventListener('click', () => window.print());
    document.getElementById('approve-btn').addEventListener('click', approveQuote);
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
}

function clearHistory() {
    if (confirm("¿Estás seguro de que deseas borrar TODO el historial de cotizaciones? Esta acción no se puede deshacer.")) {
        localStorage.removeItem('quoteHistory');
        alert("Historial borrado exitosamente.");
        renderHistory();
        resetForm(); // Para resetear el número de cotización a COT-001
    }
}

function addProduct() {
    const productIndex = productSelect.value;
    const quantity = parseInt(document.getElementById('product-quantity').value);
    
    if (quantity <= 0) {
        alert("La cantidad debe ser mayor a 0");
        return;
    }

    const product = catalog[productIndex];
    currentQuote.items.push({
        id: Date.now(),
        name: product.name,
        price: product.price,
        quantity: quantity,
        subtotal: product.price * quantity
    });

    calculateTotals();
}

function removeProduct(id) {
    currentQuote.items = currentQuote.items.filter(item => item.id !== id);
    calculateTotals();
}

function calculateTotals() {
    // 1. Subtotal Base
    let subtotal = currentQuote.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // 2. Descuento por Tipo de Cliente (10% Frecuente, 15% Corporativo)
    let clientDiscountPercent = 0;
    if (currentQuote.client.type === 'frecuente') clientDiscountPercent = 0.10;
    if (currentQuote.client.type === 'corporativo') clientDiscountPercent = 0.15;
    
    let clientDiscountMonto = subtotal * clientDiscountPercent;

    // 3. Descuento por Volumen (5% si subtotal > 1M y NO es Corporativo)
    let volumeDiscountMonto = 0;
    if (subtotal > 1000000 && currentQuote.client.type !== 'corporativo') {
        volumeDiscountMonto = subtotal * 0.05;
    }

    // 4. Descuento Adicional del Vendedor (Sobre el remanente de descuentos anteriores)
    const vendorDiscountPercent = parseFloat(currentQuote.vendor.discount) / 100 || 0;
    const baseParaVendedor = subtotal - clientDiscountMonto - volumeDiscountMonto;
    let vendorDiscountMonto = baseParaVendedor * vendorDiscountPercent;

    // 5. Validar Rol del Vendedor y Estado
    validateVendorLimit(parseFloat(currentQuote.vendor.discount));

    // 6. IVA (13% sobre el total con todos los descuentos aplicados)
    const baseIVA = subtotal - clientDiscountMonto - volumeDiscountMonto - vendorDiscountMonto;
    const ivaMonto = baseIVA * 0.13;

    // Guardar en el objeto
    currentQuote.totals = {
        subtotal: subtotal,
        clientDiscount: clientDiscountMonto,
        volumeDiscount: volumeDiscountMonto,
        vendorDiscount: vendorDiscountMonto,
        iva: ivaMonto,
        grandTotal: baseIVA + ivaMonto
    };

    updateUI();
}

function validateVendorLimit(discountPercent) {
    const limit = currentQuote.vendor.role === 'junior' ? 5 : 10;
    const alertBox = document.getElementById('approval-notice');
    const approveBtn = document.getElementById('approve-btn');

    if (discountPercent > limit) {
        currentQuote.status = "Pendiente de aprobación";
        alertBox.classList.remove('hidden');
        approveBtn.classList.remove('hidden');
    } else {
        if (currentQuote.status === "Pendiente de aprobación") {
            currentQuote.status = "Borrador"; 
        }
        alertBox.classList.add('hidden');
        approveBtn.classList.add('hidden');
    }
}

function approveQuote() {
    currentQuote.status = "Aprobado";
    document.getElementById('approval-notice').classList.add('hidden');
    document.getElementById('approve-btn').classList.add('hidden');
    updateUI();
}

function updateUI() {
    document.getElementById('quote-number').textContent = currentQuote.number;
    document.getElementById('quote-date').textContent = currentQuote.date;
    document.getElementById('quote-expiry').textContent = currentQuote.expiry;
    document.getElementById('quote-status').textContent = currentQuote.status;
    
    document.getElementById('display-client').textContent = currentQuote.client.name || "---";
    document.getElementById('display-company').textContent = currentQuote.client.company || "---";
    document.getElementById('display-vendor').textContent = currentQuote.vendor.name || "---";

    itemsBody.innerHTML = '';
    currentQuote.items.forEach(item => {
        const row = `<tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₡${item.price.toLocaleString()}</td>
            <td>₡${item.subtotal.toLocaleString()}</td>
            <td class="no-print"><button onclick="removeProduct(${item.id})" class="btn-danger-sm">×</button></td>
        </tr>`;
        itemsBody.insertAdjacentHTML('beforeend', row);
    });

    document.getElementById('total-subtotal').textContent = `₡${currentQuote.totals.subtotal.toLocaleString()}`;
    document.getElementById('total-client-discount').textContent = `₡${currentQuote.totals.clientDiscount.toLocaleString()}`;
    document.getElementById('total-volume-discount').textContent = `₡${currentQuote.totals.volumeDiscount.toLocaleString()}`;
    document.getElementById('total-vendor-discount').textContent = `₡${currentQuote.totals.vendorDiscount.toLocaleString()}`;
    document.getElementById('total-iva').textContent = `₡${currentQuote.totals.iva.toLocaleString()}`;
    document.getElementById('total-grand').textContent = `₡${currentQuote.totals.grandTotal.toLocaleString()}`;
}

function saveQuote() {
    if (currentQuote.items.length === 0) {
        alert("Agregue al menos un producto");
        return;
    }
    if (!currentQuote.client.name || !currentQuote.client.company) {
        alert("Complete los datos del cliente");
        return;
    }

    const history = getStoredHistory();
    // Asegurar que el número de cotización es correcto antes de guardar
    currentQuote.number = "COT-" + (history.length + 1).toString().padStart(3, '0');
    
    history.unshift({...currentQuote, id: Date.now()});
    localStorage.setItem('quoteHistory', JSON.stringify(history));
    
    alert("Cotización " + currentQuote.number + " guardada exitosamente");
    renderHistory();
    resetForm();
}

function renderHistory() {
    historyBody.innerHTML = '';
    const storedHistory = getStoredHistory();
    storedHistory.forEach(quote => {
        const row = `<tr>
            <td>${quote.number}</td>
            <td>${quote.client.name}</td>
            <td>₡${quote.totals.grandTotal.toLocaleString()}</td>
            <td><span class="badge">${quote.status}</span></td>
            <td>
                <button onclick="loadQuote(${quote.id})" class="btn-secondary" style="padding: 2px 10px; font-size: 0.8rem">Ver</button>
            </td>
        </tr>`;
        historyBody.insertAdjacentHTML('beforeend', row);
    });
}

function loadQuote(id) {
    const storedHistory = getStoredHistory();
    const quote = storedHistory.find(q => q.id === id);
    if (quote) {
        currentQuote = JSON.parse(JSON.stringify(quote));
        
        document.getElementById('client-name').value = quote.client.name;
        document.getElementById('client-company').value = quote.client.company;
        document.getElementById('client-phone').value = quote.client.phone;
        document.getElementById('client-type').value = quote.client.type;
        document.getElementById('vendor-name').value = quote.vendor.name;
        document.getElementById('vendor-role').value = quote.vendor.role;
        document.getElementById('vendor-discount').value = quote.vendor.discount;
        
        updateUI();
    }
}

function resetForm() {
    // Mantener datos del vendedor para conveniencia
    const lastVendorName = currentQuote.vendor.name;
    const lastVendorRole = currentQuote.vendor.role;

    currentQuote = {
        number: generateQuoteNumber(),
        date: new Date().toLocaleDateString(),
        expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        client: { name: "", company: "", phone: "", type: "nuevo" },
        vendor: { name: lastVendorName, role: lastVendorRole, discount: 0 },
        items: [],
        status: "Borrador",
        totals: { subtotal: 0, clientDiscount: 0, volumeDiscount: 0, vendorDiscount: 0, iva: 0, grandTotal: 0 }
    };
    
    // Limpiar solo inputs de cliente
    ['client-name', 'client-company', 'client-phone'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('client-type').value = 'nuevo';
    document.getElementById('product-quantity').value = 1;
    document.getElementById('vendor-discount').value = 0;
    
    updateUI();
}

init();
