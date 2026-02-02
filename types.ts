
export enum StandStatus {
  ACTIVE = 'Aktif',
  PASSIVE = 'Pasif',
  PENDING = 'Onay Bekliyor'
}

export interface ChangeLog {
  id: string;
  timestamp: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string; // Could be 'Admin' or specific user
  relatedUkomeNo?: string; // Değişikliğin yapıldığı sıradaki UKOME Karar No
  relatedUkomeDate?: string; // Değişikliğin yapıldığı sıradaki UKOME Karar Tarihi
}

export interface TaxiStand {
  id: string;
  name: string;
  phone: string; // Durak Telefonu
  city: string; // Genelde İzmir olacak ama yapıya ekleyelim
  district: string;
  neighborhood: string;
  street: string;
  address: string; // Tam açık adres (kombine)
  location?: {
    lat: number;
    lng: number;
  };
  capacity: number;
  plates: string[]; // Bağlı taksi plakaları listesi
  ukomeDecisionNo: string;
  ukomeDate: string;
  ukomeSummary: string; // Karar Özeti
  status: StandStatus;
  officeType: string; // Yazıhane Tipi
  responsibility: string; // Sorumluluk
  notes: string;
  history: ChangeLog[];
  createdAt: string;
  updatedAt: string;
}

export type ViewState = 'LIST' | 'FORM' | 'HISTORY' | 'VIEW';