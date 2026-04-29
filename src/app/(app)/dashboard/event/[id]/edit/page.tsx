'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEventById, updateEvent, ADMIN_EMAILS } from '@/services/eventService';
import { uploadImage } from '@/services/storageService';
import { toast } from 'sonner';
import LocationPickerWrapper from '@/components/LocationPickerWrapper';
import DateTimePicker from '@/components/DateTimePicker';
import { ArrowLeft } from 'lucide-react';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Urgent Needs');
  const [distance, setDistance] = useState('Local');
  const [image, setImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [urgency, setUrgency] = useState<'high' | 'normal'>('normal');
  
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const loadEvent = async () => {
      try {
        const eventData = await getEventById(eventId);
        if (!eventData) {
          toast.error('Event not found.');
          router.push('/dashboard');
          return;
        }

        if (eventData.organizerId !== user.uid && !ADMIN_EMAILS.includes(user.email || '')) {
          toast.error('You do not have permission to edit this event.');
          router.push('/dashboard');
          return;
        }

        setTitle(eventData.title || '');
        setDescription(eventData.description || '');
        setCategory(eventData.category || 'Urgent Needs');
        setDistance(eventData.distance || 'Local');
        setImage(eventData.imageUrl || eventData.image || '');
        setEventDate(eventData.eventDate || '');
        setUrgency(eventData.urgency || 'normal');
        setLocationName(eventData.location || '');
        setLat(eventData.lat);
        setLng(eventData.lng);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load event details.');
      } finally {
        setLoading(false);
      }
    };
    
    loadEvent();
  }, [eventId, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    
    setSaving(true);
    try {
      await updateEvent(eventId, {
        title,
        description,
        location: locationName,
        lat,
        lng,
        distance,
        category,
        urgency,
        imageUrl: image,
        eventDate,
      });
      toast.success('Event updated successfully!');
      router.push(`/dashboard/event/${eventId}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full pb-28 md:pb-10">
      <button 
        onClick={() => router.push(`/dashboard/event/${eventId}`)}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Event Dashboard
      </button>

      <div className="mb-10">
        <h2 className="font-headline text-3xl md:text-4xl text-on-surface font-bold">Edit Event</h2>
        <p className="text-secondary font-medium mt-2">Update the event details and keep your support efforts on track.</p>
      </div>

      <div className="premium-panel p-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Event Title</label>
            <input 
              type="text" 
              required
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-on-surface">Description</label>
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
                className="text-xs flex items-center gap-1 font-bold text-primary hover:text-primary-container transition-colors disabled:opacity-50"
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
              className="w-full h-32 bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface resize-none" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-on-surface mb-2">Category</label>
              <select 
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
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
              <label className="block text-sm font-semibold text-on-surface mb-2">Urgency Level</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setUrgency('normal')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${urgency === 'normal' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface border border-outline-variant/50'}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('high')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${urgency === 'high' ? 'bg-error text-on-error' : 'bg-surface-container-low text-on-surface border border-outline-variant/50'}`}
                >
                  High
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-on-surface mb-2">Event Date & Time</label>
              <DateTimePicker 
                value={eventDate}
                onChange={(val) => setEventDate(val)}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-on-surface">Event Image</label>
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
                  className="text-xs flex items-center gap-1 font-bold text-primary hover:text-primary-container transition-colors disabled:opacity-50"
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
                <label className={`bg-surface-container-low hover:bg-surface-container-high transition-colors border border-outline-variant/50 rounded-xl px-4 py-3 text-sm text-on-surface ${generatingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} flex-1 text-center font-medium flex items-center justify-center gap-2`}>
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
                  <div className="w-12 h-12 rounded-lg relative overflow-hidden flex-shrink-0 border border-outline-variant/30">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant/30 pt-6">
            <label className="block text-sm font-semibold text-on-surface mb-2">Event Location</label>
            <p className="text-xs text-on-surface-variant mb-4">Current location: {locationName}</p>
            <LocationPickerWrapper 
              onLocationSelect={(loc) => {
                setLocationName(loc.name);
                setLat(loc.lat);
                setLng(loc.lng);
              }}
            />
          </div>

          <div className="border-t border-outline-variant/30 pt-6">
            <button 
              type="submit" 
              disabled={saving || !user} 
              className="w-full bg-primary text-on-primary px-8 py-3 rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
