'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createEvent } from '@/services/eventService';
import { uploadImage } from '@/services/storageService';
import { toast } from 'sonner';
import LocationPickerWrapper from '@/components/LocationPickerWrapper';
import DateTimePicker from '@/components/DateTimePicker';
import PromotionModal from '@/components/PromotionModal';

export default function CreateEventPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Urgent Needs');
  const [distance, setDistance] = useState('Local');
  const [image, setImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [urgency, setUrgency] = useState<'high' | 'normal'>('normal');
  
  const [needFunds, setNeedFunds] = useState(false);
  const [fundGoal, setFundGoal] = useState(1000);
  
  const [needVols, setNeedVols] = useState(false);
  const [volGoal, setVolGoal] = useState(10);
  
  const [needGoods, setNeedGoods] = useState(false);
  const [goodsItem, setGoodsItem] = useState('');
  const [goodsList, setGoodsList] = useState<string[]>([]);
  
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  
  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || loading) return;
    
    setLoading(true);
    try {
      const newEventId = await createEvent({
        title,
        description,
        organizer: profile.displayName || 'Anonymous',
        organizerId: user.uid,
        location: locationName || profile.location || 'Unknown Location',
        lat,
        lng,
        distance,
        category,
        urgency,
        imageUrl: image,
        eventDate,
        needs: {
          ...(needFunds ? { funds: { goal: fundGoal, current: 0 } } : {}),
          ...(needVols ? { volunteers: { goal: volGoal, current: 0 } } : {}),
          ...(needGoods && goodsList.length > 0 ? { goods: goodsList } : {})
        }
      });
      toast.success('Event published successfully!');
      router.push(`/event/${newEventId}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create event. Please try again.');
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
  };

  return (
    <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-28 md:pb-10">
      <div className="mb-10 animate-fade-in-up">
        <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-gradient-earth">Create an Event</h2>
        <p className="text-on-surface-variant font-medium mt-2">Start a local response initiative to gather volunteers or necessary supplies.</p>
      </div>

      <div className="premium-glass-strong p-6 md:p-8 animate-fade-in-up delay-100">
        <p className="text-on-surface-variant mb-6 pb-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          We believe in grassroots organizing. Share your vision and rally your community around local needs.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Event Title</label>
            <input 
              type="text" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface transition-all" 
              style={inputStyle}
              placeholder="e.g. Neighborhood Cleanup" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-on-surface">Description</label>
              <button 
                type="button" 
                onClick={async () => {
                  if (!title) {
                    toast.error('Please enter a title first to generate a description.');
                    return;
                  }
                  setGeneratingAi(true);
                  try {
                    const res = await fetch('/api/generate-description', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title, category }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setDescription(data.description);
                      toast.success('Description generated!');
                    } else {
                      toast.error(data.error || 'Failed to generate description');
                    }
                  } catch (err) {
                    toast.error('An error occurred while generating.');
                  } finally {
                    setGeneratingAi(false);
                  }
                }}
                disabled={generatingAi}
                className="text-xs flex items-center gap-1 font-bold transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-warm-amber)' }}
              >
                {generatingAi ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                )}
                {generatingAi ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <textarea 
              required
              className="w-full h-32 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface resize-none transition-all" 
              style={inputStyle}
              placeholder="Describe the goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-on-surface mb-2">Category</label>
              <select 
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface transition-all"
                style={inputStyle}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Urgent Needs</option>
                <option>Food Drive</option>
                <option>Volunteers</option>
                <option>Community</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-on-surface mb-2">Urgency Level</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('normal')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={urgency === 'normal' ? {
                    background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                    color: 'var(--color-on-primary-base)',
                    boxShadow: '0 3px 12px rgba(59,107,74,0.25)',
                  } : {
                    ...inputStyle,
                    color: 'var(--color-on-surface-base)',
                  }}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('high')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={urgency === 'high' ? {
                    background: 'linear-gradient(135deg, var(--color-error-base), #C44040)',
                    color: 'white',
                    boxShadow: '0 3px 12px rgba(184,50,48,0.25)',
                  } : {
                    ...inputStyle,
                    color: 'var(--color-on-surface-base)',
                  }}
                >
                  High
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-on-surface mb-2">Event Date & Time</label>
              <DateTimePicker 
                value={eventDate}
                onChange={(val) => setEventDate(val)}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-on-surface">Event Image</label>
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!title) {
                      toast.error('Please enter a title first to generate an image.');
                      return;
                    }
                    setGeneratingImage(true);
                    try {
                      toast.info('Generating image with AI...');
                      const prompt = `A high-quality, inspiring cover photo for a community event named: ${title}. ${category}. Beautiful lighting, realistic, no text.`;
                      
                      const response = await fetch('/api/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt }),
                      });
                      
                      if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || 'Failed to fetch AI image');
                      }
                      
                      const blob = await response.blob();
                      const file = new File([blob], "ai-generated-event.jpg", { type: "image/jpeg" });
                      
                      const url = await uploadImage(file, 'campaigns');
                      setImage(url);
                      toast.success('AI Image generated successfully!');
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to generate image. Please try again.');
                    } finally {
                      setGeneratingImage(false);
                    }
                  }}
                  disabled={generatingImage || uploadingImage}
                  className="text-xs flex items-center gap-1 font-bold transition-colors disabled:opacity-50"
                  style={{ color: 'var(--color-warm-amber)' }}
                >
                  {generatingImage ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">image</span>
                  )}
                  {generatingImage ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <label
                  className={`rounded-xl px-4 py-3 text-sm ${generatingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} flex-1 text-center font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80`}
                  style={inputStyle}
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  {uploadingImage ? 'Uploading...' : 'Choose File'}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    disabled={uploadingImage || generatingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const url = await uploadImage(file, 'campaigns');
                        setImage(url);
                      } catch(err) {
                        console.error('Failed to upload image', err);
                        toast.error('Failed to upload image. Please check permissions.');
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                </label>
                {image && (
                  <div className="w-12 h-12 rounded-lg relative overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--glass-border)' }}>
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-2">Optional. Leave blank to use a default image.</p>
            </div>
          </div>

          <div className="pt-6" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <label className="block text-sm font-bold text-on-surface mb-2">Event Location</label>
            <p className="text-xs text-on-surface-variant mb-4">Search for an address or click on the map to set the exact location.</p>
            <LocationPickerWrapper 
              onLocationSelect={(loc) => {
                setLocationName(loc.name);
                setLat(loc.lat);
                setLng(loc.lng);
              }}
            />
          </div>

          <div
            className="rounded-xl p-5"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="font-bold text-sm mb-4 text-on-surface">What do you need?</div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input type="checkbox" id="needFunds" checked={needFunds} onChange={(e) => setNeedFunds(e.target.checked)} className="w-5 h-5 rounded accent-[var(--color-primary-base)]" />
                <label htmlFor="needFunds" className="text-sm font-medium">Funds</label>
                {needFunds && (
                  <input type="number" value={fundGoal} onChange={(e) => setFundGoal(Number(e.target.value))} placeholder="Goal ($)" className="ml-auto w-32 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={inputStyle} />
                )}
              </div>
              <div className="flex items-center gap-4">
                <input type="checkbox" id="needVols" checked={needVols} onChange={(e) => setNeedVols(e.target.checked)} className="w-5 h-5 rounded accent-[var(--color-primary-base)]" />
                <label htmlFor="needVols" className="text-sm font-medium">Volunteers</label>
                {needVols && (
                  <input type="number" value={volGoal} onChange={(e) => setVolGoal(Number(e.target.value))} placeholder="Goal (people)" className="ml-auto w-32 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={inputStyle} />
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input type="checkbox" id="needGoods" checked={needGoods} onChange={(e) => setNeedGoods(e.target.checked)} className="w-5 h-5 rounded accent-[var(--color-primary-base)]" />
                  <label htmlFor="needGoods" className="text-sm font-medium">Specific Goods</label>
                </div>
                {needGoods && (
                  <div className="pl-9 space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={goodsItem} 
                        onChange={(e) => setGoodsItem(e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (goodsItem.trim()) {
                              setGoodsList([...goodsList, goodsItem.trim()]);
                              setGoodsItem('');
                            }
                          }
                        }}
                        placeholder="Add an item (e.g. Blankets) and press Enter" 
                        className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" 
                        style={inputStyle}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (goodsItem.trim()) {
                            setGoodsList([...goodsList, goodsItem.trim()]);
                            setGoodsItem('');
                          }
                        }}
                        className="px-4 py-1.5 rounded-lg text-sm font-bold text-on-primary transition-all"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))' }}
                      >
                        Add
                      </button>
                    </div>
                    {goodsList.length > 0 && (
                      <ul className="space-y-2">
                        {goodsList.map((item, index) => (
                          <li key={index} className="flex justify-between items-center px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                            <span>{item}</span>
                            <button 
                              type="button" 
                              onClick={() => setGoodsList(goodsList.filter((_, i) => i !== index))}
                              className="text-error hover:bg-error/10 p-1 rounded-md transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button 
              type="submit" 
              disabled={loading || !user} 
              className="flex-1 px-8 py-3 rounded-xl font-bold text-on-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                boxShadow: '0 4px 14px rgba(59,107,74,0.25)',
              }}
            >
              {loading ? 'Publishing...' : user ? 'Publish Event' : 'Sign in to publish'}
            </button>
            
            <button 
              type="button"
              onClick={() => setPromotionModalOpen(true)}
              className="flex-1 premium-button-muted font-bold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">campaign</span>
              Promote Event
            </button>
          </div>
        </form>
      </div>

      <PromotionModal 
        isOpen={promotionModalOpen} 
        onClose={() => setPromotionModalOpen(false)} 
      />
    </main>
  );
}
