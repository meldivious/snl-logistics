
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { COUNTRIES, FIXED_PRICING, PER_KG_PRICING, EXTRA_COSTS } from '../constants';
import { Country, Quote, Currency } from '../types';
import { getLogisticsAdvice, lookupPostalCode } from '../services/geminiService';

type Step = 'calculate' | 'details';

interface PersonDetails {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface CacheEntry {
  quote: Quote;
  advice: string;
  timestamp: number;
}

const RateCalculator: React.FC = () => {
  const [step, setStep] = useState<Step>('calculate');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [weight, setWeight] = useState<number>(2.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [advice, setAdvice] = useState<string>('');
  const [quoteCache, setQuoteCache] = useState<Record<string, CacheEntry>>({});
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [extras, setExtras] = useState({
    packaging: false,
    phytosanitary: false,
    vacuum: false
  });

  const initialPersonState: PersonDetails = {
    fullName: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
    state: '',
    country: ''
  };

  const [sender, setSender] = useState<PersonDetails>({ ...initialPersonState, country: 'Nigeria' });
  const [receiver, setReceiver] = useState<PersonDetails>(initialPersonState);
  const [errors, setErrors] = useState<{sender: ValidationErrors, receiver: ValidationErrors}>({
    sender: {},
    receiver: {}
  });

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-populate postal code for receiver based on City and State
  useEffect(() => {
    const shouldLookup = receiver.city.length > 2 && receiver.state.length > 2 && receiver.country && !receiver.postalCode;
    
    if (shouldLookup) {
      const timer = setTimeout(async () => {
        setZipLoading(true);
        try {
          const zip = await lookupPostalCode(receiver.city, receiver.state, receiver.country);
          if (zip) {
            setReceiver(prev => ({ ...prev, postalCode: zip }));
            // Clear error if it was there
            setErrors(prev => ({
              ...prev,
              receiver: { ...prev.receiver, postalCode: '' }
            }));
          }
        } finally {
          setZipLoading(false);
        }
      }, 1200); // 1.2s debounce to wait for user to finish typing
      return () => clearTimeout(timer);
    }
  }, [receiver.city, receiver.state, receiver.country]);

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return [];
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [searchTerm]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const validatePhone = (phone: string, country: string) => {
    if (country === 'Nigeria') return /^(?:\+234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ''));
    return /^\+?[\d\s-]{8,15}$/.test(phone);
  };

  const validateZip = (zip: string, country: string) => {
    const cleanZip = zip.trim();
    if (!cleanZip && country !== 'Nigeria') return false;
    if (country === 'United States') return /^\d{5}(-\d{4})?$/.test(cleanZip);
    if (country === 'United Kingdom') return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(cleanZip);
    if (country === 'Canada') return /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(cleanZip);
    return cleanZip.length >= 3;
  };

  const validatePerson = (person: PersonDetails, type: 'sender' | 'receiver') => {
    const newErrors: ValidationErrors = {};
    if (!person.fullName || person.fullName.trim().length < 3) 
      newErrors.fullName = "Full name (exactly as on ID) is required";
    
    if (!validatePhone(person.phone, person.country)) 
      newErrors.phone = "Provide a valid phone number for " + person.country;
    
    if (!validateEmail(person.email)) 
      newErrors.email = "Enter a valid email address";
    
    if (!person.address || person.address.trim().length < 5) 
      newErrors.address = "Detailed address is required for pickup/delivery";
    
    if (person.country !== 'Nigeria' && !validateZip(person.postalCode, person.country)) 
      newErrors.postalCode = `Invalid Zip/Postal code format for ${person.country}`;
    
    if (!person.city || person.city.trim().length < 2) 
      newErrors.city = "City is required";
    
    if (!person.state || person.state.trim().length < 2) 
      newErrors.state = "State/Province is required";

    setErrors(prev => ({ ...prev, [type]: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const calculateRate = async () => {
    if (!selectedCountry) return;
    
    const cacheKey = `${selectedCountry.code}-${weight}-${JSON.stringify(extras)}`;
    const now = Date.now();
    const cached = quoteCache[cacheKey];
    
    if (cached && (now - cached.timestamp < 300000)) { 
      setQuote(cached.quote);
      setAdvice(cached.advice);
      return;
    }

    setLoading(true);

    let baseRate = 0;
    const zoneIndex = selectedCountry.zone - 1;

    if (weight <= 9) {
      const tiers = Object.keys(FIXED_PRICING).map(Number).sort((a, b) => a - b);
      const exactTier = tiers.find(t => t >= weight) || 9;
      baseRate = FIXED_PRICING[exactTier][zoneIndex];
    } else {
      const tier = PER_KG_PRICING.find(p => weight <= p.max) || PER_KG_PRICING[PER_KG_PRICING.length - 1];
      baseRate = tier.rates[zoneIndex] * weight;
    }

    let serviceFee = 0;
    if (weight >= 0.5 && weight <= 3) serviceFee = 25000;
    else if (weight > 3 && weight <= 5) serviceFee = 33000;
    else if (weight > 5 && weight <= 9) serviceFee = 38000;
    else if (weight > 9 && weight <= 40) serviceFee = 44000;

    let totalExtras = 0;
    if (extras.packaging) totalExtras += EXTRA_COSTS.PACKAGING;
    if (extras.phytosanitary) totalExtras += EXTRA_COSTS.PHYTOSANITARY;
    if (extras.vacuum) totalExtras += EXTRA_COSTS.VACUUM_SEAL;

    const ourPrice = baseRate + totalExtras + serviceFee;
    const dhlPrice = (baseRate * 2.85) + totalExtras + (serviceFee * 1.5);

    const newQuote: Quote = {
      origin: 'Lagos, Nigeria',
      destination: selectedCountry,
      weight: weight,
      dhlPrice,
      ourPrice,
      savings: dhlPrice - ourPrice
    };

    setReceiver(prev => ({ ...prev, country: selectedCountry.name }));
    const aiAdvice = await getLogisticsAdvice(selectedCountry.name, weight);
    
    setQuote(newQuote);
    setAdvice(aiAdvice);
    setQuoteCache(prev => ({
      ...prev,
      [cacheKey]: { quote: newQuote, advice: aiAdvice, timestamp: now }
    }));
    
    setLoading(false);
  };

  const handleShare = async () => {
    if (!quote) return;
    const shareText = `SNL Logistics Quote:\nFrom: Lagos, Nigeria\nTo: ${quote.destination.name}\nWeight: ${quote.weight} KG\nYour Price: ₦${quote.ourPrice.toLocaleString()}\nSavings: ₦${quote.savings.toLocaleString()}\n\nBook your shipment at SNL Logistics!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'SNL Logistics Quote', text: shareText, url: window.location.href });
        setShareStatus("Quote Shared!");
      } catch (err) { setShareStatus("Sharing failed."); }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareStatus("Quote copied to clipboard!");
      } catch (err) { setShareStatus("Could not copy quote."); }
    }
    setTimeout(() => setShareStatus(null), 3000);
  };

  const handleBookNow = () => {
    const isSenderValid = validatePerson(sender, 'sender');
    const isReceiverValid = validatePerson(receiver, 'receiver');
    if (!isSenderValid || !isReceiverValid || !quote) {
      window.scrollTo({ top: document.getElementById('calculator')?.offsetTop || 0, behavior: 'smooth' });
      return;
    }
    
    const whatsappNumber = "2347054638787";
    const formatPerson = (p: PersonDetails, title: string) => {
      return `*${title} DETAILS*%0A` +
        `- Full name: ${p.fullName}%0A` +
        `- Phone number: ${p.phone}%0A` +
        `- Email: ${p.email}%0A` +
        `- Address: ${p.address}%0A` +
        `- Postal code: ${p.postalCode}%0A` +
        `- City: ${p.city}%0A` +
        `- State: ${p.state}%0A` +
        `- Country: ${p.country}`;
    };

    const text = `*NEW BOOKING REQUEST - SNL LOGISTICS*%0A%0A` +
      `*SHIPMENT SUMMARY*%0A` +
      `- To: ${quote.destination.name}%0A` +
      `- Weight: ${quote.weight} KG%0A` +
      `- Total Price: ₦${quote.ourPrice.toLocaleString()}%0A%0A` +
      `${formatPerson(sender, 'SENDER')}%0A%0A` +
      `${formatPerson(receiver, 'RECEIVER')}`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  const renderFormFields = (data: PersonDetails, onChange: (val: PersonDetails) => void, type: 'sender' | 'receiver') => (
    <div className="space-y-4">
      <div className="relative">
        <input 
          type="text" placeholder="Full name (govt ID)" 
          className={`w-full border-2 p-4 rounded-lg font-bold outline-[#CCFF00] transition-colors ${errors[type].fullName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
          value={data.fullName}
          onChange={e => onChange({...data, fullName: e.target.value})}
        />
        {errors[type].fullName && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].fullName}</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input 
            type="tel" placeholder="Phone number" 
            className={`w-full border-2 p-4 rounded-lg font-bold outline-[#CCFF00] transition-colors ${errors[type].phone ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
            value={data.phone}
            onChange={e => onChange({...data, phone: e.target.value})}
          />
          {errors[type].phone && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].phone}</span>}
        </div>
        <div>
          <input 
            type="email" placeholder="Email" 
            className={`w-full border-2 p-4 rounded-lg font-bold outline-[#CCFF00] transition-colors ${errors[type].email ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
            value={data.email}
            onChange={e => onChange({...data, email: e.target.value})}
          />
          {errors[type].email && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].email}</span>}
        </div>
      </div>
      <div>
        <textarea 
          placeholder="Detailed Street Address" 
          className={`w-full border-2 p-4 rounded-lg font-bold h-24 outline-[#CCFF00] transition-colors ${errors[type].address ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
          value={data.address}
          onChange={e => onChange({...data, address: e.target.value})}
        ></textarea>
        {errors[type].address && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].address}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <input 
            type="text" placeholder="City" 
            className={`w-full border-2 p-4 rounded-lg font-bold outline-[#CCFF00] transition-colors ${errors[type].city ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
            value={data.city}
            onChange={e => onChange({...data, city: e.target.value})}
          />
          {errors[type].city && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].city}</span>}
        </div>
        <div>
          <input 
            type="text" placeholder="State/Province" 
            className={`w-full border-2 p-4 rounded-lg font-bold outline-[#CCFF00] transition-colors ${errors[type].state ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
            value={data.state}
            onChange={e => onChange({...data, state: e.target.value})}
          />
          {errors[type].state && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].state}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <input 
            type="text" placeholder="Zip/Postal Code" 
            className={`w-full border-2 p-4 rounded-lg font-bold outline-[#CCFF00] transition-colors ${errors[type].postalCode ? 'border-red-500 bg-red-50' : 'border-gray-200'} ${zipLoading ? 'animate-pulse' : ''}`} 
            value={data.postalCode}
            onChange={e => onChange({...data, postalCode: e.target.value})}
          />
          {zipLoading && (
            <div className="absolute right-3 top-4">
              <i className="fa-solid fa-spinner fa-spin text-[#FF3D00]"></i>
            </div>
          )}
          {errors[type].postalCode && <span className="text-[10px] text-red-500 font-black uppercase italic mt-1 block">{errors[type].postalCode}</span>}
        </div>
        <input 
          type="text" placeholder="Country" 
          className="w-full border-2 border-gray-100 p-4 rounded-lg font-bold bg-gray-50 outline-none cursor-not-allowed" 
          value={data.country}
          readOnly
        />
      </div>
    </div>
  );

  if (step === 'details') {
    return (
      <section id="calculator" className="py-12 px-4 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-t-8 border-[#FF3D00] p-6 md:p-10">
          <button 
            onClick={() => setStep('calculate')}
            className="text-[#FF3D00] font-black text-xs uppercase mb-6 flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Quote
          </button>
          
          <h2 className="text-3xl font-black text-gray-900 italic uppercase mb-8">Shipment Details</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-black border-b-4 border-[#CCFF00] pb-2 italic uppercase mb-6 text-[#FF3D00]">1. Sender (Lagos Hub)</h3>
              {renderFormFields(sender, setSender, 'sender')}
            </div>
            <div>
              <h3 className="text-xl font-black border-b-4 border-[#CCFF00] pb-2 italic uppercase mb-6 text-[#FF3D00]">2. Receiver ({quote?.destination.name})</h3>
              {renderFormFields(receiver, setReceiver, 'receiver')}
              <p className="text-[9px] font-bold text-gray-400 mt-4 uppercase italic border-l-2 border-[#CCFF00] pl-2">
                * Just like DHL, we auto-populate the postal code for your destination once City and State are entered.
              </p>
            </div>
          </div>

          <button 
            onClick={handleBookNow}
            className="w-full bg-[#FF3D00] text-white font-black py-5 rounded-xl mt-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-2xl italic uppercase active:scale-95"
          >
            <i className="fa-brands fa-whatsapp mr-2 text-3xl align-middle"></i> Book Now via WhatsApp
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="calculator" className="py-12 px-4 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-t-8 border-[#FF3D00]">
        <div className="p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 italic uppercase">Rate Calculator</h2>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                SNL Partner Rates vs Standard Rates
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div ref={searchRef} className="relative">
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Destination Country</label>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Type destination..."
                    className="w-full border-4 border-black p-5 pr-14 text-xl font-black outline-none italic uppercase tracking-tighter shadow-[8px_8px_0px_0px_#FF3D00] focus:translate-x-1 focus:translate-y-1 focus:shadow-[4px_4px_0px_0px_#FF3D00] transition-all"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <i className="fa-solid fa-globe text-[#FF3D00] text-3xl"></i>
                  </div>
                  {isSearchOpen && filteredCountries.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-4 bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                      {filteredCountries.map(c => (
                        <div 
                          key={c.code}
                          className="p-4 border-b-2 border-gray-100 hover:bg-[#CCFF00] cursor-pointer font-black italic flex justify-between items-center transition-colors"
                          onClick={() => {
                            setSelectedCountry(c);
                            setSearchTerm(c.name);
                            setIsSearchOpen(false);
                            setQuote(null);
                          }}
                        >
                          <span className="uppercase">{c.name}</span>
                          <span className="text-[10px] bg-black text-white px-2 py-1 italic">SELECT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">
                  Weight: <span className="text-[#FF3D00] text-xl">{weight} KG</span>
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="0.5" max="40" step="0.5" value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    className="flex-grow h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF3D00]"
                  />
                  <input 
                    type="number" value={weight}
                    onChange={(e) => setWeight(Math.min(40, Math.max(0.5, parseFloat(e.target.value) || 0.5)))}
                    className="w-20 border-2 border-gray-200 rounded-lg py-2 px-2 text-center font-black outline-[#CCFF00]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_#CCFF00]">
              <h4 className="font-black text-black text-sm mb-4 uppercase tracking-widest border-b-2 border-black pb-2 italic">Optional Add-ons</h4>
              <div className="space-y-3">
                {Object.entries(EXTRA_COSTS).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={extras[key.toLowerCase() as keyof typeof extras]} 
                        onChange={e => {
                          setExtras({...extras, [key.toLowerCase()]: e.target.checked});
                          setQuote(null);
                        }} 
                        className="w-5 h-5 accent-[#FF3D00] border-2 border-black" 
                      />
                      <span className="text-sm font-black text-gray-600 group-hover:text-black uppercase italic">
                        {key.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-black text-gray-400">₦{value.toLocaleString()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={calculateRate}
            disabled={!selectedCountry || loading}
            className="w-full bg-[#FF3D00] text-white font-black py-5 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 text-xl tracking-tighter italic uppercase"
          >
            {loading ? <i className="fa-solid fa-sync fa-spin mr-2"></i> : "Get My Rates"}
          </button>
        </div>

        {quote && !loading && (
          <div className="bg-[#fcfcfc] border-t-8 border-[#CCFF00] p-6 md:p-10 animate-fade-in relative">
            {shareStatus && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg font-black text-xs uppercase italic z-20 shadow-xl animate-bounce">
                {shareStatus}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="relative">
                   <div className="absolute -top-3 -left-3 bg-gray-800 text-white px-3 py-1 font-black text-[10px] italic shadow-sm z-10 uppercase">
                    Direct Retail Market Price
                   </div>
                   <div className="bg-white p-5 rounded-xl border-4 border-black flex justify-between items-center opacity-60">
                      <span className="text-gray-400 font-black text-xs uppercase italic">DHL Original Estimate</span>
                      <span className="text-gray-400 font-black text-2xl line-through decoration-red-400 decoration-2">{Currency.NGN}{quote.dhlPrice.toLocaleString()}</span>
                   </div>
                </div>
                <div className="relative transform hover:scale-[1.01] transition-all">
                   <div className="bg-[#CCFF00] p-6 rounded-xl border-4 border-black shadow-[12px_12px_0px_0px_#FF3D00] relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#FF3D00] text-white px-4 py-1 text-[10px] font-black uppercase italic">SNL EXCLUSIVE</div>
                      <p className="text-[#FF3D00] font-black text-xs uppercase tracking-widest mb-1 italic">Discounted Rate</p>
                      <h4 className="text-6xl font-black text-black tracking-tighter">{Currency.NGN}{quote.ourPrice.toLocaleString()}</h4>
                   </div>
                </div>
                <div className="bg-green-100 p-4 rounded-xl border-4 border-green-500 text-green-900 flex justify-between items-center shadow-lg">
                  <span className="font-black text-xs uppercase tracking-wide italic underline underline-offset-4 decoration-2">Guaranteed Savings</span>
                  <span className="font-black text-2xl">₦{quote.savings.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-6 flex flex-col justify-center">
                 <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_#f0f0f0]">
                    <h4 className="font-black text-[#FF3D00] text-xs uppercase tracking-widest mb-2 italic flex items-center gap-2">
                      <i className="fa-solid fa-lightbulb"></i> Shipping Intelligence:
                    </h4>
                    <p className="text-sm font-bold text-gray-800 leading-relaxed italic">"{advice}"</p>
                 </div>
                 <div className="flex gap-4 mt-4">
                    <button 
                      onClick={() => setStep('details')}
                      className="flex-1 bg-[#FF3D00] text-white font-black py-4 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase italic text-lg tracking-widest active:scale-95"
                    >
                       PROCEED TO BOOKING
                    </button>
                    <button 
                      onClick={handleShare}
                      className="w-16 h-16 bg-white border-4 border-black text-black rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                       <i className="fa-solid fa-share-nodes text-xl"></i>
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RateCalculator;
