import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Tabs, Badge, Button, EmptyState, SearchInput, ConfirmDialog, Modal, Input, LoadingSkeleton, Tooltip } from '../../components/ui';
import { Bookmark, Play, Trash2, Plus, ListMusic, History, Grid3X3, List, X } from 'lucide-react';
import { fetchSavedPodcasts, fetchPlaylists, fetchListeningHistory, createPlaylist, deletePlaylist, fetchPlaylistEpisodes, removeEpisodeFromPlaylist } from '../../services/data';
import { useToast } from '../../components/ui/Toast';
import { useAudio } from '../../components/AudioPlayer';

export default function UserLibrary() {
  const addToast = useToast();
  const navigate = useNavigate();
  const { play } = useAudio();
  const [saved, setSaved] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmPlaylistDelete, setConfirmPlaylistDelete] = useState(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);
  const [playlistEpisodes, setPlaylistEpisodes] = useState({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const loadData = () => {
    Promise.all([fetchSavedPodcasts(), fetchPlaylists(), fetchListeningHistory()]).then(
      ([savedRes, playlistsRes, historyRes]) => {
        setSaved(savedRes.data);
        setPlaylists(playlistsRes.data);
        setHistory(historyRes.data);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemoveSaved = (id) => {
    setSaved((prev) => prev.filter((p) => p.id !== id));
    setConfirmRemove(null);
  };

  const handleDeletePlaylist = async (id) => {
    try {
      await deletePlaylist(id);
      addToast('Playlist deleted.', 'success');
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } catch {
      addToast('Failed to delete playlist.', 'error');
    }
    setConfirmPlaylistDelete(null);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    setCreatingPlaylist(true);
    try {
      const res = await createPlaylist({ name: newPlaylistName });
      setPlaylists((prev) => [...prev, res.data]);
      addToast('Playlist created!', 'success');
      setShowCreatePlaylist(false);
      setNewPlaylistName('');
    } catch {
      addToast('Failed to create playlist.', 'error');
    }
    setCreatingPlaylist(false);
  };

  const sortSaved = (items) => {
    if (sortBy === 'alpha') return [...items].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'plays') return [...items].sort((a, b) => b.plays - a.plays);
    return items;
  };

  const filterSaved = (items) => {
    if (!search) return items;
    return items.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.host.toLowerCase().includes(search.toLowerCase()));
  };

  const SortButton = () => (
    <div className="flex items-center gap-2">
      <span className="text-caption text-[var(--text-tertiary)] hidden sm:inline">Sort:</span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-2 py-1 text-small bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--text-secondary)] outline-none cursor-pointer"
        aria-label="Sort by"
      >
        <option value="recent">Recently Saved</option>
        <option value="alpha">Alphabetical</option>
        <option value="plays">Most Plays</option>
      </select>
    </div>
  );

  const ViewToggle = () => (
    <div className="flex items-center border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
      <button
        onClick={() => setViewMode('grid')}
        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple-light)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
        aria-label="Grid view"
      >
        <Grid3X3 size={16} />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple-light)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
        aria-label="List view"
      >
        <List size={16} />
      </button>
    </div>
  );

  const tabs = [
    {
      id: 'saved',
      label: `Saved (${saved.length})`,
      content: (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="w-full sm:w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search saved podcasts..." />
            </div>
            <div className="flex items-center gap-2">
              {SortButton()}
              {ViewToggle()}
            </div>
          </div>
          {loading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : saved.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="No saved podcasts"
              message="Start browsing and save podcasts you love."
              action={<a href="/"><Button variant="primary" size="md">Browse Podcasts</Button></a>}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterSaved(sortSaved(saved)).map((podcast) => (
                <div
                  key={podcast.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img src={podcast.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-[var(--color-border)] bg-[var(--color-surface)]" aria-hidden="true" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-medium truncate">{podcast.title}</p>
                      <p className="text-caption text-[var(--text-tertiary)] truncate">{podcast.host}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="purple" size="sm">{podcast.categories?.[0] || podcast.categories?.[0]?.name}</Badge>
                    <span className="text-caption text-[var(--text-tertiary)]">{podcast.episodes} episodes</span>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => navigate(`/podcast/${podcast.id}`)}>
                      <Play size={14} aria-hidden="true" /> Play
                    </Button>
                    <button
                      onClick={() => setConfirmRemove(podcast.id)}
                      className="p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                      aria-label={`Remove ${podcast.title}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filterSaved(sortSaved(saved)).map((podcast) => (
                <div
                  key={podcast.id}
                  className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <img src={podcast.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-[var(--color-border)] bg-[var(--color-surface)]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium truncate">{podcast.title}</p>
                    <p className="text-caption text-[var(--text-tertiary)]">{podcast.host} · {podcast.categories?.[0] || podcast.categories?.[0]?.name}</p>
                  </div>
                  <span className="text-caption text-[var(--text-tertiary)]">{podcast.episodes} episodes</span>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/podcast/${podcast.id}`)}>
                    <Play size={14} aria-hidden="true" /> Play
                  </Button>
                  <button
                    onClick={() => setConfirmRemove(podcast.id)}
                    className="p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                    aria-label={`Remove ${podcast.title}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'playlists',
      label: `Playlists (${playlists.length})`,
      content: (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={() => setShowCreatePlaylist(true)}>
                <Plus size={16} aria-hidden="true" /> Create Playlist
              </Button>
            </div>
          </div>
          {loading ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : playlists.length === 0 ? (
            <EmptyState
              icon={ListMusic}
              title="No playlists yet"
              message="Create your first playlist to organize episodes."
            />
          ) : (
            <div className="space-y-2">
              {playlists.map((pl) => {
                const isExpanded = expandedPlaylistId === pl.id;
                const episodes = playlistEpisodes[pl.id] || [];
                return (
                  <div key={pl.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] overflow-hidden transition-all duration-300">
                    <div
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                      onClick={async () => {
                        if (isExpanded) {
                          setExpandedPlaylistId(null);
                        } else {
                          setExpandedPlaylistId(pl.id);
                          setLoadingEpisodes(true);
                          try {
                            const res = await fetchPlaylistEpisodes(pl.id);
                            setPlaylistEpisodes(prev => ({ ...prev, [pl.id]: res.data || [] }));
                          } catch {
                            setPlaylistEpisodes(prev => ({ ...prev, [pl.id]: [] }));
                          }
                          setLoadingEpisodes(false);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-orange)]/20 flex items-center justify-center" aria-hidden="true">
                          <span className="text-lg">{pl.emoji || '📋'}</span>
                        </div>
                        <div>
                          <p className="text-small font-medium">{pl.name}</p>
                          <p className="text-caption text-[var(--text-tertiary)]">{pl.episodeCount} episodes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmPlaylistDelete(pl.id); }}
                          className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all"
                          aria-label={`Delete ${pl.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-[var(--color-border)] px-5 py-3">
                        {loadingEpisodes && !episodes.length ? (
                          <p className="text-caption text-[var(--text-tertiary)] py-2">Loading episodes...</p>
                        ) : episodes.length === 0 ? (
                          <p className="text-caption text-[var(--text-tertiary)] py-2">No episodes in this playlist.</p>
                        ) : (
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {episodes.map(ep => (
                              <div
                                key={ep.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group/ep"
                              >
                                <button
                                  onClick={() => play({ id: ep.episodeId, audioUrl: ep.audioUrl, title: ep.episodeTitle, coverImage: ep.coverImage })}
                                  className="w-8 h-8 rounded-full bg-[var(--color-accent-purple)]/20 flex items-center justify-center shrink-0 hover:bg-[var(--color-accent-purple)] transition-colors"
                                >
                                  <Play size={12} className="text-[var(--color-accent-purple-light)] ml-0.5" fill="currentColor" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{ep.episodeTitle}</p>
                                  <p className="text-caption text-[var(--text-tertiary)]">{ep.podcastTitle}</p>
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await removeEpisodeFromPlaylist(pl.id, ep.episodeId);
                                      setPlaylistEpisodes(prev => ({
                                        ...prev,
                                        [pl.id]: prev[pl.id].filter(e => e.episodeId !== ep.episodeId),
                                      }));
                                      addToast('Episode removed.', 'success');
                                    } catch {
                                      addToast('Failed to remove episode.', 'error');
                                    }
                                  }}
                                  className="p-1 rounded text-[var(--text-tertiary)] opacity-0 group-hover/ep:opacity-100 hover:text-[var(--color-danger)] transition-all"
                                  aria-label={`Remove ${ep.episodeTitle}`}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'history',
      label: `History (${history.length})`,
      content: (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="w-full sm:w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search history..." />
            </div>
            <div className="flex items-center gap-2">
              {SortButton()}
            </div>
          </div>
          {loading ? (
            <LoadingSkeleton variant="table-row" count={4} />
          ) : history.length === 0 ? (
            <EmptyState
              icon={History}
              title="No listening history"
              message="Episodes you listen to will appear here."
            />
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-light)] transition-all duration-200 cursor-pointer"
                >
                  <span className="text-xl hidden sm:block" aria-hidden="true">{item.podcastEmoji || '🎙️'}</span>
                  <button
                    onClick={() => play({ id: item.episodeId || item.id, audioUrl: item.audioUrl, title: item.episodeTitle, host: item.podcastTitle, podcastId: item.podcastId, podcastTitle: item.podcastTitle, coverImage: item.coverImage })}
                    className="w-9 h-9 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center shrink-0 hover:bg-[var(--color-accent-purple-light)] transition-colors"
                    aria-label={`Play ${item.episodeTitle}`}>
                    <Play size={14} className="text-white ml-0.5" fill="white" aria-hidden="true" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium truncate">{item.episodeTitle}</p>
                    <p className="text-caption text-[var(--text-tertiary)]">{item.podcastTitle} · {item.duration}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <span className="text-caption text-[var(--text-tertiary)]">
                      {new Date(item.playedAt).toLocaleDateString()}
                    </span>
                    <Tooltip content={`${item.progress}% complete`}>
                      <div className="w-20 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden cursor-help">
                        <div
                          className={`h-full rounded-full ${item.progress === 100 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent-purple)]'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </Tooltip>
                  </div>
                  <span className={`text-caption shrink-0 ${item.progress === 100 ? 'text-[var(--color-success)]' : 'text-[var(--text-tertiary)]'}`}>
                    {item.progress === 100 ? 'Complete' : `${item.progress}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Library" description="Your saved podcasts, playlists, and listening history." />

      <Tabs tabs={tabs} defaultTab="saved" />

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => handleRemoveSaved(confirmRemove)}
        title="Remove from Library?"
        message="This podcast will be removed from your saved list."
        confirmLabel="Remove"
      />

      <ConfirmDialog
        open={!!confirmPlaylistDelete}
        onClose={() => setConfirmPlaylistDelete(null)}
        onConfirm={() => handleDeletePlaylist(confirmPlaylistDelete)}
        title="Delete Playlist?"
        message="This will permanently delete the playlist."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Create Playlist Modal */}
      <Modal
        open={showCreatePlaylist}
        onClose={() => { setShowCreatePlaylist(false); setNewPlaylistName(''); }}
        title="Create Playlist"
      >
        <div className="space-y-4">
          <Input
            label="Playlist Name"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="e.g., Favorites, Road Trip, Coding Mix"
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="md" onClick={() => { setShowCreatePlaylist(false); setNewPlaylistName(''); }}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreatePlaylist} disabled={creatingPlaylist || !newPlaylistName.trim()}>
              {creatingPlaylist ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
