import { Order, ProductionStatus, StoreSettings } from '../types';
import { formatVerificationCode } from './crypto';

export function generateWhatsAppMessage(
  order: Order,
  settings: StoreSettings,
  targetStatus?: ProductionStatus
): { message: string; url: string } {
  const statusToUse = targetStatus || order.productionStatus;
  const verCode = formatVerificationCode(order.tamperChecksum || '');

  let statusTitle = '';
  let statusDescription = '';

  switch (statusToUse) {
    case 'Antrean Desain':
      statusTitle = 'ANTREAN DESAIN (PRA-CETAK)';
      statusDescription =
        'Pesanan Anda telah kami terima dan masuk ke dalam antrean desain. Tim kreatif kami sedang menyiapkan mockup/pracetak dan akan segera menghubungi Anda untuk konfirmasi sebelum proses cetak dimulai.';
      break;
    case 'Proses Cetak':
      statusTitle = 'PROSES PRODUKSI & CETAK SABLON';
      statusDescription =
        'Desain telah disetujui. Saat ini pesanan Anda sedang dalam tahap proses cetak sablon dengan standar kualitas terbaik.';
      break;
    case 'Finishing':
      statusTitle = 'FINISHING & QUALITY CONTROL';
      statusDescription =
        'Proses cetak telah selesai. Saat ini pesanan Anda masuk tahap curing, pengecekan kualitas produk (Quality Control), serta pengemasan rapi.';
      break;
    case 'Siap Ambil':
      statusTitle = 'PESANAN SELESAI & SIAP DIAMBIL';
      statusDescription = `Kabar baik! Seluruh pesanan Anda telah selesai diproduksi dan siap diambil di workshop kami:\n${settings.address}`;
      break;
    case 'Selesai':
      statusTitle = 'TRANSAKSI SELESAI';
      statusDescription = `Pesanan telah diserahterimakan dan transaksi telah selesai. Terima kasih banyak atas kepercayaan Anda kepada ${settings.storeName}.`;
      break;
    default:
      statusTitle = 'PESANAN DIPROSES';
      statusDescription = 'Pesanan Anda saat ini sedang kami proses sesuai antrean kerja.';
  }

  // Format Items List
  const itemsList = order.items
    .map((item, index) => {
      const itemSubtotal = (item.price * item.qty).toLocaleString('id-ID');
      const itemPrice = item.price.toLocaleString('id-ID');
      let line = `${index + 1}. *${item.name}*\n   Jumlah: ${item.qty} pcs x Rp ${itemPrice} = Rp ${itemSubtotal}`;
      if (item.notes && item.notes.trim()) {
        line += `\n   Catatan: ${item.notes.trim()}`;
      }
      return line;
    })
    .join('\n');

  // Format Payment Info
  let paymentDetails = `• Total Biaya      : Rp ${order.total.toLocaleString('id-ID')}`;
  if (order.discount > 0) {
    paymentDetails += `\n• Diskon Potongan  : -Rp ${order.discount.toLocaleString('id-ID')}`;
  }

  if (order.remainingAmount > 0) {
    paymentDetails += `\n• Uang Muka (DP)   : Rp ${order.dpAmount.toLocaleString('id-ID')}`;
    paymentDetails += `\n• Sisa Pelunasan   : Rp ${order.remainingAmount.toLocaleString('id-ID')} (Dibayar saat ambil barang)`;
    paymentDetails += `\n• Status Bayar     : BELUM LUNAS (DP)`;
  } else {
    paymentDetails += `\n• Jumlah Dibayar   : Rp ${order.paidAmount.toLocaleString('id-ID')}`;
    if (order.changeAmount > 0) {
      paymentDetails += `\n• Kembalian        : Rp ${order.changeAmount.toLocaleString('id-ID')}`;
    }
    paymentDetails += `\n• Status Bayar     : LUNAS`;
  }
  paymentDetails += `\n• Metode Bayar     : ${order.paymentMethod}`;

  // Optional order notes section
  let orderNotesSection = '';
  if (order.notes && order.notes.trim()) {
    orderNotesSection = `\n*CATATAN PESANAN:*\n${order.notes.trim()}\n`;
  }

  // Construct Clean, Professional Message without fragile emojis or broken glyphs
  const message = `*NOTA TRANSAKSI & STATUS PESANAN*
*${settings.storeName.toUpperCase()}*
--------------------------------------------------

Kepada Yth.
*${order.customerName}*

Terima kasih telah mempercayakan pesanan sablon & apparel Anda kepada kami. Berikut adalah rincian informasi pesanan Anda:

*STATUS PESANAN:*
*${statusTitle}*
${statusDescription}

*DATA TRANSAKSI:*
• No. Nota  : ${order.id}
• Tanggal   : ${order.displayDate}
• Kasir     : ${order.cashierName}

*RINCIAN ITEM PESANAN:*
${itemsList}
${orderNotesSection}
*RINCIAN PEMBAYARAN:*
${paymentDetails}

*KODE VERIFIKASI KEASLIAN NOTA:*
${verCode}

*KONTAK & WORKSHOP KAMI:*
Alamat    : ${settings.address}
WhatsApp  : ${settings.phone}
Instagram : @${settings.instagram}

--------------------------------------------------
_Pesan ini dibuat dan dikirim otomatis oleh sistem kasir resmi ${settings.storeName}._
_Harap simpan pesan ini sebagai bukti nota transaksi Anda._`;

  // Normalize phone number (Indonesian format)
  let cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('8')) {
    cleanPhone = '62' + cleanPhone;
  } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 0) {
    cleanPhone = '62' + cleanPhone;
  }

  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`;

  return { message, url };
}
