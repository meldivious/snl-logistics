import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Header from './components/Header.tsx';
import RateCalculator from './components/RateCalculator.tsx';
import Logo from './components/Logo.tsx';

// Modal Component
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl border-4 border-black shadow-[16px_16px_0px_0px_#CCFF00] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#FF3D00] p-4 flex justify-between items-center border-b-4 border-black">
          <h2 className="text-white font-black italic uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="text-white hover:rotate-90 transition-transform">
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-gray-800 font-bold leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// FAQ Item Component
const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onToggle: () => void }> = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden transition-all">
      <button 
        onClick={onToggle}
        className="w-full flex justify-between items-center p-6 text-left hover:bg-[#CCFF00] transition-colors group"
      >
        <span className="font-black text-xl italic uppercase tracking-tight">{question}</span>
        <div className={`w-10 h-10 border-4 border-black flex items-center justify-center bg-white transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
          <i className="fa-solid fa-plus text-lg"></i>
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 border-t-4 border-black p-6' : 'max-h-0 opacity-0'}`}>
        <p className="font-bold text-gray-600 leading-relaxed text-lg italic">
          {answer}
        </p>
      </div>
    </div>
  );
};

// Tracking Function Utility
const openExternalTracking = (id: string) => {
  if (!id) return;
  const dhlUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${id.trim()}&brand=DHL`;
  window.open(dhlUrl, '_blank');
};

// Placeholder Tracking Page Component (Internal UI)
const TrackingPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white">
      <div className="max-w-2xl w-full border-4 border-black p-10 shadow-[16px_16px_0px_0px_#CCFF00] bg-white text-center">
        <div className="w-20 h-20 bg-[#FF3D00] text-[#CCFF00] flex items-center justify-center mx-auto mb-8 rounded-full border-4 border-black">
          <i className="fa-solid fa-truck-fast text-3xl"></i>
        </div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Tracking Status</h2>
        <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em] mb-8">Shipment ID: {id}</p>
        
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 mb-8 rounded-xl">
          <p className="text-gray-600 font-bold italic text-lg leading-tight">
            Our systems are synchronizing with the global DHL network. <br/>
            Real-time tracking details for <span className="text-[#FF3D00]">{id}</span> will be available via official channels.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => openExternalTracking(id || "")}
            className="bg-[#FF3D00] text-white border-2 border-black px-8 py-4 font-black italic uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            Check Live on DHL
          </button>
          <button 
            onClick={() => navigate('/')}
            className="bg-[#CCFF00] text-black border-2 border-black px-8 py-4 font-black italic uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [typedText, setTypedText] = useState("");
  const [trackId, setTrackId] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const navigate = useNavigate();
  const fullText = "YOUR NEIGHBORHOOD";
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      navigate(`/track/${trackId.trim()}`);
    }
  };

  const faqs = [
    { 
      q: "How long does delivery take?", 
      a: "Our standard express timeline is 3-5 Working Days. Please note that this starts from the day of dispatch from our Lagos hub and excludes weekends and public holidays." 
    },
    { 
      q: "Can I ship perfumes or body sprays?", 
      a: "No. Perfumes, body sprays, and aerosols are classified as Flammable Gases/Liquids (Dangerous Goods) and are prohibited on our standard express service. Attempting to ship these can lead to shipment seizure." 
    },
    { 
      q: "Are there any hidden charges?", 
      a: "Our quote covers the shipping from Lagos and all standard documentation. However, customs duties and taxes at the destination country are determined by the local authorities and remain the responsibility of the receiver." 
    },
    { 
      q: "Do you offer doorstep delivery?", 
      a: "Yes! All SNL shipments are Door-to-Door. We pick up from your specified location in Lagos (or you drop off at our hub) and deliver directly to the recipient's doorstep anywhere in the world." 
    },
    { 
      q: "How do I track my package?", 
      a: "Once your shipment is processed, you'll receive a DHL Air Waybill (AWB) number. You can use the 'Track Shipment' feature on this app or visit the DHL website directly for real-time updates." 
    },
    { 
      q: "What is your drop-off location?", 
      a: "You can drop off your packages at our hub: Season One Mall, Plot 11a, Wole Ariyo Street, Off Admiralty Way, Lekki Phase 1, Lagos. We operate Monday to Friday, 9 AM to 5 PM." 
    }
  ];

  return (
    <>
      <div className="bg-[#CCFF00] pt-20 pb-32 px-6 text-center border-b-8 border-[#FF3D00]">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl md:text-7xl font-black text-black mb-8 tracking-tighter italic leading-none">
            THE WORLD IS<br/>
            <span className="text-[#FF3D00] inline-block min-h-[1.2em] typewriter-cursor uppercase">
              {typedText}
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-black font-bold max-w-2xl mx-auto leading-tight italic opacity-90 mb-12">
            International shipping from Lagos to the World. <br className="hidden md:block" />
            Moving goods one business at a time Express.
          </p>

          <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 w-full max-w-4xl">
             <a 
              href="#calculator" 
              className="flex-1 bg-black text-white font-black px-8 py-6 rounded-xl shadow-[8px_8px_0px_0px_rgba(255,61,0,1)] border-4 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-xl italic uppercase tracking-tighter text-center flex items-center justify-center min-h-[80px]"
             >
               Request a quote
             </a>

             <form onSubmit={handleTrack} className="flex-1 flex flex-row items-stretch gap-0 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden bg-white min-h-[80px]">
                <input 
                  type="text" 
                  placeholder="TRACKING ID..."
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className="flex-grow px-4 md:px-6 py-4 font-black italic uppercase tracking-widest text-lg outline-none placeholder:text-gray-300 w-full"
                />
                <button 
                  type="submit"
                  className="bg-[#FF3D00] text-white font-black px-6 md:px-10 py-4 text-xl italic uppercase tracking-tighter border-l-4 border-black hover:bg-black transition-colors whitespace-nowrap"
                >
                  Track
                </button>
             </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 -mt-12 mb-16 relative z-10">
        {[
          { icon: 'fa-plane-departure', title: 'Global Reach', desc: 'Shipping to 220+ Countries.' },
          { icon: 'fa-clock', title: 'Express Speed', desc: '3-5 Working Days Delivery*' },
          { icon: 'fa-money-bill-trend-up', title: 'Unbeatable Price', desc: 'Save up to 60% vs Retail.' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_#FF3D00] flex flex-col items-center text-center group hover:scale-[1.02] transition-transform">
            <div className="w-20 h-20 bg-[#CCFF00] border-4 border-black flex items-center justify-center mb-6 shadow-sm group-hover:rotate-12 transition-transform">
              <i className={`fa-solid ${item.icon} text-[#FF3D00] text-3xl`}></i>
            </div>
            <h3 className="font-black text-gray-900 text-xl mb-3 italic uppercase tracking-tighter">{item.title}</h3>
            <p className="text-gray-600 font-bold leading-tight">{item.desc}</p>
          </div>
        ))}
      </div>

      <RateCalculator />

      <section className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-5xl font-black text-black mb-10 italic leading-none uppercase tracking-tighter">
              WHY CHOOSE <span className="text-[#FF3D00]">SNL?</span>
            </h2>
            <div className="space-y-10">
              {[
                { q: "Unbeatable Rates", a: "We offer the world's most reliable express shipping with the best courier service. You get the same security, the same tracking, and the same speed—at a fraction of the cost." },
                { q: "DAILY DEPARTURES", a: "Packages don't sit in our office. We process and dispatch shipments within the 9 to 5 hours, Monday to Friday. Ensuring zero latency!" },
                { q: "24/5 Customer SUPPORT", a: "From label generation to doorstep delivery, our team of experts keeps you abreast of all the information and support you need, so you can focus on your business." }
              ].map((faq, i) => (
                <div key={i} className="relative pl-12">
                  <div className="absolute left-0 top-0 text-4xl font-black text-[#CCFF00] stroke-black stroke-2" style={{ WebkitTextStroke: '2px #FF3D00', color: 'transparent' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h4 className="font-black text-black text-xl mb-3 italic tracking-tight uppercase">{faq.q}</h4>
                  <p className="text-gray-600 leading-relaxed font-bold text-lg">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
            <div className="relative border-8 border-black shadow-[20px_20px_0px_0px_#CCFF00]">
              <img 
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=1000" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                alt="SNL Logistics operation"
              />
              <div className="absolute -bottom-6 -right-6 bg-[#FF3D00] text-[#CCFF00] p-6 font-black italic shadow-xl max-w-[240px] text-left uppercase tracking-tight">
                THOUSANDS OF SHIPMENTS PROCESSED & DELIVERED ANNUALLY
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[rgb(255,252,218)] py-24 px-6 border-y-8 border-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-black italic uppercase tracking-tighter leading-none mb-4">
              FREQUENTLY ASKED <span className="text-[#FF3D00]">QUESTIONS</span>
            </h2>
            <div className="w-32 h-4 bg-[#FF3D00] mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black"></div>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <FAQItem 
                key={index}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

const App: React.FC = () => {
  const [modal, setModal] = useState<'privacy' | 'terms' | 'forbidden' | 'track' | null>(null);
  const [modalTrackId, setModalTrackId] = useState('');

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#FF3D00] selection:text-white">
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/track/:id" element={<TrackingPage />} />
        </Routes>
      </main>

      <footer className="bg-black text-white py-20 px-6 border-t-[16px] border-[#FF3D00]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-2">
            <Logo size="md" className="items-start mb-10" />
            <p className="max-w-md mb-8 leading-relaxed font-bold text-gray-400 italic">
              Empowering Nigerian businesses and individuals to reach global markets. Secure, transparent, and undeniably fast.
            </p>
            <div className="flex gap-6">
              {['whatsapp', 'instagram', 'facebook'].map(brand => (
                <i key={brand} className={`fa-brands fa-${brand} text-3xl hover:text-[#CCFF00] cursor-pointer transition-colors`}></i>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-[#CCFF00] font-black mb-8 uppercase tracking-widest text-sm italic">Useful Links</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
              <li className="hover:text-[#CCFF00] cursor-pointer transition-colors" onClick={() => setModal('track')}>Track Shipment</li>
              <li className="hover:text-[#CCFF00] cursor-pointer transition-colors" onClick={() => setModal('forbidden')}>Forbidden Items</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[#CCFF00] font-black mb-8 uppercase tracking-widest text-sm italic">Dropoff Address</h4>
            <p className="text-gray-400 font-bold mb-2 italic">Season One Mall</p>
            <p className="text-gray-400 font-bold mb-6">Plot 11a, Wole Ariyo Street, Off Admiralty Way, Lekki Phase 1, Lagos</p>
            <div className="bg-[#FF3D00] p-4 text-white inline-block font-black italic shadow-[4px_4px_0px_0px_#CCFF00]">
              +234 (0) 705 463 8787
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-20 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          <div>© {new Date().getFullYear()} SNL LOGISTICS. ALL RIGHTS RESERVED.</div>
          <div className="flex gap-8 italic">
            <span className="hover:text-white cursor-pointer" onClick={() => setModal('privacy')}>Privacy Policy</span>
            <span className="hover:text-white cursor-pointer" onClick={() => setModal('terms')}>Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Privacy Modal */}
      <Modal 
        isOpen={modal === 'privacy'} 
        onClose={() => setModal(null)} 
        title="Privacy Policy"
      >
        <p>At SNL Logistics, we value your privacy. This policy explains how we collect, use, and protect your personal information.</p>
        <h3 className="text-black font-black uppercase italic mt-4">1. Information Collection</h3>
        <p>We collect essential data including your full name, phone number, email, and shipping addresses. This is strictly for the purpose of processing your shipment and generating accurate international labels.</p>
        <h3 className="text-black font-black uppercase italic mt-4">2. Third-Party Sharing</h3>
        <p>SNL Logistics acts as a secondary processor. To fulfill delivery, we share your data with our trusted third-party global carriers (e.g., DHL Express) and relevant international customs authorities. These parties are prohibited from using your data for any other purpose.</p>
        <h3 className="text-black font-black uppercase italic mt-4">3. Data Security</h3>
        <p>We implement robust digital safeguards to protect your data from unauthorized access. Your payment details are processed through secure, encrypted gateways and are never stored on our local servers.</p>
        <h3 className="text-black font-black uppercase italic mt-4">4. Compliance</h3>
        <p>We comply with Nigerian data protection regulations and ensure our global partners uphold similar standards for international transfers.</p>
      </Modal>

      {/* Terms Modal */}
      <Modal 
        isOpen={modal === 'terms'} 
        onClose={() => setModal(null)} 
        title="Terms of Service"
      >
        <p>By using SNL Logistics services, you agree to the following conditions. Please read them carefully.</p>
        <h3 className="text-black font-black uppercase italic mt-4">1. Scope of Service</h3>
        <p>SNL Logistics ("The Company") is a logistics facilitator and processor. We handle documentation, label generation, and dispatch coordination. The actual physical carriage and delivery are handled by our third-party global partners.</p>
        <h3 className="text-black font-black uppercase italic mt-4">2. Customs & Duties</h3>
        <p>The Company is not responsible for any customs duties, taxes, or clearance fees imposed by the destination country. These remain the sole responsibility of the Receiver or Sender as per the chosen Incoterms. We are not liable for delays caused by customs inspections or seizures of prohibited items.</p>
        <h3 className="text-black font-black uppercase italic mt-4">3. Indemnification</h3>
        <p>You agree to indemnify and hold SNL Logistics harmless from any claims, losses, or damages arising from the actions of third-party carriers, including but not limited to, delays in transit, package loss, or damage during carriage. Our liability is limited strictly to our processing fee in the event of documented company negligence.</p>
        <h3 className="text-black font-black uppercase italic mt-4">4. Prohibited Items</h3>
        <p>Senders must verify that items do not appear on our "Forbidden Items" list. SNL Logistics reserves the right to inspect and reject any shipment that violates safety regulations without refund of processing fees.</p>
        <h3 className="text-black font-black uppercase italic mt-4">5. Delivery Timelines</h3>
        <p>Quoted delivery times (e.g., 3-5 Working Days) are estimates based on standard carrier performance and are not guaranteed. Latency due to flight schedules, weather, or global logistics disruptions is outside our control.</p>
      </Modal>

      {/* Forbidden Items Modal */}
      <Modal 
        isOpen={modal === 'forbidden'} 
        onClose={() => setModal(null)} 
        title="Forbidden Items (Non-Shippable)"
      >
        <div className="space-y-6">
          <p className="bg-red-50 p-4 border-l-4 border-red-500 italic text-red-900">
            SNL Logistics follows strict IATA and DHL global safety standards. Attempting to ship forbidden items may result in disposal by customs without refund.
          </p>

          <div>
            <h3 className="text-[#FF3D00] font-black uppercase italic text-xl border-b-2 border-[#CCFF00] inline-block mb-3">Absolute Prohibited</h3>
            <ul className="list-disc pl-5 space-y-1 font-bold">
              <li>Live Animals (including insects/fish)</li>
              <li>Bullion, Cash & Legal Tender</li>
              <li>Human Remains or Ashes</li>
              <li>Illegal Goods (Narcotics, Counterfeit Items)</li>
              <li>Ivory and certain endangered species products</li>
              <li>Loose Precious and Semi-Precious Stones</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#FF3D00] font-black uppercase italic text-xl border-b-2 border-[#CCFF00] inline-block mb-3">Dangerous Goods (Class 1-9)</h3>
            <ul className="list-disc pl-5 space-y-1 font-bold">
              <li>Explosives & Ammunition</li>
              <li>Flammable Liquids (Perfumes, Aftershaves, Nail Polish)</li>
              <li>Compressed Gases (Aerosols, Fire Extinguishers)</li>
              <li>Oxidizing Substances & Toxic materials</li>
              <li>Corrosives (Acids, Batteries containing liquid)</li>
              <li>Radioactive Materials</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#FF3D00] font-black uppercase italic text-xl border-b-2 border-[#CCFF00] inline-block mb-3">Restricted Items</h3>
            <p className="text-sm mb-2 opacity-70">These may require special documentation or packaging:</p>
            <ul className="list-disc pl-5 space-y-1 font-bold">
              <li>Lithium Batteries (Mobile phones, Laptops) - Max 2 per box</li>
              <li>Alcoholic Beverages (Specific country regulations apply)</li>
              <li>Perishable Foods (Requires Phytosanitary certificate)</li>
              <li>Medicine and Prescription Drugs</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Track Shipment Modal */}
      <Modal 
        isOpen={modal === 'track'} 
        onClose={() => setModal(null)} 
        title="Track Your Shipment"
      >
        <div className="py-6 flex flex-col items-center">
          <div className="w-full max-w-md">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">DHL Air Waybill (AWB) or SNL ID</label>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Ex: 1234567890..." 
                className="w-full border-4 border-black p-5 text-xl font-black italic uppercase outline-none shadow-[8px_8px_0px_0px_#CCFF00]"
                value={modalTrackId}
                onChange={(e) => setModalTrackId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && openExternalTracking(modalTrackId)}
              />
              <button 
                onClick={() => openExternalTracking(modalTrackId)}
                className="w-full bg-[#FF3D00] text-white font-black py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase italic tracking-widest hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Track Now
              </button>
            </div>
            <p className="mt-8 text-center text-sm font-bold text-gray-500 italic">
              Tracking data is pulled directly from our global courier partners. 
              Status updates usually appear 2-4 hours after dispatch.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;