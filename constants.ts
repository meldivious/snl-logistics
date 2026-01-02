
import { Country } from './types';

export const SNL_LIME = '#CCFF00';
export const SNL_ORANGE = '#FF3D00';

export const ZONES = {
  1: "UK & Ireland",
  2: "West Africa",
  3: "Rest of Africa",
  4: "USA & Canada",
  5: "Europe",
  6: "Arab",
  7: "Asia",
  8: "Caribbeans"
};

export const COUNTRIES: Country[] = [
  // Zone 1
  { name: 'United Kingdom', code: 'GB', zone: 1 },
  { name: 'Ireland', code: 'IE', zone: 1 },
  // Zone 2
  { name: 'Ghana', code: 'GH', zone: 2 },
  { name: 'Benin', code: 'BJ', zone: 2 },
  { name: 'Cameroon', code: 'CM', zone: 2 },
  { name: 'Cote d\'Ivoire', code: 'CI', zone: 2 },
  { name: 'Togo', code: 'TG', zone: 2 },
  { name: 'Senegal', code: 'SN', zone: 2 },
  { name: 'Gambia', code: 'GM', zone: 2 },
  { name: 'Burkina Faso', code: 'BF', zone: 2 },
  { name: 'Mali', code: 'ML', zone: 2 },
  { name: 'Niger', code: 'NE', zone: 2 },
  { name: 'Sierra Leone', code: 'SL', zone: 2 },
  // Zone 3
  { name: 'South Africa', code: 'ZA', zone: 3 },
  { name: 'Kenya', code: 'KE', zone: 3 },
  { name: 'Ethiopia', code: 'ET', zone: 3 },
  { name: 'Egypt', code: 'EG', zone: 3 },
  { name: 'Morocco', code: 'MA', zone: 3 },
  { name: 'Rwanda', code: 'RW', zone: 3 },
  { name: 'Uganda', code: 'UG', zone: 3 },
  { name: 'Tanzania', code: 'TZ', zone: 3 },
  { name: 'Zambia', code: 'ZM', zone: 3 },
  { name: 'Zimbabwe', code: 'ZW', zone: 3 },
  { name: 'Angola', code: 'AO', zone: 3 },
  { name: 'Botswana', code: 'BW', zone: 3 },
  { name: 'Mauritius', code: 'MU', zone: 3 },
  // Zone 4
  { name: 'United States', code: 'US', zone: 4 },
  { name: 'Canada', code: 'CA', zone: 4 },
  // Zone 5
  { name: 'Germany', code: 'DE', zone: 5 },
  { name: 'France', code: 'FR', zone: 5 },
  { name: 'Italy', code: 'IT', zone: 5 },
  { name: 'Spain', code: 'ES', zone: 5 },
  { name: 'Netherlands', code: 'NL', zone: 5 },
  { name: 'Belgium', code: 'BE', zone: 5 },
  { name: 'Switzerland', code: 'CH', zone: 5 },
  { name: 'Sweden', code: 'SE', zone: 5 },
  { name: 'Portugal', code: 'PT', zone: 5 },
  { name: 'Austria', code: 'AT', zone: 5 },
  { name: 'Turkey', code: 'TR', zone: 5 },
  { name: 'Norway', code: 'NO', zone: 5 },
  { name: 'Finland', code: 'FI', zone: 5 },
  { name: 'Poland', code: 'PL', zone: 5 },
  // Zone 6
  { name: 'UAE', code: 'AE', zone: 6 },
  { name: 'Saudi Arabia', code: 'SA', zone: 6 },
  { name: 'Qatar', code: 'QA', zone: 6 },
  { name: 'Kuwait', code: 'KW', zone: 6 },
  { name: 'Bahrain', code: 'BH', zone: 6 },
  { name: 'Oman', code: 'OM', zone: 6 },
  { name: 'Jordan', code: 'JO', zone: 6 },
  { name: 'Lebanon', code: 'LB', zone: 6 },
  // Zone 7
  { name: 'China', code: 'CN', zone: 7 },
  { name: 'India', code: 'IN', zone: 7 },
  { name: 'Japan', code: 'JP', zone: 7 },
  { name: 'Australia', code: 'AU', zone: 7 },
  { name: 'Singapore', code: 'SG', zone: 7 },
  { name: 'Malaysia', code: 'MY', zone: 7 },
  { name: 'South Korea', code: 'KR', zone: 7 },
  { name: 'Hong Kong', code: 'HK', zone: 7 },
  { name: 'Thailand', code: 'TH', zone: 7 },
  { name: 'Vietnam', code: 'VN', zone: 7 },
  { name: 'New Zealand', code: 'NZ', zone: 7 },
  // Zone 8
  { name: 'Jamaica', code: 'JM', zone: 8 },
  { name: 'Bahamas', code: 'BS', zone: 8 },
  { name: 'Brazil', code: 'BR', zone: 8 },
  { name: 'Mexico', code: 'MX', zone: 8 },
  { name: 'Argentina', code: 'AR', zone: 8 },
  { name: 'Israel', code: 'IL', zone: 8 },
  { name: 'Barbados', code: 'BB', zone: 8 },
  { name: 'Trinidad and Tobago', code: 'TT', zone: 8 },
].sort((a, b) => a.name.localeCompare(b.name));

export const FIXED_PRICING: Record<number, number[]> = {
  2:   [54000, 59000, 64500, 64500, 73500, 81000, 88500, 91500],
  2.5: [70500, 75500, 85500, 86000, 95500, 104000, 111000, 121000],
  3:   [75500, 81500, 108500, 99000, 98500, 109500, 117000, 145500],
  3.5: [80000, 86500, 114500, 110500, 104000, 115500, 123500, 153000],
  4:   [86000, 92500, 122000, 123000, 110500, 123000, 131500, 162000],
  4.5: [91000, 97500, 128500, 134500, 116000, 129000, 138500, 169500],
  5:   [96000, 102000, 134500, 146000, 122000, 135500, 145500, 177000],
  6:   [114500, 121500, 159000, 169000, 144500, 161000, 172500, 210000],
  7:   [133000, 140500, 183000, 192000, 167500, 186500, 200000, 243000],
  8:   [150500, 158500, 206500, 213000, 189000, 210500, 226000, 274500],
  9:   [168500, 177500, 230000, 234000, 211500, 235500, 252500, 307000],
};

export const PER_KG_PRICING = [
  { max: 15, rates: [18400, 19400, 25100, 25300, 23100, 25800, 27700, 33700] },
  { max: 20, rates: [17900, 18700, 24000, 23000, 22300, 24800, 26600, 32400] },
  { max: 30, rates: [19000, 19600, 25200, 21300, 23500, 26100, 28000, 34100] },
  { max: 50, rates: [23900, 23800, 25500, 25800, 27700, 33600, 33800, 45500] },
];

export const EXTRA_COSTS = {
  PACKAGING: 2500,
  PHYTOSANITARY: 4000,
  VACUUM_SEAL: 500
};
