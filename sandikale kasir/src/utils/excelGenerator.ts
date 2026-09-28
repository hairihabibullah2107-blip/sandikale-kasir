import ExcelJS from 'exceljs';
import { Order, StoreSettings, User } from '../types';

export interface AnalyticsExcelOptions {
  period: 'today' | 'week' | 'month' | 'all';
  includeTransactionsList?: boolean;
  currentUser?: User | null;
}

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

const formatCurrencyNumber = (val: number): number => {
  return Math.round(val || 0);
};

export const generateAnalyticsWorkbook = async (
  orders: Order[],
  settings: StoreSettings,
  options: AnalyticsExcelOptions
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.storeName || 'SANDIKALE-PROJECT';
  workbook.lastModifiedBy = options.currentUser?.name || 'Admin Sandikale';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalBilled = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingReceivables = orders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
  const totalOrdersCount = orders.length;

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

  const lunasCount = orders.filter(o => o.paymentStatus === 'Lunas').length;
  const dpCount = orders.filter(o => o.paymentStatus === 'DP').length;

  // -------------------------------------------------------------
  // SHEET 1: RINGKASAN EKSEKUTIF (Presentation & Dashboard View)
  // -------------------------------------------------------------
  const wsSummary = workbook.addWorksheet('Ringkasan Eksekutif', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: 'FF991B1B' } },
  });

  // Setup Column Widths
  wsSummary.columns = [
    { width: 6 },   // A: Spacing / No
    { width: 16 },  // B: Nota / Label
    { width: 22 },  // C: Tanggal / Value
    { width: 25 },  // D: Pelanggan
    { width: 35 },  // E: Rincian Pesanan
    { width: 18 },  // F: Tagihan
    { width: 18 },  // G: Terbayar
    { width: 18 },  // H: Sisa
    { width: 16 },  // I: Metode
    { width: 16 },  // J: Status
    { width: 18 },  // K: Kasir
  ];

  // Helper border styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const cardBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
    left: { style: 'medium', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
    right: { style: 'medium', color: { argb: 'FFCBD5E1' } },
  };

  let rowIdx = 1;

  // Row 1: Brand Accent Bar
  wsSummary.mergeCells(`A${rowIdx}:K${rowIdx}`);
  const accentBar = wsSummary.getCell(`A${rowIdx}`);
  accentBar.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF991B1B' }, // Dark Crimson
  };
  wsSummary.getRow(rowIdx).height = 6;
  rowIdx++;

  // Row 2: Store Name
  wsSummary.mergeCells(`A${rowIdx}:G${rowIdx}`);
  const storeCell = wsSummary.getCell(`A${rowIdx}`);
  storeCell.value = (settings.storeName || 'SANDIKALE - PROJECT').toUpperCase();
  storeCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  storeCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Store Contacts in right columns
  wsSummary.mergeCells(`H${rowIdx}:K${rowIdx}`);
  const contactCell1 = wsSummary.getCell(`H${rowIdx}`);
  contactCell1.value = settings.address || 'Workshop Apparel & Sablon';
  contactCell1.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  contactCell1.alignment = { vertical: 'middle', horizontal: 'right' };
  wsSummary.getRow(rowIdx).height = 24;
  rowIdx++;

  // Row 3: Subtitle & Contact line 2
  wsSummary.mergeCells(`A${rowIdx}:G${rowIdx}`);
  const titleCell = wsSummary.getCell(`A${rowIdx}`);
  titleCell.value = 'LAPORAN RESMI ANALITIK & KEUANGAN PENJUALAN';
  titleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFB91C1C' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  wsSummary.mergeCells(`H${rowIdx}:K${rowIdx}`);
  const contactCell2 = wsSummary.getCell(`H${rowIdx}`);
  contactCell2.value = `WA: ${settings.phone || '-'} • IG: @${settings.instagram || 'sandikale'}`;
  contactCell2.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  contactCell2.alignment = { vertical: 'middle', horizontal: 'right' };
  wsSummary.getRow(rowIdx).height = 18;
  rowIdx++;

  // Row 4: Empty separator
  wsSummary.getRow(rowIdx).height = 6;
  rowIdx++;

  // Metadata Box (Rows 5 & 6)
  // Row 5: Metadata 1
  wsSummary.getCell(`A${rowIdx}`).value = 'Periode:';
  wsSummary.getCell(`A${rowIdx}`).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
  wsSummary.mergeCells(`B${rowIdx}:E${rowIdx}`);
  wsSummary.getCell(`B${rowIdx}`).value = getPeriodLabel(options.period);
  wsSummary.getCell(`B${rowIdx}`).font = { bold: true, size: 9, color: { argb: 'FF0F172A' } };

  wsSummary.getCell(`F${rowIdx}`).value = 'Tanggal Cetak:';
  wsSummary.getCell(`F${rowIdx}`).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
  wsSummary.mergeCells(`G${rowIdx}:K${rowIdx}`);
  wsSummary.getCell(`G${rowIdx}`).value = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
  wsSummary.getCell(`G${rowIdx}`).font = { size: 9, color: { argb: 'FF0F172A' } };
  wsSummary.getRow(rowIdx).height = 18;
  rowIdx++;

  // Row 6: Metadata 2
  wsSummary.getCell(`A${rowIdx}`).value = 'Oleh:';
  wsSummary.getCell(`A${rowIdx}`).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
  wsSummary.mergeCells(`B${rowIdx}:E${rowIdx}`);
  const printAuthor = options.currentUser
    ? `${options.currentUser.name} (${options.currentUser.role.toUpperCase()})`
    : 'Admin Sistem Sandikale';
  wsSummary.getCell(`B${rowIdx}`).value = printAuthor;
  wsSummary.getCell(`B${rowIdx}`).font = { size: 9, color: { argb: 'FF0F172A' } };

  wsSummary.getCell(`F${rowIdx}`).value = 'Cakupan:';
  wsSummary.getCell(`F${rowIdx}`).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
  wsSummary.mergeCells(`G${rowIdx}:K${rowIdx}`);
  wsSummary.getCell(`G${rowIdx}`).value = `${totalOrdersCount} Nota (${lunasCount} Lunas, ${dpCount} Sisa DP)`;
  wsSummary.getCell(`G${rowIdx}`).font = { size: 9, color: { argb: 'FF0F172A' } };
  wsSummary.getRow(rowIdx).height = 18;
  rowIdx++;

  // Style metadata area background
  for (let r = rowIdx - 2; r < rowIdx; r++) {
    for (let c = 1; c <= 11; c++) {
      const cell = wsSummary.getRow(r).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
      cell.border = thinBorder;
    }
  }

  // Row 7: Empty row
  wsSummary.getRow(rowIdx).height = 10;
  rowIdx++;

  // Section 1 Header: Ringkasan Eksekutif Finansial
  wsSummary.mergeCells(`A${rowIdx}:K${rowIdx}`);
  const sec1Header = wsSummary.getCell(`A${rowIdx}`);
  sec1Header.value = '1. RINGKASAN EKSEKUTIF FINANSIAL';
  sec1Header.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  sec1Header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  sec1Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsSummary.getRow(rowIdx).height = 22;
  rowIdx++;

  // KPI CARDS LAYOUT:
  // Card 1: Omzet Masuk (A-C)
  // Card 2: Estimasi Laba Kotor (D-E)
  // Card 3: Piutang / Sisa DP (F-H)
  // Card 4: Total Penjualan & Rerata (I-K)
  const cardStartRow = rowIdx;
  
  // Title Row for Cards
  wsSummary.mergeCells(`A${rowIdx}:C${rowIdx}`);
  const c1Title = wsSummary.getCell(`A${rowIdx}`);
  c1Title.value = 'OMZET MASUK (CASH IN)';
  c1Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
  c1Title.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`D${rowIdx}:E${rowIdx}`);
  const c2Title = wsSummary.getCell(`D${rowIdx}`);
  c2Title.value = 'ESTIMASI LABA KOTOR';
  c2Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF166534' } };
  c2Title.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`F${rowIdx}:H${rowIdx}`);
  const c3Title = wsSummary.getCell(`F${rowIdx}`);
  c3Title.value = 'PIUTANG / SISA DP';
  c3Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };
  c3Title.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`I${rowIdx}:K${rowIdx}`);
  const c4Title = wsSummary.getCell(`I${rowIdx}`);
  c4Title.value = 'TOTAL NILAI PENJUALAN';
  c4Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  c4Title.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(rowIdx).height = 18;
  rowIdx++;

  // Amount Row for Cards
  wsSummary.mergeCells(`A${rowIdx}:C${rowIdx}`);
  const c1Val = wsSummary.getCell(`A${rowIdx}`);
  c1Val.value = formatCurrencyNumber(totalRevenue);
  c1Val.numFmt = '"Rp "#,##0';
  c1Val.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF991B1B' } };
  c1Val.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`D${rowIdx}:E${rowIdx}`);
  const c2Val = wsSummary.getCell(`D${rowIdx}`);
  c2Val.value = formatCurrencyNumber(estimatedGrossProfit);
  c2Val.numFmt = '"Rp "#,##0';
  c2Val.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF166534' } };
  c2Val.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`F${rowIdx}:H${rowIdx}`);
  const c3Val = wsSummary.getCell(`F${rowIdx}`);
  c3Val.value = formatCurrencyNumber(pendingReceivables);
  c3Val.numFmt = '"Rp "#,##0';
  c3Val.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF92400E' } };
  c3Val.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`I${rowIdx}:K${rowIdx}`);
  const c4Val = wsSummary.getCell(`I${rowIdx}`);
  c4Val.value = formatCurrencyNumber(totalBilled);
  c4Val.numFmt = '"Rp "#,##0';
  c4Val.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
  c4Val.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(rowIdx).height = 24;
  rowIdx++;

  // Footnote Row for Cards
  wsSummary.mergeCells(`A${rowIdx}:C${rowIdx}`);
  const c1Sub = wsSummary.getCell(`A${rowIdx}`);
  c1Sub.value = 'Kas riil diterima masuk';
  c1Sub.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } };
  c1Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`D${rowIdx}:E${rowIdx}`);
  const c2Sub = wsSummary.getCell(`D${rowIdx}`);
  c2Sub.value = 'Omzet dikurangi HPP';
  c2Sub.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } };
  c2Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`F${rowIdx}:H${rowIdx}`);
  const c3Sub = wsSummary.getCell(`F${rowIdx}`);
  c3Sub.value = 'Belum dilunasi pelanggan';
  c3Sub.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } };
  c3Sub.alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells(`I${rowIdx}:K${rowIdx}`);
  const c4Sub = wsSummary.getCell(`I${rowIdx}`);
  c4Sub.value = `Rerata: Rp ${avgOrderValue.toLocaleString('id-ID')} / nota`;
  c4Sub.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } };
  c4Sub.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(rowIdx).height = 16;
  rowIdx++;

  // Apply card backgrounds and borders
  for (let r = cardStartRow; r < rowIdx; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = wsSummary.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      cell.border = thinBorder;
    }
    for (let c = 4; c <= 5; c++) {
      const cell = wsSummary.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      cell.border = thinBorder;
    }
    for (let c = 6; c <= 8; c++) {
      const cell = wsSummary.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      cell.border = thinBorder;
    }
    for (let c = 9; c <= 11; c++) {
      const cell = wsSummary.getRow(r).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = thinBorder;
    }
  }

  // Row separator
  wsSummary.getRow(rowIdx).height = 10;
  rowIdx++;

  // Section 2 Header: Distribusi Pembayaran & Top Produk
  wsSummary.mergeCells(`A${rowIdx}:K${rowIdx}`);
  const sec2Header = wsSummary.getCell(`A${rowIdx}`);
  sec2Header.value = '2. DISTRIBUSI PEMBAYARAN & PRODUK TERLARIS';
  sec2Header.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  sec2Header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  sec2Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsSummary.getRow(rowIdx).height = 22;
  rowIdx++;

  // Side-by-side tables:
  // Left Table: Metode Pembayaran (Cols A to E)
  // Right Table: Top Produk Terlaris (Cols G to K)
  const tableHeaderRow = rowIdx;

  // Payment Table Header
  wsSummary.mergeCells(`A${rowIdx}:B${rowIdx}`);
  wsSummary.getCell(`A${rowIdx}`).value = 'Metode Pembayaran';
  wsSummary.getCell(`C${rowIdx}`).value = 'Jumlah';
  wsSummary.getCell(`D${rowIdx}`).value = 'Nominal Diterima';
  wsSummary.getCell(`E${rowIdx}`).value = 'Porsi (%)';

  // Gap Column F
  wsSummary.getCell(`F${rowIdx}`).value = '';

  // Top Products Table Header
  wsSummary.getCell(`G${rowIdx}`).value = 'No';
  wsSummary.mergeCells(`H${rowIdx}:I${rowIdx}`);
  wsSummary.getCell(`H${rowIdx}`).value = 'Produk / Layanan Terlaris';
  wsSummary.getCell(`J${rowIdx}`).value = 'Qty';
  wsSummary.getCell(`K${rowIdx}`).value = 'Total Penjualan';

  // Style payment headers
  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    const cell = wsSummary.getCell(`${col}${tableHeaderRow}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });

  // Style product headers
  ['G', 'H', 'I', 'J', 'K'].forEach(col => {
    const cell = wsSummary.getCell(`${col}${tableHeaderRow}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });
  wsSummary.getRow(rowIdx).height = 20;
  rowIdx++;

  const paymentEntries = Object.entries(paymentBreakdown);
  const maxSubRows = Math.max(paymentEntries.length, topProducts.length, 1);

  for (let i = 0; i < maxSubRows; i++) {
    const currRow = rowIdx;
    wsSummary.getRow(currRow).height = 19;
    const isZebra = i % 2 === 1;
    const zebraBg = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';

    // Left side: Payment
    if (i < paymentEntries.length) {
      const [method, data] = paymentEntries[i];
      const porsi = totalRevenue > 0 ? (data.amount / totalRevenue) : 0;

      wsSummary.mergeCells(`A${currRow}:B${currRow}`);
      wsSummary.getCell(`A${currRow}`).value = method;
      wsSummary.getCell(`A${currRow}`).font = { size: 9, bold: true, color: { argb: 'FF1E293B' } };
      wsSummary.getCell(`A${currRow}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      wsSummary.getCell(`C${currRow}`).value = data.count;
      wsSummary.getCell(`C${currRow}`).font = { size: 9, color: { argb: 'FF334155' } };
      wsSummary.getCell(`C${currRow}`).alignment = { vertical: 'middle', horizontal: 'center' };

      wsSummary.getCell(`D${currRow}`).value = formatCurrencyNumber(data.amount);
      wsSummary.getCell(`D${currRow}`).numFmt = '"Rp "#,##0';
      wsSummary.getCell(`D${currRow}`).font = { size: 9, bold: true, color: { argb: 'FF0F172A' } };
      wsSummary.getCell(`D${currRow}`).alignment = { vertical: 'middle', horizontal: 'right' };

      wsSummary.getCell(`E${currRow}`).value = porsi;
      wsSummary.getCell(`E${currRow}`).numFmt = '0.0%';
      wsSummary.getCell(`E${currRow}`).font = { size: 9, color: { argb: 'FF475569' } };
      wsSummary.getCell(`E${currRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    } else if (paymentEntries.length === 0 && i === 0) {
      wsSummary.mergeCells(`A${currRow}:E${currRow}`);
      wsSummary.getCell(`A${currRow}`).value = 'Belum ada data transaksi';
      wsSummary.getCell(`A${currRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
      wsSummary.getCell(`A${currRow}`).font = { italic: true, size: 9, color: { argb: 'FF94A3B8' } };
    }

    // Apply styles to Left side
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      const cell = wsSummary.getCell(`${col}${currRow}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      cell.border = thinBorder;
    });

    // Right side: Top Products
    if (i < topProducts.length) {
      const [pName, pData] = topProducts[i];
      wsSummary.getCell(`G${currRow}`).value = `#${i + 1}`;
      wsSummary.getCell(`G${currRow}`).font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
      wsSummary.getCell(`G${currRow}`).alignment = { vertical: 'middle', horizontal: 'center' };

      wsSummary.mergeCells(`H${currRow}:I${currRow}`);
      wsSummary.getCell(`H${currRow}`).value = pName;
      wsSummary.getCell(`H${currRow}`).font = { size: 9, color: { argb: 'FF1E293B' } };
      wsSummary.getCell(`H${currRow}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      wsSummary.getCell(`J${currRow}`).value = `${pData.qty} pcs`;
      wsSummary.getCell(`J${currRow}`).font = { size: 9, bold: true, color: { argb: 'FF0F172A' } };
      wsSummary.getCell(`J${currRow}`).alignment = { vertical: 'middle', horizontal: 'center' };

      wsSummary.getCell(`K${currRow}`).value = formatCurrencyNumber(pData.revenue);
      wsSummary.getCell(`K${currRow}`).numFmt = '"Rp "#,##0';
      wsSummary.getCell(`K${currRow}`).font = { size: 9, bold: true, color: { argb: 'FF0F172A' } };
      wsSummary.getCell(`K${currRow}`).alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (topProducts.length === 0 && i === 0) {
      wsSummary.mergeCells(`G${currRow}:K${currRow}`);
      wsSummary.getCell(`G${currRow}`).value = 'Belum ada produk terjual';
      wsSummary.getCell(`G${currRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
      wsSummary.getCell(`G${currRow}`).font = { italic: true, size: 9, color: { argb: 'FF94A3B8' } };
    }

    // Apply styles to Right side
    ['G', 'H', 'I', 'J', 'K'].forEach(col => {
      const cell = wsSummary.getCell(`${col}${currRow}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      cell.border = thinBorder;
    });

    rowIdx++;
  }

  // Row separator
  wsSummary.getRow(rowIdx).height = 10;
  rowIdx++;

  // Section 3: Rincian Riwayat Transaksi Lengkap
  if (options.includeTransactionsList !== false) {
    wsSummary.mergeCells(`A${rowIdx}:K${rowIdx}`);
    const sec3Header = wsSummary.getCell(`A${rowIdx}`);
    sec3Header.value = `3. RINCIAN RIWAYAT TRANSAKSI LENGKAP (${orders.length} TRANSAKSI)`;
    sec3Header.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sec3Header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    sec3Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    wsSummary.getRow(rowIdx).height = 22;
    rowIdx++;

    // Table Header
    const transHeaderRow = rowIdx;
    const transHeaders = [
      { col: 'A', title: 'No' },
      { col: 'B', title: 'No. Nota' },
      { col: 'C', title: 'Tanggal & Waktu' },
      { col: 'D', title: 'Pelanggan (WhatsApp)' },
      { col: 'E', title: 'Rincian Pesanan Item' },
      { col: 'F', title: 'Total Tagihan' },
      { col: 'G', title: 'Nominal Bayar' },
      { col: 'H', title: 'Sisa Piutang' },
      { col: 'I', title: 'Metode' },
      { col: 'J', title: 'Status' },
      { col: 'K', title: 'Kasir / Staf' },
    ];

    transHeaders.forEach(th => {
      const cell = wsSummary.getCell(`${th.col}${transHeaderRow}`);
      cell.value = th.title;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = thinBorder;
    });
    wsSummary.getRow(transHeaderRow).height = 24;
    rowIdx++;

    const transStartRow = rowIdx;

    if (orders.length === 0) {
      wsSummary.mergeCells(`A${rowIdx}:K${rowIdx}`);
      const emptyCell = wsSummary.getCell(`A${rowIdx}`);
      emptyCell.value = 'Tidak ada transaksi pada periode / filter yang dipilih.';
      emptyCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      emptyCell.border = thinBorder;
      wsSummary.getRow(rowIdx).height = 22;
      rowIdx++;
    } else {
      orders.forEach((o, idx) => {
        const r = rowIdx;
        const isZebra = idx % 2 === 1;
        const zebraBg = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';
        const itemsText = o.items.map(it => `${it.qty}x ${it.name}`).join(', ');
        const customerText = o.customerPhone ? `${o.customerName}\n(${o.customerPhone})` : o.customerName;

        wsSummary.getCell(`A${r}`).value = idx + 1;
        wsSummary.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };

        wsSummary.getCell(`B${r}`).value = o.id;
        wsSummary.getCell(`B${r}`).font = { bold: true, color: { argb: 'FF0F172A' } };
        wsSummary.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'center' };

        wsSummary.getCell(`C${r}`).value = o.displayDate;
        wsSummary.getCell(`C${r}`).alignment = { vertical: 'middle', horizontal: 'center' };

        wsSummary.getCell(`D${r}`).value = customerText;
        wsSummary.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        wsSummary.getCell(`E${r}`).value = itemsText;
        wsSummary.getCell(`E${r}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        wsSummary.getCell(`F${r}`).value = formatCurrencyNumber(o.total);
        wsSummary.getCell(`F${r}`).numFmt = '"Rp "#,##0';
        wsSummary.getCell(`F${r}`).font = { bold: true, color: { argb: 'FF0F172A' } };
        wsSummary.getCell(`F${r}`).alignment = { vertical: 'middle', horizontal: 'right' };

        wsSummary.getCell(`G${r}`).value = formatCurrencyNumber(o.paidAmount);
        wsSummary.getCell(`G${r}`).numFmt = '"Rp "#,##0';
        wsSummary.getCell(`G${r}`).font = { bold: true, color: { argb: 'FF166534' } };
        wsSummary.getCell(`G${r}`).alignment = { vertical: 'middle', horizontal: 'right' };

        wsSummary.getCell(`H${r}`).value = formatCurrencyNumber(o.remainingAmount);
        wsSummary.getCell(`H${r}`).numFmt = '"Rp "#,##0';
        wsSummary.getCell(`H${r}`).font = {
          bold: o.remainingAmount > 0,
          color: { argb: o.remainingAmount > 0 ? 'FF991B1B' : 'FF64748B' },
        };
        wsSummary.getCell(`H${r}`).alignment = { vertical: 'middle', horizontal: 'right' };

        wsSummary.getCell(`I${r}`).value = o.paymentMethod || 'Cash';
        wsSummary.getCell(`I${r}`).alignment = { vertical: 'middle', horizontal: 'center' };

        // Badge style for status
        const statusCell = wsSummary.getCell(`J${r}`);
        statusCell.value = o.paymentStatus;
        statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
        statusCell.font = {
          bold: true,
          color: { argb: o.paymentStatus === 'Lunas' ? 'FF166534' : 'FFB45309' },
        };

        wsSummary.getCell(`K${r}`).value = o.cashierName || 'Kasir';
        wsSummary.getCell(`K${r}`).alignment = { vertical: 'middle', horizontal: 'left' };

        // Apply row border and zebra fill
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
          const cell = wsSummary.getCell(`${col}${r}`);
          cell.border = thinBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
          if (!cell.font) {
            cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' } };
          } else {
            cell.font = { ...cell.font, name: 'Calibri', size: 9 };
          }
        });

        wsSummary.getRow(r).height = itemsText.length > 40 ? 28 : 20;
        rowIdx++;
      });

      // Summary Totals Row (Accounting Style with Double Bottom Border)
      const summaryRow = rowIdx;
      wsSummary.mergeCells(`A${summaryRow}:E${summaryRow}`);
      const sumLabel = wsSummary.getCell(`A${summaryRow}`);
      sumLabel.value = 'TOTAL KESELURUHAN:';
      sumLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      sumLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

      // Total Tagihan formula
      const sumTagihan = wsSummary.getCell(`F${summaryRow}`);
      sumTagihan.value = { formula: `SUM(F${transStartRow}:F${summaryRow - 1})`, result: formatCurrencyNumber(totalBilled) };
      sumTagihan.numFmt = '"Rp "#,##0';
      sumTagihan.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      sumTagihan.alignment = { vertical: 'middle', horizontal: 'right' };

      // Total Paid formula
      const sumPaid = wsSummary.getCell(`G${summaryRow}`);
      sumPaid.value = { formula: `SUM(G${transStartRow}:G${summaryRow - 1})`, result: formatCurrencyNumber(totalRevenue) };
      sumPaid.numFmt = '"Rp "#,##0';
      sumPaid.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
      sumPaid.alignment = { vertical: 'middle', horizontal: 'right' };

      // Total Remaining formula
      const sumRemaining = wsSummary.getCell(`H${summaryRow}`);
      sumRemaining.value = { formula: `SUM(H${transStartRow}:H${summaryRow - 1})`, result: formatCurrencyNumber(pendingReceivables) };
      sumRemaining.numFmt = '"Rp "#,##0';
      sumRemaining.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      sumRemaining.alignment = { vertical: 'middle', horizontal: 'right' };

      // Empty rest of row
      wsSummary.getCell(`I${summaryRow}`).value = '';
      wsSummary.getCell(`J${summaryRow}`).value = '';
      wsSummary.getCell(`K${summaryRow}`).value = '';

      const totalBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
        const cell = wsSummary.getCell(`${col}${summaryRow}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = totalBorder;
      });

      wsSummary.getRow(summaryRow).height = 24;
      rowIdx++;
    }

    // Row separator
    wsSummary.getRow(rowIdx).height = 12;
    rowIdx++;
  }

  // Section 4: Signatures & Digital Integrity Endorsement (Mirrors PDF!)
  const sigStartRow = rowIdx;
  wsSummary.mergeCells(`B${sigStartRow}:D${sigStartRow}`);
  const sig1Head = wsSummary.getCell(`B${sigStartRow}`);
  sig1Head.value = 'Dibuat & Diverifikasi Oleh:';
  sig1Head.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
  sig1Head.alignment = { vertical: 'middle', horizontal: 'center' };

  wsSummary.mergeCells(`H${sigStartRow}:J${sigStartRow}`);
  const sig2Head = wsSummary.getCell(`H${sigStartRow}`);
  sig2Head.value = 'Mengetahui / Disetujui Oleh:';
  sig2Head.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
  sig2Head.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(sigStartRow).height = 18;
  rowIdx += 4; // Space for physical signature / seal

  const sigNameRow = rowIdx;
  wsSummary.mergeCells(`B${sigNameRow}:D${sigNameRow}`);
  const sig1Name = wsSummary.getCell(`B${sigNameRow}`);
  sig1Name.value = (options.currentUser?.name || 'Kasir / Staf Administrasi').toUpperCase();
  sig1Name.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' }, underline: true };
  sig1Name.alignment = { vertical: 'middle', horizontal: 'center' };

  wsSummary.mergeCells(`H${sigNameRow}:J${sigNameRow}`);
  const sig2Name = wsSummary.getCell(`H${sigNameRow}`);
  sig2Name.value = 'OWNER / MANAJEMEN SANDIKALE';
  sig2Name.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' }, underline: true };
  sig2Name.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(sigNameRow).height = 20;
  rowIdx++;

  // System security disclaimer
  wsSummary.mergeCells(`A${rowIdx}:K${rowIdx}`);
  const disclaimCell = wsSummary.getCell(`A${rowIdx}`);
  disclaimCell.value = '• Dokumen resmi ini di-generate otomatis oleh Sistem Kasir & Produksi SANDIKALE-PROJECT dengan segel integritas data valid •';
  disclaimCell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
  disclaimCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(rowIdx).height = 18;

  // -------------------------------------------------------------
  // SHEET 2: DATABASE TRANSAKSI (Filterable & Raw Data View)
  // -------------------------------------------------------------
  const wsData = workbook.addWorksheet('Data Transaksi', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    properties: { tabColor: { argb: 'FF1E293B' } },
  });

  wsData.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'No. Nota', key: 'id', width: 16 },
    { header: 'Tanggal & Waktu', key: 'date', width: 22 },
    { header: 'Nama Pelanggan', key: 'customerName', width: 24 },
    { header: 'No. WhatsApp', key: 'customerPhone', width: 18 },
    { header: 'Daftar Item Pesanan', key: 'items', width: 36 },
    { header: 'Total Tagihan (Rp)', key: 'total', width: 18 },
    { header: 'Nominal Terbayar (Rp)', key: 'paidAmount', width: 18 },
    { header: 'Sisa Piutang (Rp)', key: 'remainingAmount', width: 18 },
    { header: 'Metode Pembayaran', key: 'paymentMethod', width: 18 },
    { header: 'Status Pembayaran', key: 'paymentStatus', width: 16 },
    { header: 'Status Produksi', key: 'productionStatus', width: 16 },
    { header: 'Kasir / Operator', key: 'cashierName', width: 18 },
  ];

  // Style Header Row for Sheet 2
  const dataHeaderRow = wsData.getRow(1);
  dataHeaderRow.height = 25;
  dataHeaderRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });

  // Enable AutoFilter on Data Sheet
  wsData.autoFilter = {
    from: 'A1',
    to: 'M1',
  };

  // Add Data Rows to Sheet 2
  orders.forEach((o, index) => {
    const row = wsData.addRow({
      no: index + 1,
      id: o.id,
      date: o.displayDate,
      customerName: o.customerName,
      customerPhone: o.customerPhone || '-',
      items: o.items.map(it => `${it.qty}x ${it.name}`).join('; '),
      total: formatCurrencyNumber(o.total),
      paidAmount: formatCurrencyNumber(o.paidAmount),
      remainingAmount: formatCurrencyNumber(o.remainingAmount),
      paymentMethod: o.paymentMethod || 'Cash',
      paymentStatus: o.paymentStatus,
      productionStatus: o.productionStatus || '-',
      cashierName: o.cashierName || 'Kasir',
    });

    row.height = 20;
    const isZebra = index % 2 === 1;
    const zebraBg = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' } };

      // Number alignments & formats
      if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 10 || colNumber === 11 || colNumber === 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 7 || colNumber === 8 || colNumber === 9) {
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (colNumber === 7) cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
        if (colNumber === 8) cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF166534' } };
        if (colNumber === 9 && o.remainingAmount > 0) {
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  return workbook;
};

export const downloadAnalyticsExcel = async (
  orders: Order[],
  settings: StoreSettings,
  options: AnalyticsExcelOptions
) => {
  const workbook = await generateAnalyticsWorkbook(orders, settings, options);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  anchor.download = `Laporan_Analitik_SANDIKALE_${options.period}_${dateStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

export const downloadTransactionsExcel = async (
  orders: Order[],
  settings: StoreSettings,
  currentUser: User | null,
  filterTitle: string = 'Semua'
) => {
  const workbook = await generateAnalyticsWorkbook(orders, settings, {
    period: 'all',
    includeTransactionsList: true,
    currentUser,
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  anchor.download = `Laporan_Transaksi_SANDIKALE_${filterTitle}_${dateStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};
