import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, StoreSettings, User } from '../types';

interface AnalyticsPDFOptions {
  period: 'today' | 'week' | 'month' | 'all';
  includeTransactionsList?: boolean;
  currentUser?: User | null;
}

const formatCurrency = (val: number): string => {
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
};

const getPeriodLabel = (period: 'today' | 'week' | 'month' | 'all'): string => {
  switch (period) {
    case 'today':
      return 'Hari Ini (' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ')';
    case 'week':
      return '7 Hari Terakhir';
    case 'month':
      return 'Bulan Ini (' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + ')';
    case 'all':
      return 'Semua Data Riwayat Transaksi';
  }
};

export const generateAnalyticsPDF = (
  orders: Order[],
  settings: StoreSettings,
  options: AnalyticsPDFOptions
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 14;

  // 1. Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalBilled = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingReceivables = orders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
  const totalOrdersCount = orders.length;

  // Estimated Gross Profit
  const estimatedCost = orders.reduce((sum, o) => {
    const itemCost = o.items.reduce(
      (s, it) => s + (it.costPrice || it.price * 0.6) * it.qty,
      0
    );
    return sum + itemCost;
  }, 0);
  const estimatedGrossProfit = Math.max(0, totalBilled - estimatedCost);
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalBilled / totalOrdersCount) : 0;

  // Payment Breakdown
  const paymentBreakdown: { [key: string]: { count: number; amount: number } } = {};
  orders.forEach(o => {
    const key = o.paymentMethod || 'Cash';
    if (!paymentBreakdown[key]) {
      paymentBreakdown[key] = { count: 0, amount: 0 };
    }
    paymentBreakdown[key].count += 1;
    paymentBreakdown[key].amount += o.paidAmount || 0;
  });

  // Top Products
  const productCountMap: { [name: string]: { qty: number; revenue: number } } = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      if (!productCountMap[it.name]) {
        productCountMap[it.name] = { qty: 0, revenue: 0 };
      }
      productCountMap[it.name].qty += it.qty;
      productCountMap[it.name].revenue += (it.price || 0) * it.qty;
    });
  });

  const topProducts = Object.entries(productCountMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  // Status Breakdown
  const lunasCount = orders.filter(o => o.paymentStatus === 'Lunas').length;
  const dpCount = orders.filter(o => o.paymentStatus === 'DP').length;

  // 2. Header Drawing
  // Top brand banner
  doc.setFillColor(153, 27, 27); // Dark Crimson #991B1B
  doc.rect(margin, currentY, pageWidth - margin * 2, 2.5, 'F');
  currentY += 6;

  // Store Brand Name (typography only, no graphic emblem)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(settings.storeName || 'SANDIKALE-PROJECT', margin, currentY);

  // Subtitle / Report Title
  currentY += 5.5;
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text('LAPORAN RESMI ANALITIK & KEUANGAN PENJUALAN', margin, currentY);

  // Store Contacts (Right aligned in header)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const addressLine = settings.address || 'Workshop Sablon & Apparel';
  const phoneLine = `WA: ${settings.phone || '-'}` + (settings.instagram ? ` • IG: @${settings.instagram}` : '');
  doc.text(addressLine, pageWidth - margin, currentY - 5.5, { align: 'right' });
  doc.text(phoneLine, pageWidth - margin, currentY, { align: 'right' });

  // Divider Line
  currentY += 4;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // Report Metadata Grid
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Periode Laporan:', margin + 3, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(getPeriodLabel(options.period), margin + 31, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Tanggal Cetak:', margin + 115, currentY + 5);
  doc.setFont('helvetica', 'normal');
  const printTimeStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(printTimeStr, margin + 140, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Dicetak Oleh:', margin + 3, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  const printAuthor = options.currentUser
    ? `${options.currentUser.name} (${options.currentUser.role.toUpperCase()})`
    : 'Admin Sistem Sandikale';
  doc.text(printAuthor, margin + 31, currentY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Transaksi:', margin + 115, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalOrdersCount} Nota (${lunasCount} Lunas, ${dpCount} Sisa DP)`, margin + 140, currentY + 10.5);

  currentY += 19;

  // 3. Financial KPI Summary Cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Ringkasan Eksekutif Finansial', margin, currentY);
  currentY += 3.5;

  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  // Card 1: Omzet Masuk (Paid Revenue)
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27); // red-800
  doc.text('OMZET MASUK (CASH IN)', margin + 3, currentY + 4.5);
  doc.setFontSize(10);
  doc.text(formatCurrency(totalRevenue), margin + 3, currentY + 10.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Kas riil diterima', margin + 3, currentY + 15);

  // Card 2: Estimasi Laba Kotor
  const card2X = margin + cardWidth + 3;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text('ESTIMASI LABA KOTOR', card2X + 3, currentY + 4.5);
  doc.setFontSize(10);
  doc.text(formatCurrency(estimatedGrossProfit), card2X + 3, currentY + 10.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Omzet minus estimasi HPP', card2X + 3, currentY + 15);

  // Card 3: Piutang (Pending Receivables)
  const card3X = card2X + cardWidth + 3;
  doc.setFillColor(255, 251, 235); // amber-50
  doc.setDrawColor(253, 230, 138); // amber-200
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('PIUTANG / SISA DP', card3X + 3, currentY + 4.5);
  doc.setFontSize(10);
  doc.text(formatCurrency(pendingReceivables), card3X + 3, currentY + 10.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Belum dilunasi customer', card3X + 3, currentY + 15);

  // Card 4: Total Nilai Tagihan
  const card4X = card3X + cardWidth + 3;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(card4X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('TOTAL PENJUALAN', card4X + 3, currentY + 4.5);
  doc.setFontSize(10);
  doc.text(formatCurrency(totalBilled), card4X + 3, currentY + 10.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Rerata: ${formatCurrency(avgOrderValue)}`, card4X + 3, currentY + 15);

  currentY += cardHeight + 7;

  // 4. Tables Side-by-Side: Payment Methods & Top Selling Products
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Distribusi Metode Pembayaran & Produk Terlaris', margin, currentY);
  currentY += 3;

  // Payment Breakdown Table
  const paymentRows = Object.entries(paymentBreakdown).map(([method, data]) => {
    const percentage = totalRevenue > 0 ? ((data.amount / totalRevenue) * 100).toFixed(1) : '0';
    return [method, `${data.count}x`, formatCurrency(data.amount), `${percentage}%`];
  });

  if (paymentRows.length === 0) {
    paymentRows.push(['Belum ada data', '-', '-', '-']);
  }

  // Top Products Table
  const topProductRows = topProducts.map(([name, data], idx) => [
    `#${idx + 1}`,
    name,
    `${data.qty} pcs`,
    formatCurrency(data.revenue),
  ]);

  if (topProductRows.length === 0) {
    topProductRows.push(['-', 'Belum ada produk terjual', '-', '-']);
  }

  const tableColWidth = (pageWidth - margin * 2 - 6) / 2;

  // Render Payment Table (Left)
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin + tableColWidth + 6 },
    head: [['Metode', 'Jml', 'Nominal Diterima', 'Porsi']],
    body: paymentRows,
    theme: 'striped',
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 12 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 14 },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
  });

  const paymentFinalY = (doc as any).lastAutoTable.finalY;

  // Render Top Products Table (Right)
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + tableColWidth + 6, right: margin },
    head: [['No', 'Produk / Jasa', 'Qty', 'Total']],
    body: topProductRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 24 },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
  });

  const topProductFinalY = (doc as any).lastAutoTable.finalY;
  currentY = Math.max(paymentFinalY, topProductFinalY) + 7;

  // 5. Transaction Details List (if requested or by default)
  if (options.includeTransactionsList !== false) {
    // If not enough room for header and a couple rows, add page
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin + 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. Rincian Riwayat Transaksi (${orders.length} Transaksi)`, margin, currentY);
    currentY += 3.5;

    const transactionRows = orders.map((o, idx) => {
      const itemsSummary = o.items.map(it => `${it.qty}x ${it.name}`).join(', ');
      return [
        (idx + 1).toString(),
        o.id,
        o.displayDate,
        o.customerName + (o.customerPhone ? `\n(${o.customerPhone})` : ''),
        itemsSummary,
        formatCurrency(o.total),
        formatCurrency(o.paidAmount),
        o.remainingAmount > 0 ? formatCurrency(o.remainingAmount) : 'LUNAS',
        o.paymentMethod || 'Cash',
        o.paymentStatus,
      ];
    });

    if (transactionRows.length === 0) {
      transactionRows.push(['-', '-', '-', 'Tidak ada transaksi', '-', '-', '-', '-', '-', '-']);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        ['No', 'Nota', 'Waktu', 'Pelanggan', 'Rincian Pesanan', 'Tagihan', 'Terbayar', 'Sisa', 'Metode', 'Status'],
      ],
      body: transactionRows,
      theme: 'grid',
      headStyles: {
        fillColor: [153, 27, 27],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'left', cellWidth: 25 },
        4: { halign: 'left', cellWidth: 'auto' },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 16 },
        8: { halign: 'center', cellWidth: 16 },
        9: { halign: 'center', cellWidth: 14 },
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Signatures and Endorsement Block
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = margin + 5;
  }

  const signBlockY = currentY;
  const col1X = margin + 15;
  const col2X = pageWidth - margin - 55;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Dibuat & Diverifikasi Oleh:', col1X, signBlockY, { align: 'center' });
  doc.text('Mengetahui / Disetujui Oleh:', col2X, signBlockY, { align: 'center' });

  // Signature lines
  const sigLineY = signBlockY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const operatorName = options.currentUser?.name || 'Kasir / Staf Administrasi';
  doc.text(operatorName, col1X, sigLineY, { align: 'center' });
  doc.line(col1X - 25, sigLineY + 1, col1X + 25, sigLineY + 1);

  doc.text('Owner / Manajemen Sandikale', col2X, sigLineY, { align: 'center' });
  doc.line(col2X - 25, sigLineY + 1, col2X + 25, sigLineY + 1);

  // Digital Security Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Dokumen ini dicetak otomatis oleh Sistem Kasir & Produksi SANDIKALE-PROJECT dengan segel integritas digital valid.',
    pageWidth / 2,
    sigLineY + 6,
    { align: 'center' }
  );

  // 7. Page numbering & footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${settings.storeName || 'SANDIKALE-PROJECT'} • Laporan Analitik & Penjualan`,
      margin,
      pageHeight - 5
    );
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' }
    );
  }

  return doc;
};

export const downloadAnalyticsPDF = (
  orders: Order[],
  settings: StoreSettings,
  options: AnalyticsPDFOptions
) => {
  const doc = generateAnalyticsPDF(orders, settings, options);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Laporan_Analitik_SANDIKALE_${options.period}_${dateStr}.pdf`;
  doc.save(fileName);
};

export const downloadTransactionsPDF = (
  orders: Order[],
  settings: StoreSettings,
  currentUser: User | null,
  filterTitle: string = 'Semua'
) => {
  const doc = generateAnalyticsPDF(orders, settings, {
    period: 'all',
    includeTransactionsList: true,
    currentUser,
  });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Laporan_Transaksi_SANDIKALE_${filterTitle}_${dateStr}.pdf`;
  doc.save(fileName);
};
