import React, { useMemo } from 'react';
import { TaxiStand, ChangeLog } from '../types';
import { ArrowLeft, MapPin, Phone, Car, FileText, History, ArrowRight, Building2, ShieldCheck, Info, Clock, FileDown, CheckCircle2 } from 'lucide-react';
import { generateStandReport } from '../services/reportService';
import StandMap from './StandMap';

interface StandDetailsProps {
  stand: TaxiStand;
  onBack: () => void;
  onRevise: (stand: TaxiStand) => void;
  onViewHistory: (ukomeNo?: string) => void;
}

const StandDetails: React.FC<StandDetailsProps> = ({ stand, onBack, onRevise, onViewHistory }) => {
  
  // Geçmiş kayıtlarını grupla
  const groupedHistory = useMemo(() => {
    const rawHistory = [...(stand.history || [])];
    const groups: Record<string, {
        id: string;
        timestamp: string;
        ukomeNo?: string;
        ukomeDate?: string;
        user: string;
        changes: ChangeLog[];
    }> = {};

    rawHistory.forEach(log => {
        // Gruplama anahtarı: Varsa UKOME No, yoksa Timestamp (Saniye bazlı hassasiyet yeterli)
        const key = log.relatedUkomeNo ? `UKOME_${log.relatedUkomeNo}` : `MANUAL_${log.timestamp}`;
        
        if (!groups[key]) {
            groups[key] = {
                id: key,
                timestamp: log.timestamp,
                ukomeNo: log.relatedUkomeNo,
                ukomeDate: log.relatedUkomeDate,
                user: log.changedBy,
                changes: []
            };
        }
        groups[key].changes.push(log);
    });

    return Object.values(groups).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [stand.history]);

  const handleDownloadReport = () => {
    // generateStandReport(stand);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-2 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Listeye Dön
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            {stand.name}
            <span className={`text-sm px-3 py-1 rounded-full border ${
               stand.status === 'Aktif' 
               ? 'bg-green-50 text-green-700 border-green-200' 
               : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {stand.status}
            </span>
          </h1>
          <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm">
             <MapPin size={14} /> {stand.district} / {stand.city}
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button
            disabled
            onClick={handleDownloadReport}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-400 font-medium rounded-lg shadow-sm flex items-center gap-2 cursor-not-allowed opacity-60"
            title="Şu an hizmet dışı"
            >
            <FileDown size={18} />
            Durak Raporu
            </button>
            <button
            onClick={() => onRevise(stand)}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
            <FileText size={18} />
            Revize Et (UKOME)
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General Info */}
        <div className="lg:col-span-2 space-y-6">
           {/* Basic Info Card */}
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Info size={18} className="text-blue-500" /> Temel Bilgiler
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Durak Adı</label>
                    <div className="text-slate-900 font-medium mt-1">{stand.name}</div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Telefon</label>
                    <div className="text-slate-900 font-medium mt-1 flex items-center gap-2">
                       <Phone size={14} className="text-slate-400" />
                       {stand.phone || '-'}
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Yazıhane Tipi</label>
                    <div className="text-slate-900 font-medium mt-1 flex items-center gap-2">
                       <Building2 size={14} className="text-slate-400" />
                       {stand.officeType}
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Sorumluluk Alanı</label>
                    <div className="text-slate-900 font-medium mt-1 flex items-center gap-2">
                       <ShieldCheck size={14} className="text-slate-400" />
                       {stand.responsibility}
                    </div>
                 </div>
                 <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Açık Adres</label>
                    <div className="text-slate-900 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                       {stand.address}
                    </div>
                 </div>
                 {stand.notes && (
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Notlar</label>
                        <div className="text-slate-700 mt-1 text-sm">{stand.notes}</div>
                    </div>
                 )}
              </div>
           </div>

           {/* Map Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                         <MapPin size={18} className="text-red-500" /> Konum
                    </h3>
                </div>
                <div className="h-[300px] w-full relative">
                     {stand.location ? (
                        <StandMap stands={[stand]} />
                     ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50">Konum bilgisi yok.</div>
                     )}
                </div>
            </div>

           {/* History Table (Updated: Clickable Rows, No Date Column) */}
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <History size={18} className="text-purple-500" /> Revize Geçmişi
                        </h3>
                    </div>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md">
                        {groupedHistory.length} Kayıt
                    </span>
                </div>
              <div className="overflow-x-auto">
                 {groupedHistory.length > 0 ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-600">UKOME Karar No</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Karar Tarihi</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Açıklama</th>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-right">Görüntüle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedHistory.map((group) => {
                                // Find summary in changes or use generic
                                const summaryLog = group.changes.find(c => c.fieldName === 'ukomeSummary');
                                const summaryText = summaryLog ? summaryLog.newValue : (group.changes.length > 0 ? '-' : 'Değişiklik Yok');
                                
                                return (
                                    <tr 
                                        key={group.id} 
                                        onClick={() => onViewHistory(group.ukomeNo)}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        title="Bu kararın detaylarını ve durak üzerindeki etkisini görmek için tıklayın"
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {group.ukomeNo || 'Manuel Düzenleme'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {group.ukomeDate ? new Date(group.ukomeDate).toLocaleDateString('tr-TR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                            {summaryText}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity">
                                                 <span className="text-xs font-semibold">İncele</span>
                                                 <ArrowRight size={16} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 ) : (
                    <div className="p-8 text-center text-slate-400">
                        Bu durak için henüz bir değişiklik kaydı bulunmuyor.
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Right Column: Plates & Current Status */}
        <div className="space-y-6">
            {/* Plates Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
                    <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                        <Car size={18} /> Araç Plakaları
                    </h3>
                 </div>
                 <div className="p-6">
                    <div className="flex justify-between items-center mb-4 text-sm text-slate-500">
                        <span>Park Kapasitesi: <strong className="text-slate-900">{stand.capacity}</strong></span>
                        <span>Kayıtlı: <strong className="text-blue-600">{stand.plates?.length || 0}</strong></span>
                    </div>
                    {stand.plates && stand.plates.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {stand.plates.map((plate, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 text-center py-2 rounded font-mono font-bold text-slate-800 text-sm">
                                    {plate}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic text-center py-4">Kayıtlı plaka yok.</p>
                    )}
                 </div>
            </div>

            {/* Current UKOME Status */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <FileText size={18} /> Son UKOME Durumu
                </h3>
                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-blue-600/70 font-semibold uppercase mb-1">Karar Numarası</div>
                        <div className="text-lg font-bold text-blue-900">{stand.ukomeDecisionNo || '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-blue-600/70 font-semibold uppercase mb-1">Karar Tarihi</div>
                        <div className="text-sm font-medium text-blue-800">
                            {stand.ukomeDate ? new Date(stand.ukomeDate).toLocaleDateString('tr-TR') : '-'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-blue-600/70 font-semibold uppercase mb-1">Karar Özeti</div>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            {stand.ukomeSummary || 'Özet bilgisi girilmemiş.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// Helper Icon Component for internal use
const CalendarIcon = ({ size }: { size: number }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );

export default StandDetails;