
import { TaxiStand, ChangeLog } from '../types';

// Sunucu adresi dinamik olarak belirlenir.
const API_PORT = 3001;
const STORAGE_KEY = 'taxi_stands_data';

const getApiUrl = () => {
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:${API_PORT}/api/stands`;
};

// --- LocalStorage Yardımcıları ---
// Backend sunucusu çalışmadığında veya static hosting (Vercel/Netlify) 
// kullanıldığında verileri tarayıcı hafızasında tutar.
const getLocalData = (): TaxiStand[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("LocalStorage okuma hatası", e);
    return [];
  }
};

const saveLocalData = (data: TaxiStand[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage yazma hatası", e);
  }
};

export const getStands = async (): Promise<TaxiStand[]> => {
  try {
    // 1. Önce gerçek sunucuya (server.js) ulaşmayı dene
    const response = await fetch(getApiUrl());
    if (!response.ok) throw new Error('API yanıt vermedi');
    return await response.json();
  } catch (error) {
    // 2. Sunucu yoksa LocalStorage kullan (Fallback)
    console.warn("Sunucuya ulaşılamadı, tarayıcı hafızası kullanılıyor.");
    return getLocalData();
  }
};

export const saveStand = async (stand: TaxiStand): Promise<void> => {
  try {
    // 1. Sunucuya kaydetmeyi dene
    await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stand),
    });
  } catch (error) {
    // 2. Sunucu yoksa LocalStorage'a kaydet
    console.warn("Sunucuya ulaşılamadı, tarayıcı hafızasına kaydediliyor.");
    const stands = getLocalData();
    const index = stands.findIndex(s => s.id === stand.id);
    
    if (index >= 0) {
      stands[index] = stand;
    } else {
      stands.push(stand);
    }
    
    saveLocalData(stands);
  }
};

export const deleteStand = async (id: string): Promise<void> => {
  try {
    // 1. Sunucudan silmeyi dene
    await fetch(`${getApiUrl()}/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // 2. Sunucu yoksa LocalStorage'dan sil
    console.warn("Sunucuya ulaşılamadı, tarayıcı hafızasından siliniyor.");
    let stands = getLocalData();
    stands = stands.filter(s => s.id !== id);
    saveLocalData(stands);
  }
};

export const generateChanges = (oldStand: TaxiStand, newStand: TaxiStand): ChangeLog[] => {
  const changes: ChangeLog[] = [];
  
  const fieldsToCheck: (keyof TaxiStand)[] = [
    'name', 
    'phone',
    'city',
    'district', 
    'neighborhood', 
    'street', 
    'address',
    'capacity', 
    'ukomeDecisionNo',
    'ukomeDate', 
    'ukomeSummary',
    'status',
    'officeType', 
    'responsibility',
    'notes'
  ];

  fieldsToCheck.forEach(field => {
    const oldVal = String(oldStand[field] || '').trim();
    const newVal = String(newStand[field] || '').trim();

    if (oldVal !== newVal) {
      if ((!oldStand[field] && !newStand[field])) return;

      changes.push({
        id: Date.now().toString() + Math.random().toString(),
        timestamp: new Date().toISOString(),
        fieldName: field,
        oldValue: oldVal || '(Boş)',
        newValue: newVal || '(Boş)',
        changedBy: 'Admin', // İleride kullanıcı adı eklenebilir
        relatedUkomeNo: newStand.ukomeDecisionNo,
        relatedUkomeDate: newStand.ukomeDate
      });
    }
  });

  // Check Location Changes
  if (oldStand.location?.lat !== newStand.location?.lat || oldStand.location?.lng !== newStand.location?.lng) {
     const oldLoc = oldStand.location ? `${oldStand.location.lat}, ${oldStand.location.lng}` : '(Konum Yok)';
     const newLoc = newStand.location ? `${newStand.location.lat}, ${newStand.location.lng}` : '(Konum Yok)';
     
     if (oldLoc !== newLoc) {
        changes.push({
            id: Date.now().toString() + Math.random().toString(),
            timestamp: new Date().toISOString(),
            fieldName: 'location',
            oldValue: oldLoc,
            newValue: newLoc,
            changedBy: 'Admin',
            relatedUkomeNo: newStand.ukomeDecisionNo,
            relatedUkomeDate: newStand.ukomeDate
        });
     }
  }

  const oldPlates = (oldStand.plates || []).sort().join(', ');
  const newPlates = (newStand.plates || []).sort().join(', ');

  if (oldPlates !== newPlates) {
    changes.push({
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toISOString(),
      fieldName: 'plates',
      oldValue: oldPlates || '(Plaka Yok)',
      newValue: newPlates || '(Plaka Yok)',
      changedBy: 'Admin',
      relatedUkomeNo: newStand.ukomeDecisionNo,
      relatedUkomeDate: newStand.ukomeDate
    });
  }

  return changes;
};
