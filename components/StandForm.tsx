import React, { useState, useEffect } from 'react';
import { TaxiStand, StandStatus } from '../types';
import { Save, X, MapPin, Phone, FileText, Loader2, Sparkles, Wand2, Car, Info } from 'lucide-react';
import { generateDescriptionWithAI } from '../services/geminiService';
import LocationPicker from './LocationPicker';

interface StandFormProps {
  initialData?: TaxiStand;
  existingStands?: TaxiStand[];
  onSave: (stand: TaxiStand) => Promise<void> | void;
  onCancel: () => void;
}

// MOCK DATA FOR IZMIR
const IZMIR_DATA: any = {
  "Konak": {
    "Alsancak": ["Kıbrıs Şehitleri Cad.", "Talatpaşa Bulv.", "1456. Sokak", "Plevne Bulv."],
    "Göztepe": ["Mithatpaşa Cad.", "Susuzdede Parkı", "100. Sokak", "Mustafa Kemal Sahil Bulv."],
    "Pasaport": ["Cumhuriyet Bulv.", "Akdeniz Cad.", "1382. Sokak"],
    "Mimar Sinan": ["Şair Eşref Bulv.", "Ziya Gökalp Bulv."],
    "Kültür": ["Şevket Özçelik Sok.", "1390. Sokak"]
  },
  "Karşıyaka": {
    "Bostanlı": ["Cemal Gürsel Cad.", "Şehitler Bulv.", "2010. Sokak", "Bostanlı İskelesi"],
    "Mavişehir": ["Cahar Dudayev Bulv.", "Aziz Nesin Bulv.", "2040. Sokak"],
    "Çarşı": ["Kemalpaşa Cad.", "Salah Birsel Sok.", "1710. Sokak"],
    "Bahçelievler": ["Zübeyde Hanım Cad.", "1671. Sokak"]
  },
  "Bornova": {
    "Özkanlar": ["Mustafa Kemal Cad.", "Sakarya Cad.", "252. Sokak"],
    "Küçükpark": ["Süvari Cad.", "Zafer Cad.", "160. Sokak"],
    "Kazımdirik": ["Gediz Cad.", "372. Sokak"]
  },
  "Buca": {
    "Şirinyer": ["Menderes Cad.", "Koşuyolu Cad.", "Forbes Cad."],
    "Tınaztepe": ["Doğuş Cad.", "202. Sokak"],
  }
};

const OFFICE_TYPES = [
  "TİP1",
  "TİP2",
  "TİP3",
  "DİĞER",
  "YOK"
];

const RESPONSIBILITIES = [
  "Büyükşehir",
  "İlçe",
  "Özel Mülkiyet",
  "Kamu",
  "Diğer"
];

