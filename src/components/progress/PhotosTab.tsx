import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Camera, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const ANGLES = ['front', 'side', 'back'] as const;

interface Photo { id: string; date: string; angle: string; storage_path: string; url?: string; }

const PhotosTab = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('progress_photos' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60);
    if (!data) return;

    // Get signed URLs for each photo
    const withUrls = await Promise.all(
      (data as any[]).map(async (p: any) => {
        const { data: urlData } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(p.storage_path, 3600);
        return { ...p, url: urlData?.signedUrl };
      })
    );
    setPhotos(withUrls);
  }, [user]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleUpload = async (angle: string, file: File) => {
    if (!user) return;
    setUploading(angle);
    const today = format(new Date(), 'yyyy-MM-dd');
    const path = `${user.id}/${today}_${angle}_${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }

    await (supabase.from('progress_photos' as any) as any).insert({
      user_id: user.id, date: today, angle, storage_path: path,
    });

    setUploading(null);
    fetchPhotos();
    toast({ title: `${angle} photo uploaded ✓` });
  };

  const handleDelete = async (photo: Photo) => {
    await supabase.storage.from('progress-photos').remove([photo.storage_path]);
    await (supabase.from('progress_photos' as any) as any).delete().eq('id', photo.id);
    fetchPhotos();
    toast({ title: 'Photo deleted' });
  };

  // Group photos by date
  const byDate = photos.reduce<Record<string, Photo[]>>((acc, p) => {
    (acc[p.date] = acc[p.date] || []).push(p);
    return acc;
  }, {});

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPhotos = byDate[today] || [];

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Upload cards */}
      <div>
        <span className="text-[9px] font-mono tracking-wider block mb-3" style={{ color: 'hsl(var(--primary))' }}>
          TODAY'S PHOTOS
        </span>
        <div className="grid grid-cols-3 gap-3">
          {ANGLES.map(angle => {
            const existing = todayPhotos.find(p => p.angle === angle);
            return (
              <div key={angle} className="relative">
                {existing?.url ? (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                    <img src={existing.url} alt={angle} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDelete(existing)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full"
                      style={{ background: 'hsla(var(--bad), 0.8)' }}
                    >
                      <Trash2 size={12} color="white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-[3/4] rounded-xl cursor-pointer"
                    style={{ background: 'hsl(var(--bg2))', border: '2px dashed hsl(var(--border2))' }}
                  >
                    <Camera size={20} style={{ color: 'hsl(var(--dim))' }} />
                    <span className="text-[9px] font-mono mt-1.5 tracking-wider" style={{ color: 'hsl(var(--dim))' }}>
                      {uploading === angle ? 'UPLOADING...' : angle.toUpperCase()}
                    </span>
                    <input
                      type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(angle, e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo history */}
      <div>
        <span className="text-[9px] font-mono tracking-wider block mb-3" style={{ color: 'hsl(var(--primary))' }}>HISTORY</span>
        {Object.entries(byDate).filter(([d]) => d !== today).map(([date, datePhotos]) => (
          <div key={date} className="mb-4">
            <span className="text-[10px] font-mono block mb-2" style={{ color: 'hsl(var(--dim))' }}>
              {format(new Date(date), 'dd MMM yyyy')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {ANGLES.map(angle => {
                const photo = datePhotos.find(p => p.angle === angle);
                return photo?.url ? (
                  <div key={angle} className="aspect-[3/4] rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                    <img src={photo.url} alt={`${angle} ${date}`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div key={angle} className="aspect-[3/4] rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                    <span className="text-[9px] font-mono" style={{ color: 'hsl(var(--dim))' }}>—</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(byDate).filter(d => d !== today).length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--dim))' }}>No previous photos</p>
        )}
      </div>
    </div>
  );
};

export default PhotosTab;
