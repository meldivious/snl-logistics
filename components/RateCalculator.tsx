
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { COUNTRIES, FIXED_PRICING, PER_KG_PRICING, EXTRA_COSTS } from '../constants';
import { Country, Quote, Currency } from '../types';
import { getLogisticsAdvice, lookupPostalCode } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [weight, setWeight] = useState<number>(2.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [advice, setAdvice] = useState<string>('');
  const [quoteCache, setQuoteCache] = useState<Record<string, CacheEntry>>({});
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [isSharePreviewOpen, setIsSharePreviewOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  
  const [extras, setExtras] = useState({
    packaging: false,
    vacuum_seal: false,
    insurance: false
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

  const generationDateTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  }, [isSharePreviewOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const shouldLookup = receiver.city.length > 2 && receiver.state.length > 2 && receiver.country && !receiver.postalCode;
    
    if (shouldLookup) {
      const timer = setTimeout(async () => {
        setZipLoading(true);
        try {
          const zip = await lookupPostalCode(receiver.city, receiver.state, receiver.country);
          if (zip) {
            setReceiver(prev => ({ ...prev, postalCode: zip }));
            setErrors(prev => ({
              ...prev,
              receiver: { ...prev.receiver, postalCode: '' }
            }));
          }
        } finally {
          setZipLoading(false);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [receiver.city, receiver.state, receiver.country]);

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return [];
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [searchTerm]);

  const validatePerson = (person: PersonDetails, type: 'sender' | 'receiver') => {
    const newErrors: ValidationErrors = {};
    if (!person.fullName || person.fullName.trim().length < 3) 
      newErrors.fullName = "Full name (exactly as on ID) is required";
    if (!person.phone || person.phone.length < 8)
      newErrors.phone = "Provide a valid phone number";
    if (!person.email || !person.email.includes('@')) 
      newErrors.email = "Enter a valid email address";
    if (!person.address || person.address.trim().length < 5) 
      newErrors.address = "Detailed address is required";
    if (person.country !== 'Nigeria' && (!person.postalCode || person.postalCode.length < 3)) 
      newErrors.postalCode = `Invalid Zip/Postal code for ${person.country}`;
    if (!person.city) newErrors.city = "City is required";
    if (!person.state) newErrors.state = "State is required";

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
    if (extras.vacuum_seal) totalExtras += EXTRA_COSTS.VACUUM_SEAL;
    if (extras.insurance) totalExtras += EXTRA_COSTS.INSURANCE;

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

  const handleDownloadAndShare = async () => {
    if (!quote || !snapshotRef.current) return;
    
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(snapshotRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fafafa'
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`SNL_Quote_${quote.destination.code}_${quote.weight}KG.pdf`);

      const shareText = `🚀 SNL Logistics Quote:\n🌍 To: ${quote.destination.name}\n⚖️ Weight: ${quote.weight} KG\n💰 SNL Price: ₦${quote.ourPrice.toLocaleString()}\n📉 Savings: ₦${quote.savings.toLocaleString()}\n\nGenerated: ${generationDateTime}\nMoving goods at the speed of business.\nBook at: ${window.location.origin}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: 'SNL Logistics Quote', text: shareText, url: window.location.href });
          setShareStatus("Quote Shared!");
        } catch (err) { setShareStatus("PDF Downloaded."); }
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareStatus("PDF saved & link copied!");
      }
    } catch (error) {
      console.error("Capture failed:", error);
      setShareStatus("Export failed.");
    } finally {
      setIsCapturing(false);
      setIsSharePreviewOpen(false);
      setTimeout(() => setShareStatus(null), 3000);
    }
  };

  const handleBookNow = () => {
    const isSenderValid = validatePerson(sender, 'sender');
    const isReceiverValid = validatePerson(receiver, 'receiver');
    if (!isSenderValid || !isReceiverValid || !quote) {
      window.scrollTo({ top: document.getElementById('calculator')?.offsetTop || 0, behavior: 'smooth' });
      return;
    }
    
    const whatsappNumber = "2347054638787";
    const text = `*NEW BOOKING REQUEST - SNL LOGISTICS*%0A%0A` +
      `*SHIPMENT SUMMARY*%0A` +
      `- To: ${quote.destination.name}%0A` +
      `- Weight: ${quote.weight} KG%0A` +
      `- Total Price: ₦${quote.ourPrice.toLocaleString()}`;
    
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
        <input type="text" placeholder="City" className="w-full border-2 p-4 rounded-lg font-bold border-gray-200 outline-[#CCFF00]" value={data.city} onChange={e => onChange({...data, city: e.target.value})}/>
        <input type="text" placeholder="State/Province" className="w-full border-2 p-4 rounded-lg font-bold border-gray-200 outline-[#CCFF00]" value={data.state} onChange={e => onChange({...data, state: e.target.value})}/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input type="text" placeholder="Zip/Postal Code" className="w-full border-2 p-4 rounded-lg font-bold border-gray-200 outline-[#CCFF00]" value={data.postalCode} onChange={e => onChange({...data, postalCode: e.target.value})}/>
        <input type="text" placeholder="Country" className="w-full border-2 border-gray-100 p-4 rounded-lg font-bold bg-gray-50 outline-none cursor-not-allowed" value={data.country} readOnly />
      </div>
    </div>
  );

  if (step === 'details') {
    return (
      <section id="calculator" className="py-12 px-4 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-t-8 border-[#FF3D00] p-6 md:p-10">
          <button onClick={() => setStep('calculate')} className="text-[#FF3D00] font-black text-xs uppercase mb-6 flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
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
            </div>
          </div>
          <button onClick={handleBookNow} className="w-full bg-[#FF3D00] text-white font-black py-5 rounded-xl mt-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-2xl italic uppercase active:scale-95">
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
                        <div key={c.code} className="p-4 border-b-2 border-gray-100 hover:bg-[#CCFF00] cursor-pointer font-black italic flex justify-between items-center transition-colors" onClick={() => { setSelectedCountry(c); setSearchTerm(c.name); setIsSearchOpen(false); setQuote(null); }}>
                          <span className="uppercase">{c.name}</span>
                          <span className="text-[10px] bg-black text-white px-2 py-1 italic">SELECT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Weight: <span className="text-[#FF3D00] text-xl">{weight} KG</span></label>
                <div className="flex items-center gap-4">
                  <input type="range" min="0.5" max="40" step="0.5" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value))} className="flex-grow h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF3D00]"/>
                  <input type="number" value={weight} onChange={(e) => setWeight(Math.min(40, Math.max(0.5, parseFloat(e.target.value) || 0.5)))} className="w-20 border-2 border-gray-200 rounded-lg py-2 px-2 text-center font-black outline-[#CCFF00]"/>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_#CCFF00]">
              <h4 className="font-black text-black text-sm mb-4 uppercase tracking-widest border-b-2 border-black pb-2 italic">Optional Add-ons</h4>
              <div className="space-y-3">
                {Object.entries(EXTRA_COSTS).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={extras[key.toLowerCase() as keyof typeof extras]} onChange={e => { setExtras({...extras, [key.toLowerCase()]: e.target.checked}); setQuote(null); }} className="w-5 h-5 accent-[#FF3D00] border-2 border-black" />
                      <span className="text-sm font-black text-gray-600 group-hover:text-black uppercase italic">{key.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-black text-gray-400">₦{value.toLocaleString()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={calculateRate} disabled={!selectedCountry || loading} className="w-full bg-[#FF3D00] text-white font-black py-5 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 text-xl tracking-tighter italic uppercase">
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
                   <div className="absolute -top-3 -left-3 bg-gray-800 text-white px-3 py-1 font-black text-[10px] italic shadow-sm z-10 uppercase">Direct Retail Market Price</div>
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
                    <button onClick={() => setStep('details')} className="flex-1 bg-[#FF3D00] text-white font-black py-4 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase italic text-lg tracking-widest active:scale-95">
                       PROCEED TO BOOKING
                    </button>
                    <button onClick={() => setIsSharePreviewOpen(true)} className="w-16 h-16 bg-white border-4 border-black text-black rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5">
                       <i className="fa-solid fa-share-nodes text-xl"></i>
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Snapshot Modal */}
      {isSharePreviewOpen && quote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white border-4 border-black shadow-[16px_16px_0px_0px_#FF3D00] overflow-hidden">
            <div className="bg-black p-4 flex justify-between items-center">
              <span className="text-white font-black italic uppercase text-xs tracking-[0.3em]">Snapshot Preview</span>
              <button onClick={() => setIsSharePreviewOpen(false)} className="text-white hover:rotate-90 transition-transform">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="p-8 bg-[#fafafa]">
              {/* The "Digital Quote Card" UI */}
              <div ref={snapshotRef} className="bg-white border-4 border-black p-6 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="absolute top-0 right-0 bg-[#FF3D00] text-white px-3 py-1 font-black italic text-[9px] uppercase">Official Quote</div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black italic text-2xl uppercase tracking-tighter">SNL LOGISTICS</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone: 070 5463 8787</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Date: {generationDateTime}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#CCFF00] border-2 border-black flex items-center justify-center">
                    <i className="fa-solid fa-plane text-black"></i>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-end border-b-2 border-dashed border-gray-200 pb-2">
                    <span className="text-xs font-black uppercase text-gray-400 italic">Route</span>
                    <span className="text-lg font-black italic">LAGOS → {quote.destination.name}</span>
                  </div>
                  <div className="flex justify-between items-end border-b-2 border-dashed border-gray-200 pb-2">
                    <span className="text-xs font-black uppercase text-gray-400 italic">Net Weight</span>
                    <span className="text-lg font-black italic">{quote.weight} KG</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-gray-400 italic">Verified Savings</span>
                    <span className="text-lg font-black text-green-600 italic">₦{quote.savings.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-[#CCFF00] border-4 border-black p-4 text-center">
                  <p className="text-[10px] font-black uppercase italic mb-1 text-black opacity-50">Total Payable Amount</p>
                  <h2 className="text-4xl font-black text-black tracking-tighter">₦{quote.ourPrice.toLocaleString()}</h2>
                </div>

                <div className="mt-6 p-3 bg-gray-50 border-2 border-black rounded-lg text-[11px] font-bold italic leading-tight text-gray-600">
                   "{advice}"
                </div>
              </div>
              
              <div className="mt-8 flex flex-col gap-4">
                <button 
                  onClick={handleDownloadAndShare}
                  disabled={isCapturing}
                  className="w-full bg-[#FF3D00] text-white font-black py-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase italic tracking-widest hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isCapturing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-pdf text-xl"></i>}
                  {isCapturing ? "GENERATING..." : "Download & Share Now"}
                </button>
                <button 
                  onClick={() => setIsSharePreviewOpen(false)}
                  className="w-full bg-white text-black font-black py-4 border-2 border-black uppercase italic tracking-widest text-xs opacity-50 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RateCalculator;