const StandForm: React.FC<StandFormProps> = ({ initialData, existingStands = [], onSave, onCancel }) => {
  const [formData, setFormData] = useState<TaxiStand>({
    id: '',
    name: '',
    phone: '',
    city: 'İzmir',
    district: '',
    neighborhood: '',
    street: '',
    address: '',
    location: undefined,
    capacity: 0,
    plates: [],
    ukomeDecisionNo: '',
    ukomeDate: '',
    ukomeSummary: '',
    status: StandStatus.ACTIVE,
    officeType: 'TİP1',
    responsibility: 'Büyükşehir',
    notes: '',
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [loadingAI, setLoadingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cascading Dropdown States
  const [districts, setDistricts] = useState<string[]>(Object.keys(IZMIR_DATA));
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [streets, setStreets] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        plates: initialData.plates || []
      });
      // Pre-fill dropdown lists based on initial data
      if (initialData.district && IZMIR_DATA[initialData.district]) {
        setNeighborhoods(Object.keys(IZMIR_DATA[initialData.district]));
        if (initialData.neighborhood && IZMIR_DATA[initialData.district][initialData.neighborhood]) {
            setStreets(IZMIR_DATA[initialData.district][initialData.neighborhood]);
        }
      }
    } else {
      setFormData(prev => ({ ...prev, id: Date.now().toString() }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dist = e.target.value;
    updateDistrict(dist);
  };
  
  const updateDistrict = (dist: string) => {
    setFormData(prev => ({ 
        ...prev, 
        district: dist, 
        neighborhood: '', 
        street: '' 
    }));
    setNeighborhoods(dist && IZMIR_DATA[dist] ? Object.keys(IZMIR_DATA[dist]) : []);
    setStreets([]);
  };

  const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const neigh = e.target.value;
    updateNeighborhood(neigh, formData.district);
  };

  const updateNeighborhood = (neigh: string, currentDistrict: string) => {
    setFormData(prev => ({ 
        ...prev, 
        neighborhood: neigh, 
        street: '' 
    }));
    if (currentDistrict && neigh && IZMIR_DATA[currentDistrict] && IZMIR_DATA[currentDistrict][neigh]) {
        setStreets(IZMIR_DATA[currentDistrict][neigh] || []);
    } else {
        setStreets([]);
    }
  };

  // Haritadan adres bulunduğunda çalışır
  const handleAddressFound = (addr: { district?: string; neighborhood?: string; street?: string; fullAddress?: string }) => {
      let matchedDistrict = '';
      let matchedNeighborhood = '';
      let newNeighborhoodsList: string[] = [];
      let newStreetsList: string[] = [];

      // 1. İlçe Eşleştirme
      if (addr.district) {
          const cleanDistrict = addr.district.replace(/(İlçesi|İlçe)$/i, '').trim();
          
          const foundKey = Object.keys(IZMIR_DATA).find(
              key => key.toLocaleLowerCase('tr-TR') === cleanDistrict.toLocaleLowerCase('tr-TR')
          );
          
          if (foundKey) {
              matchedDistrict = foundKey;
              newNeighborhoodsList = Object.keys(IZMIR_DATA[matchedDistrict]);
          }
      }

      // 2. Mahalle Eşleştirme
      if (matchedDistrict && addr.neighborhood) {
          const cleanNeigh = addr.neighborhood
              .replace(/(Mahallesi|Mah\.|Mah|Mh\.|Mh)$/i, '')
              .trim();
              
          const districtData = IZMIR_DATA[matchedDistrict];
          
          if (districtData) {
              const foundNeighKey = Object.keys(districtData).find(
                  key => key.toLocaleLowerCase('tr-TR') === cleanNeigh.toLocaleLowerCase('tr-TR')
              );
              
              if (foundNeighKey) {
                  matchedNeighborhood = foundNeighKey;
                  newStreetsList = IZMIR_DATA[matchedDistrict][matchedNeighborhood] || [];
              }
          }
      }

      // 3. State'leri tek seferde ve tutarlı sırayla güncelle
      if (matchedDistrict) {
          setNeighborhoods(newNeighborhoodsList);
          setStreets(newStreetsList);

          setFormData(prev => ({
              ...prev,
              district: matchedDistrict,
              neighborhood: matchedNeighborhood,
              street: addr.street || prev.street,
          }));
      }
  };

  const handleAIDescription = async () => {
    if (!formData.district || !formData.name) {
      alert("Lütfen önce İlçe ve Durak Adı giriniz.");
      return;
    }
    setLoadingAI(true);
    const desc = await generateDescriptionWithAI(formData.name, formData.capacity, formData.district);
    
    setFormData(prev => ({ 
        ...prev, 
        notes: prev.notes ? prev.notes + "\n" + desc : desc 
    }));
    setLoadingAI(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
        const fullAddress = `${formData.street || ''} ${formData.neighborhood || ''} Mah. ${formData.district || ''}/İZMİR`;
        await onSave({
          ...formData,
          // Plakalar burada değiştirilmiyor, mevcut state neyse o gidiyor.
          address: fullAddress,
          capacity: Number(formData.capacity),
          updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Kaydetme hatası:", error);
        alert("Kayıt sırasında bir hata oluştu.");
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-slate-800">
            {initialData && initialData.createdAt ? 'Durağı Revize Et' : 'Yeni Taksi Durağı Kaydı'}
            </h2>
            {initialData?.ukomeDecisionNo && (
                 <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                    <FileText size={14} /> İşlem Yapılan Karar No: <strong>{initialData.ukomeDecisionNo}</strong>
                 </p>
            )}
        </div>
        
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* UKOME Section */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
             <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <FileText size={18} /> GİRİLEN UKOME KARAR BİLGİLERİ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Karar No</label>
                    <input
                        name="ukomeDecisionNo"
                        value={formData.ukomeDecisionNo}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Karar Tarihi</label>
                    <input
                        type="date"
                        name="ukomeDate"
                        value={formData.ukomeDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                     <label className="block text-xs font-semibold text-blue-800 mb-1">Karar Özeti</label>
                     <textarea
                        name="ukomeSummary"
                        rows={2}
                        value={formData.ukomeSummary}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Durak Adı */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Durak Adı</label>
            <input
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Örn: Alsancak Gar Taksi"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Durak Telefonu</label>
            <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0232 123 45 67"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
            </div>
          </div>

          {/* Kapasite */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Araç Park Kapasitesi</label>
            <input
              required
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Yazıhane Tipi */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yazıhane Tipi</label>
            <select
              name="officeType"
              value={formData.officeType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {OFFICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

           {/* Sorumluluk */}
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sorumluluk / Yetki Alanı</label>
            <select
              name="responsibility"
              value={formData.responsibility}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {RESPONSIBILITIES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

           {/* Durum */}
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Durak Durumu</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {Object.values(StandStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Adres Bölümü */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin size={16} /> Konum Bilgileri
            </h3>
            
            <div className="flex flex-col md:flex-row gap-6">
                {/* Form Fields */}
                <div className="flex-1 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1 flex justify-between">
                                İlçe
                                {formData.location && !formData.district && <span className="text-[10px] text-blue-500 animate-pulse">Konumdan bekleniyor...</span>}
                            </label>
                            <select
                                required
                                name="district"
                                value={formData.district}
                                onChange={handleDistrictChange}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Seçiniz</option>
                                {districts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Mahalle</label>
                            <select
                                required
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleNeighborhoodChange}
                                disabled={!formData.district}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                            >
                                <option value="">Seçiniz</option>
                                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sokak / Cadde</label>
                            <div className="relative">
                                <input 
                                    list="streets-list"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    disabled={!formData.neighborhood}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                                    placeholder={streets.length > 0 ? "Seçiniz veya yazınız" : "Yazınız"}
                                />
                                <datalist id="streets-list">
                                    {streets.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 p-3 rounded-lg">
                        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                            <span>SEÇİLEN KOORDİNATLAR</span>
                            <span className="text-[10px] text-blue-500 flex items-center gap-1">
                                <Wand2 size={10} /> Otomatik Adres Aktif
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                             <div>
                                 <span className="text-slate-500">Enlem:</span> <span className="font-mono text-slate-800">{formData.location?.lat.toFixed(6) || '-'}</span>
                             </div>
                             <div>
                                 <span className="text-slate-500">Boylam:</span> <span className="font-mono text-slate-800">{formData.location?.lng.toFixed(6) || '-'}</span>
                             </div>
                        </div>
                        {!formData.location && <div className="text-xs text-red-500 mt-1">* Haritadan konum seçiniz</div>}
                    </div>

                    <div className="mt-3 text-xs text-slate-500 italic border-t border-slate-200 pt-2">
                        Önizleme: {formData.street} {formData.neighborhood} {formData.district && formData.neighborhood ? 'Mah.' : ''} {formData.district} / İZMİR
                    </div>
                </div>

                {/* Map Picker */}
                <div className="flex-1 min-h-[300px] border border-slate-300 rounded-lg overflow-hidden shadow-inner relative">
                    <LocationPicker 
                        initialLat={formData.location?.lat}
                        initialLng={formData.location?.lng}
                        onLocationSelect={(lat, lng) => setFormData(prev => ({...prev, location: { lat, lng }}))}
                        onAddressFound={handleAddressFound}
                    />
                </div>
            </div>

        </div>

        {/* Plaka Yönetimi (Read-Only) */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <Car size={16} /> Durakta Çalışan Plakalar
                <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                    Toplam: {formData.plates.length}
                </span>
            </h3>
            
            <div className="bg-white/50 p-3 rounded-lg border border-yellow-100 mb-3 flex items-start gap-2 text-xs text-yellow-800">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>
                    <strong>Bilgilendirme:</strong> Veri bütünlüğünü sağlamak amacıyla; duraklara plaka ekleme, çıkarma veya transfer işlemleri sadece ana menüdeki <strong>"Plaka Yönetim Paneli"</strong> üzerinden yapılmaktadır. Bu ekranda sadece mevcut bağlı plakalar görüntülenir.
                </p>
            </div>

            {formData.plates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {formData.plates.map((plate, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm opacity-80">
                            <span className="font-mono font-bold text-slate-800 text-sm">{plate}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-yellow-700/60 italic">Bu durağa henüz plaka bağlanmamış.</p>
            )}
        </div>
        
        {/* Notes */}
        <div className="relative">
            <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-slate-700">Notlar</label>
                <button
                type="button"
                onClick={handleAIDescription}
                disabled={loadingAI}
                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                >
                {loadingAI ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
                AI ile Tanıtım Yazısı
                </button>
            </div>
            <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loadingAI}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StandForm;