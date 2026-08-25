export interface CountryOption {
  code: string;
  name: { ar: string; en: string };
  flag: string;
  region: 'kuwait' | 'gcc' | 'row';
  phoneCode: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'KW', name: { ar: 'الكويت', en: 'Kuwait' }, flag: '🇰🇼', region: 'kuwait', phoneCode: '+965' },
  { code: 'SA', name: { ar: 'المملكة العربية السعودية', en: 'Saudi Arabia' }, flag: '🇸🇦', region: 'gcc', phoneCode: '+966' },
  { code: 'AE', name: { ar: 'الإمارات العربية المتحدة', en: 'United Arab Emirates' }, flag: '🇦🇪', region: 'gcc', phoneCode: '+971' },
  { code: 'QA', name: { ar: 'قطر', en: 'Qatar' }, flag: '🇶🇦', region: 'gcc', phoneCode: '+974' },
  { code: 'BH', name: { ar: 'البحرين', en: 'Bahrain' }, flag: '🇧🇭', region: 'gcc', phoneCode: '+973' },
  { code: 'OM', name: { ar: 'عُمان', en: 'Oman' }, flag: '🇴🇲', region: 'gcc', phoneCode: '+968' },
  { code: 'US', name: { ar: 'الولايات المتحدة', en: 'United States' }, flag: '🇺🇸', region: 'row', phoneCode: '+1' },
  { code: 'GB', name: { ar: 'المملكة المتحدة', en: 'United Kingdom' }, flag: '🇬🇧', region: 'row', phoneCode: '+44' },
  { code: 'EG', name: { ar: 'مصر', en: 'Egypt' }, flag: '🇪🇬', region: 'row', phoneCode: '+20' },
  { code: 'CA', name: { ar: 'كندا', en: 'Canada' }, flag: '🇨🇦', region: 'row', phoneCode: '+1' },
  { code: 'AU', name: { ar: 'أستراليا', en: 'Australia' }, flag: '🇦🇺', region: 'row', phoneCode: '+61' },
  { code: 'OTHER', name: { ar: 'دولة أخرى', en: 'Other Country' }, flag: '🌍', region: 'row', phoneCode: '+' }
];

export const KUWAIT_GOVERNORATES = [
  { ar: 'العاصمة', en: 'Capital (Al Asimah)' },
  { ar: 'حولي', en: 'Hawalli' },
  { ar: 'الفروانية', en: 'Farwaniya' },
  { ar: 'الأحمدي', en: 'Ahmadi' },
  { ar: 'مبارك الكبير', en: 'Mubarak Al-Kabeer' },
  { ar: 'الجهراء', en: 'Jahra' }
];

export const SAUDI_REGIONS = [
  { ar: 'منطقة الرياض', en: 'Riyadh' },
  { ar: 'منطقة مكة المكرمة', en: 'Makkah' },
  { ar: 'المنطقة الشرقية', en: 'Eastern Province' },
  { ar: 'منطقة المدينة المنورة', en: 'Madinah' },
  { ar: 'منطقة القصيم', en: 'Al Qassim' },
  { ar: 'منطقة عسير', en: 'Asir' },
  { ar: 'منطقة تبوك', en: 'Tabuk' },
  { ar: 'منطقة حائل', en: 'Hail' },
  { ar: 'منطقة الحدود الشمالية', en: 'Northern Borders' },
  { ar: 'منطقة جازان', en: 'Jazan' },
  { ar: 'منطقة نجران', en: 'Najran' },
  { ar: 'منطقة الباحة', en: 'Al Bahah' },
  { ar: 'منطقة الجوف', en: 'Al Jawf' }
];

export const UAE_EMIRATES = [
  { ar: 'دبي', en: 'Dubai' },
  { ar: 'أبو ظبي', en: 'Abu Dhabi' },
  { ar: 'الشارقة', en: 'Sharjah' },
  { ar: 'عجمان', en: 'Ajman' },
  { ar: 'رأس الخيمة', en: 'Ras Al Khaimah' },
  { ar: 'الفجيرة', en: 'Fujairah' },
  { ar: 'أم القيوين', en: 'Umm Al Quwain' }
];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

/**
 * Compiles dynamic structured address parts into a single clean printable address string.
 */
export function formatFullAddress(details: {
  country?: string;
  governorate?: string;
  state?: string;
  emirate?: string;
  province?: string;
  city?: string;
  area?: string;
  block?: string;
  street?: string;
  building?: string;
  floorApt?: string;
  postalCode?: string;
  address?: string;
  language?: 'ar' | 'en';
}): string {
  const parts: string[] = [];
  const isAr = details.language === 'ar';

  if (details.country === 'KW') {
    if (details.governorate) parts.push(details.governorate);
    if (details.area) parts.push(`${isAr ? 'منطقة' : 'Area'}: ${details.area}`);
    if (details.block) parts.push(`${isAr ? 'قطعة' : 'Block'} ${details.block}`);
    if (details.street) parts.push(`${isAr ? 'شارع' : 'Street'} ${details.street}`);
    if (details.building) parts.push(`${isAr ? 'مبنى/منزل' : 'Bldg/House'} ${details.building}`);
    if (details.floorApt) parts.push(details.floorApt);
    parts.push(isAr ? 'الكويت' : 'Kuwait');
  } else if (details.country === 'SA') {
    if (details.province) parts.push(details.province);
    if (details.city) parts.push(details.city);
    if (details.area) parts.push(`${isAr ? 'حي' : 'District'}: ${details.area}`);
    if (details.street) parts.push(`${isAr ? 'شارع' : 'Street'} ${details.street}`);
    if (details.building) parts.push(`${isAr ? 'مبنى' : 'Bldg'} ${details.building}`);
    if (details.postalCode) parts.push(`${isAr ? 'الرمز البريدي' : 'Postal Code'}: ${details.postalCode}`);
    parts.push(isAr ? 'المملكة العربية السعودية' : 'Saudi Arabia');
  } else if (details.country === 'AE') {
    if (details.emirate) parts.push(details.emirate);
    if (details.area) parts.push(details.area);
    if (details.street) parts.push(details.street);
    if (details.building) parts.push(details.building);
    parts.push(isAr ? 'الإمارات العربية المتحدة' : 'UAE');
  } else if (details.country === 'US') {
    if (details.street) parts.push(details.street);
    if (details.floorApt) parts.push(details.floorApt);
    if (details.city && details.state && details.postalCode) {
      parts.push(`${details.city}, ${details.state} ${details.postalCode}`);
    } else {
      if (details.city) parts.push(details.city);
      if (details.state) parts.push(details.state);
      if (details.postalCode) parts.push(details.postalCode);
    }
    parts.push('United States');
  } else {
    // Other / generic
    if (details.street) parts.push(details.street);
    if (details.floorApt) parts.push(details.floorApt);
    if (details.city) parts.push(details.city);
    if (details.state || details.province) parts.push((details.state || details.province) as string);
    if (details.postalCode) parts.push(details.postalCode);
    if (details.country) parts.push(details.country);
  }

  // Fallback to manual textarea if empty
  if (parts.length === 0 && details.address) {
    return details.address;
  }

  return parts.filter(Boolean).join(', ');
}
