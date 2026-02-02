import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TaxiStand } from '../types';

// Extend jsPDF type to include autoTable property from the plugin
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export const generateStandReport = (stand: TaxiStand) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Font ayarları (Türkçe karakter desteği için varsayılan fontlar bazen sorun çıkarabilir, 
  // ancak jspdf modern versiyonlarında UTF-8 desteği iyileştirildi. 
  // Gerekirse özel font eklenebilir, şimdilik varsayılanı kullanıyoruz.)

  // Başlık
  doc.setFontSize(18);
  doc.text(`${stand.name} - Durak Raporu`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Rapor Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`, 14, 26);
  doc.setTextColor(0);

  // 1. Temel Bilgiler Tablosu
  doc.setFontSize(14);
  doc.text("Temel Bilgiler", 14, 38);
  
  const basicData = [
    ["Durum", stand.status],
    ["Kapasite", `${stand.capacity} Araç`],
    ["İlçe / Mahalle", `${stand.district} / ${stand.neighborhood}`],
    ["Adres", stand.address],
    ["Telefon", stand.phone || '-'],
    ["Sorumluluk Alanı", stand.responsibility],
    ["Yazıhane Tipi", stand.officeType]
  ];

  autoTable(doc, {
    startY: 42,
    head: [['Özellik', 'Değer']],
    body: basicData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { font: "helvetica", fontSize: 10 }
  });

  let currentY = doc.lastAutoTable.finalY + 15;

  // 2. UKOME Bilgileri
  doc.setFontSize(14);
  doc.text("Son UKOME Kararı", 14, currentY);
  
  autoTable(doc, {
    startY: currentY + 4,
    head: [['Karar No', 'Tarih', 'Özet']],
    body: [[
        stand.ukomeDecisionNo || '-', 
        stand.ukomeDate ? new Date(stand.ukomeDate).toLocaleDateString('tr-TR') : '-',
        stand.ukomeSummary || 'Özet bilgisi yok.'
    ]],
    theme: 'grid',
    headStyles: { fillColor: [52, 73, 94] }
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // 3. Plaka Listesi
  doc.setFontSize(14);
  doc.text(`Kayıtlı Plakalar (${stand.plates?.length || 0} Adet)`, 14, currentY);
  
  // Plakaları tabloya sığdırmak için matris haline getir (Her satırda 5 plaka)
  const platesRows: string[][] = [];
  const plates = (stand.plates || []).sort();
  let tempRow: string[] = [];
  
  plates.forEach((plate, index) => {
      tempRow.push(plate);
      if (tempRow.length === 5 || index === plates.length - 1) {
          // Satırı 5'e tamamla (boşluklarla)
          while (tempRow.length < 5) tempRow.push("");
          platesRows.push([...tempRow]);
          tempRow = [];
      }
  });
  
  if (platesRows.length === 0) platesRows.push(["Kayıtlı plaka bulunmamaktadır.", "", "", "", ""]);

  autoTable(doc, {
    startY: currentY + 4,
    body: platesRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, fontStyle: 'bold' },
    columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 }
    }
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // 4. Değişiklik Geçmişi
  doc.setFontSize(14);
  doc.text("Değişiklik ve İşlem Geçmişi", 14, currentY);
  
  const historyData = (stand.history || [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map(log => [
        new Date(log.timestamp).toLocaleDateString('tr-TR'),
        log.relatedUkomeNo || 'Manuel',
        log.fieldName,
        log.oldValue.length > 20 ? log.oldValue.substring(0, 20) + '...' : log.oldValue,
        log.newValue.length > 20 ? log.newValue.substring(0, 20) + '...' : log.newValue,
        log.changedBy
    ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Tarih', 'Ref/Karar', 'Alan', 'Eski Değer', 'Yeni Değer', 'Kullanıcı']],
    body: historyData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [142, 68, 173] }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Sayfa ${i} / ${pageCount}`, 190, 290, { align: 'right' });
      doc.text("TaksiYönetim Sistemi tarafından oluşturulmuştur.", 14, 290);
  }

  doc.save(`${stand.name.replace(/\s+/g, '_')}_Detay_Raporu.pdf`);
};

export const generatePlateReport = (
    plate: string, 
    history: any[], 
    currentStand: TaxiStand | null
) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text(`${plate}`, 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Çalışma ve Hareket Raporu`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 36);
    doc.setTextColor(0);

    // Mevcut Durum
    doc.setFontSize(14);
    doc.text("Mevcut Durum", 14, 48);
    
    const statusData = [
        ["Şu Anki Durak", currentStand ? currentStand.name : "Kayıtsız / Boşta"],
        ["Durum", currentStand ? "Aktif Çalışıyor" : "Sistemde Pasif"],
        ["Bölge", currentStand ? `${currentStand.district} / ${currentStand.neighborhood}` : "-"],
        ["Son İşlem", history.length > 0 ? new Date(history[0].date).toLocaleDateString('tr-TR') : "-"]
    ];

    autoTable(doc, {
        startY: 52,
        body: statusData,
        theme: 'plain',
        styles: { fontSize: 11, fontStyle: 'bold', cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 50, textColor: 100 } }
    });

    let currentY = doc.lastAutoTable.finalY + 15;

    // Geçmiş Tablosu
    doc.setFontSize(14);
    doc.text("Durak Hareketleri ve UKOME İşlemleri", 14, currentY);

    const historyData = history.map(item => [
        new Date(item.date).toLocaleDateString('tr-TR'),
        item.standName,
        item.action,
        item.details,
        item.user
    ]);

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Tarih', 'Durak', 'İşlem', 'Detay / Karar No', 'Kullanıcı']],
        body: historyData,
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] }, // Greenish for history
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 255, 240] }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Sayfa ${i} / ${pageCount}`, 190, 290, { align: 'right' });
    }

    doc.save(`${plate.replace(/\s+/g, '')}_Gecmis_Raporu.pdf`);
};