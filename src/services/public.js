const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

let supabaseClientPromise = null;

async function getSupabase() {
  if (supabaseClientPromise === null) {
    supabaseClientPromise = (async () => {
      try {
        const mod = await import('./supabase');
        return mod.default || null;
      } catch {
        return null;
      }
    })();
  }
  return supabaseClientPromise;
}

async function supabaseFetch(table, query) {
  const client = await getSupabase();
  if (!client) return null;
  try {
    return await client.from(table).select(query.select, query.options)
      .order(query.order || 'created_at', { ascending: false })
      .range(query.from, query.to);
  } catch {
    return null;
  }
}

export async function fetchLatestEpisodes({ page = 1, pageSize = 10 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = await getSupabase();
  if (client) {
    try {
      const { data, error, count } = await client
        .from('episodes')
        .select('*, podcasts!inner(title, author, image_url)', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        return {
          data: data.map(e => ({
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
          })),
          total: count, page, pageSize,
        };
      }
    } catch {
      // fall through to Express API
    }
  }

  const res = await fetch(`${API_BASE}/episodes?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error('Failed to fetch episodes');
  return res.json();
}

export async function fetchPublicPodcasts({ page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = await getSupabase();
  if (client) {
    try {
      const { data, error, count } = await client
        .from('podcasts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        return {
          data: data.map(p => ({
            id: p.id,
            title: p.title || '',
            host: p.author || '',
            categories: [],
            description: (p.description || '').slice(0, 300),
            coverImage: p.image_url || '',
            episodes: 0,
            summary: '',
          })),
          total: count, page, pageSize,
        };
      }
    } catch {
      // fall through to Express API
    }
  }

  const res = await fetch(`${API_BASE}/podcasts?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error('Failed to fetch podcasts');
  return res.json();
}
