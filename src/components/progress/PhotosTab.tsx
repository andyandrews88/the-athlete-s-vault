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
  const [compareAngle, setCompareAngle] = useState<string>('front');

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('progress_photos' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60);
    if (!data) return;

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

  // Comparison: oldest and newest for selected angle
  const anglePhotos = photos.filter(p => p.angle === compareAngle && p.url);
  const oldestPhoto = anglePhotos.length > 0 ? anglePhotos[anglePhotos.length - 1] : null;
  const newestPhoto = anglePhotos.length > 1 ? anglePhotos[0] : null;

  // Timeline: last 8 photos
  const timelinePhotos = photos.filter(p => p.url).slice(0, 8);

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Side-by-Side Comparison */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[8px] font-mono tracking-wider" style={{ color: 'hsl(var(--dim))' }}>Side-by-Side</span>
          <div className="flex gap-1">
            {ANGLES.map(a => (
              <button
                key={a}
                onClick={() => setCompareAngle(a)}
                className="px-2.5 py-1 rounded text-[8px] font-semibold capitalize"
                style={{
                  background: compareAngle === a ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                  color: compareAngle === a ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                  border: compareAngle === a ? 'none' : '1px solid hsl(var(--border))',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Before */}
          <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '3/4', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}>
            {oldestPhoto?.url ? (
              <>
                <img src={oldestPhoto.url} alt="Before" className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[7px] font-mono" style={{ background: 'hsla(0,0%,0%,0.7)', color: 'hsl(var(--dim))' }}>
                  {format(new Date(oldestPhoto.date), 'dd MMM')}
                </span>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span style={{ opacity: 0.3, fontSize: 32 }}>👤</span>
              </div>
            )}
          </div>

          {/* Current */}
          <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '3/4', background: 'hsla(192,91%,54%,0.07)', border: '1px solid hsla(192,91%,54%,0.25)' }}>
            {newestPhoto?.url ? (
              <>
                <img src={newestPhoto.url} alt="Current" className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[7px] font-mono" style={{ background: 'hsla(0,0%,0%,0.7)', color: 'hsl(var(--primary))' }}>
                  {format(new Date(newestPhoto.date), 'dd MMM')}
                </span>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span style={{ opacity: 0.3, fontSize: 32 }}>👤</span>
              </div>
            )}
          </div>
        </div>

        {oldestPhoto && newestPhoto && (
          <p className="text-center mt-2 text-[7px] font-mono" style={{ color: 'hsl(var(--ok))' }}>
            {format(new Date(oldestPhoto.date), 'dd MMM')} → {format(new Date(newestPhoto.date), 'dd MMM')}
          </p>
        )}
      </div>

      {/* Photo Timeline */}
      {timelinePhotos.length > 0 && (
        <div>
          <span className="text-[8px] font-mono tracking-wider block mb-3" style={{ color: 'hsl(var(--dim))' }}>Photo Timeline</span>
          <div className="grid grid-cols-4 gap-2">
            {timelinePhotos.map((p, i) => (
              <div
                key={p.id}
                className="rounded-md overflow-hidden"
                style={{
                  aspectRatio: '1',
                  background: i === 0 ? 'hsla(192,91%,54%,0.07)' : 'hsl(var(--bg3))',
                  border: i === 0 ? '1px solid hsla(192,91%,54%,0.3)' : '1px solid hsl(var(--border))',
                }}
              >
                {p.url ? (
                  <img src={p.url} alt={p.angle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span style={{ opacity: 0.3 }}>👤</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Photos */}
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
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', border: '1px solid hsl(var(--border))' }}>
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
                  <label className="flex flex-col items-center justify-center rounded-xl cursor-pointer"
                    style={{ aspectRatio: '3/4', background: 'hsl(var(--bg2))', border: '2px dashed hsl(var(--border2))' }}
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
                  <div key={angle} className="rounded-lg overflow-hidden" style={{ aspectRatio: '3/4', border: '1px solid hsl(var(--border))' }}>
                    <img src={photo.url} alt={`${angle} ${date}`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div key={angle} className="rounded-lg flex items-center justify-center" style={{ aspectRatio: '3/4', background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
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

      {/* Private storage note */}
      <p className="text-center text-[7px] font-mono" style={{ color: 'hsl(var(--dim))' }}>
        Photos stored in private encrypted bucket. Signed-URL access only.
      </p>
    </div>
  );
};

export default PhotosTab;
