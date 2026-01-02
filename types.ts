
export interface Country {
  name: string;
  code: string;
  zone: number;
}

export interface PriceTier {
  weight: number; // in KG
  rates: {
    [zone: number]: number; // Price in NGN or USD
  };
}

export interface Quote {
  origin: string;
  destination: Country;
  weight: number;
  dhlPrice: number;
  ourPrice: number;
  savings: number;
}

export enum Currency {
  NGN = '₦',
  USD = '$'
}
