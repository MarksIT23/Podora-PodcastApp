import supabase from './supabase';

export async function getPublicPodcasts({ page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('podcasts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const mapped = data.map(p => ({
    id: p.id,
    title: p.title || '',
    host: p.author || '',
    categories: p.category_id ? [{ name: 'Podcast' }] : [],
    description: (p.description || '').slice(0, 300),
    coverImage: p.image_url || '',
    episodes: 0,
    summary: '',
  }));

  return { data: mapped, total: count, page, pageSize };
}

export async function getPublicEpisodes({ page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('episodes')
    .select('*, podcasts!inner(title, author, image_url)', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const mapped = data.map(e => ({
    id: e.id,
    title: e.title || '',
    host: e.podcasts?.author || '',
    podcastTitle: e.podcasts?.title || '',
    podcastId: e.podcast_id,
    coverImage: e.podcasts?.image_url || '',
    date: e.published_at ? e.published_at.split('T')[0] : '',
    duration: e.duration ? String(e.duration) : '',
    category: 'General',
    excerpt: (e.description || '').slice(0, 200),
    audioUrl: e.audio_url,
  }));

  return { data: mapped, total: count, page, pageSize };
}

export async function getPublicPodcastById(id) {
  const { data, error } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getEpisodesByPodcast(podcastId, { page = 1, pageSize = 50 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('podcast_id', podcastId)
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return (data || []).map(e => ({
    id: e.id,
    title: e.title || '',
    description: (e.description || '').slice(0, 200),
    audioUrl: e.audio_url,
    duration: e.duration ? String(e.duration) : '',
    date: e.published_at ? e.published_at.split('T')[0] : '',
    publishedAt: e.published_at,
  }));
}

export async function getPublicCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getPublicStats() {
  const { data: podcasts, error: podErr } = await supabase
    .from('podcasts')
    .select('id');

  const { data: episodes, error: epErr } = await supabase
    .from('episodes')
    .select('id');

  if (podErr || epErr) throw podErr || epErr;

  return {
    totalPodcasts: podcasts?.length || 0,
    totalEpisodes: episodes?.length || 0,
    totalPlays: 0,
  };
}

export function subscribeToTable(table, callback) {
  const channel = supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
