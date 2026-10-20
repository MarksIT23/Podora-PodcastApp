/**
 * Data Service — calls the Express admin API for ALL data.
 * Zero mock fallback. If the backend is unreachable, operations throw.
 */

import api from './api';

// ============================================
// Categories
// ============================================

export async function fetchCategories() {
  const res = await api.get('/admin/categories');
  return res.data;
}

// ============================================
// Podcasts
// ============================================

export async function fetchPodcasts({ page = 1, pageSize = 10, search = '', category = '', status = '' } = {}) {
  const params = { page, pageSize };
  if (search) params.search = search;
  if (category) params.category = category;
  if (status) params.status = status;
  const res = await api.get('/admin/podcasts', { params });
  return res.data;
}

export async function fetchPodcastById(id) {
  const res = await api.get(`/admin/podcasts/${id}`);
  return res.data;
}

export async function createPodcast(podcastData) {
  const res = await api.post('/admin/podcasts', podcastData);
  return res.data;
}

export async function updatePodcast(id, updates) {
  const res = await api.put(`/admin/podcasts/${id}`, updates);
  return res.data;
}

export async function deletePodcast(id) {
  const res = await api.delete(`/admin/podcasts/${id}`);
  return res.data;
}

export async function duplicatePodcast(id) {
  const res = await api.post(`/admin/podcasts/${id}/duplicate`);
  return res.data;
}

export async function bulkUpdatePodcasts(ids, updates) {
  const res = await api.post('/admin/podcasts/bulk-update', { ids, updates });
  return res.data;
}

// ============================================
// Episodes
// ============================================

export async function fetchEpisodes({ podcastId, page = 1, pageSize = 20 } = {}) {
  const params = { page, pageSize };
  if (podcastId) params.podcastId = podcastId;
  const res = await api.get('/admin/episodes', { params });
  return res.data;
}

export async function fetchEpisodesByPodcast(podcastId) {
  return fetchEpisodes({ podcastId, pageSize: 100 });
}

export async function updateAdminEpisode(id, updates) {
  const res = await api.put(`/admin/episodes/${id}`, updates);
  return res.data;
}

// ============================================
// Users
// ============================================

export async function fetchUsers({ page = 1, pageSize = 10, search = '', role = '', status = '' } = {}) {
  const params = { page, pageSize };
  if (search) params.search = search;
  if (role) params.role = role;
  if (status) params.status = status;
  const res = await api.get('/admin/users', { params });
  return res.data;
}

export async function fetchUserById(id) {
  const res = await api.get(`/admin/users/${id}`);
  return res.data;
}

export async function updateUserStatus(userId, newStatus) {
  const res = await api.put(`/admin/users/${userId}/status`, { status: newStatus });
  return res.data;
}

export async function updateUserRole(userId, newRole) {
  const res = await api.put(`/admin/users/${userId}/role`, { role: newRole });
  return res.data;
}

export async function deleteUser(userId) {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
}

export async function createUser(userData) {
  const res = await api.post('/admin/users', userData);
  return res.data;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const res = await api.put(`/admin/users/${userId}/password`, { currentPassword, newPassword });
  return res.data;
}

// ============================================
// Analytics
// ============================================

export async function fetchAnalytics(timeRange = '30d') {
  const res = await api.get('/admin/dashboard', { params: { timeRange } });
  return res.data;
}

// ============================================
// Activity
// ============================================

export async function fetchRecentActivity({ page = 1, pageSize = 10 } = {}) {
  const res = await api.get('/admin/activity', { params: { page, pageSize } });
  return res.data;
}

// ============================================
// User-specific
// ============================================

export async function fetchListeningHistory({ page = 1, pageSize = 10 } = {}) {
  const res = await api.get('/admin/listening-history', { params: { page, pageSize } });
  return res.data;
}

export async function fetchPlaylists() {
  const res = await api.get('/admin/playlists');
  return res.data;
}

export async function createPlaylist({ name, description, emoji }) {
  const res = await api.post('/admin/playlists', { name, description, emoji });
  return res.data;
}

export async function updatePlaylist(id, updates) {
  const res = await api.put(`/admin/playlists/${id}`, updates);
  return res.data;
}

export async function deletePlaylist(id) {
  const res = await api.delete(`/admin/playlists/${id}`);
  return res.data;
}

export async function fetchSavedPodcasts() {
  const res = await api.get('/admin/saved-podcasts');
  return res.data;
}

export async function savePodcast(podcastId) {
  const res = await api.post('/admin/saved-podcasts', { podcastId });
  return res.data;
}

export async function unsavePodcast(podcastId) {
  const res = await api.delete(`/admin/saved-podcasts/${podcastId}`);
  return res.data;
}

export async function fetchPlaylistEpisodes(playlistId) {
  const res = await api.get(`/admin/playlists/${playlistId}/episodes`);
  return res.data;
}

export async function addEpisodeToPlaylist(playlistId, episodeId) {
  const res = await api.post(`/admin/playlists/${playlistId}/episodes`, { episodeId });
  return res.data;
}

export async function removeEpisodeFromPlaylist(playlistId, episodeId) {
  const res = await api.delete(`/admin/playlists/${playlistId}/episodes/${episodeId}`);
  return res.data;
}

// ============================================
// Search
// ============================================

export async function searchPodcasts(query, { page = 1, pageSize = 20 } = {}) {
  const res = await api.get('/admin/podcasts/search', { params: { q: query, page, pageSize } });
  return res.data;
}

// ============================================
// Settings
// ============================================

export async function fetchSettings() {
  const res = await api.get('/admin/settings');
  return res.data;
}

export async function updateSettings(settings) {
  const res = await api.put('/admin/settings', settings);
  return res.data;
}

// ============================================
// AI Highlights
// ============================================

export async function fetchAdminHighlights({ page = 1, pageSize = 20, status = '', episodeId = '' } = {}) {
  const params = { page, pageSize };
  if (status) params.status = status;
  if (episodeId) params.episodeId = episodeId;
  const res = await api.get('/admin/highlights', { params });
  return res.data;
}

export async function fetchAdminHighlightById(id) {
  const res = await api.get(`/admin/highlights/${id}`);
  return res.data;
}

export async function updateAdminHighlight(id, updates) {
  const res = await api.put(`/admin/highlights/${id}`, updates);
  return res.data;
}

export async function approveHighlight(id) {
  const res = await api.post(`/admin/highlights/${id}/approve`);
  return res.data;
}

export async function rejectHighlight(id) {
  const res = await api.post(`/admin/highlights/${id}/reject`);
  return res.data;
}

export async function deleteHighlight(id) {
  const res = await api.delete(`/admin/highlights/${id}`);
  return res.data;
}

export async function detectHighlightsForEpisode(episodeId) {
  const res = await api.post(`/admin/episodes/${episodeId}/detect`);
  return res.data;
}

export async function fetchHighlightCollections() {
  const res = await api.get('/admin/highlight-collections');
  return res.data;
}

export async function createHighlightCollection(data) {
  const res = await api.post('/admin/highlight-collections', data);
  return res.data;
}

export async function updateHighlightCollection(id, data) {
  const res = await api.put(`/admin/highlight-collections/${id}`, data);
  return res.data;
}

export async function deleteHighlightCollection(id) {
  const res = await api.delete(`/admin/highlight-collections/${id}`);
  return res.data;
}

// ============================================
// Public Stats
// ============================================

export async function fetchPublicStats() {
  const res = await api.get('/stats');
  return res.data;
}

// ============================================
// Real-time (no-op — not supported via REST API)
// ============================================

export function subscribeToTable(_table, _callback) {
  console.warn('[Data] Real-time subscriptions not available via admin API');
  return () => {};
}

// ============================================
// Feeds (RSS)
// ============================================

export async function fetchFeeds({ page = 1, pageSize = 20, status = '' } = {}) {
  const params = { page, pageSize };
  if (status) params.status = status;
  const res = await api.get('/admin/feeds', { params });
  return res.data;
}

export async function createFeed(url, category, podcastId) {
  const res = await api.post('/admin/feeds', { url, category, podcastId: podcastId || null });
  return res.data;
}

export async function deleteFeed(id) {
  const res = await api.delete(`/admin/feeds/${id}`);
  return res.data;
}

export async function fetchFeedJobs(feedId) {
  const res = await api.get('/admin/jobs', { params: { feedId } });
  return res.data;
}

export async function ingestFeed(feedId) {
  const res = await api.post(`/admin/feeds/${feedId}/ingest`);
  return res.data;
}

export async function ingestAllFeeds() {
  const res = await api.post('/admin/feeds/ingest-all');
  return res.data;
}

// ============================================
// Review Queue
// ============================================

export async function fetchReviews({ page = 1, pageSize = 20, status = '' } = {}) {
  const res = await api.get('/admin/reviews', { params: { page, pageSize, status } });
  return res.data;
}

export async function createReview(data) {
  const res = await api.post('/admin/reviews', data);
  return res.data;
}

export async function updateReview(id, updates) {
  const res = await api.put(`/admin/reviews/${id}`, updates);
  return res.data;
}

export async function deleteReview(id) {
  const res = await api.delete(`/admin/reviews/${id}`);
  return res.data;
}

// ============================================
// Raw Episodes Data
// ============================================

export async function fetchRawEpisodes({ page = 1, pageSize = 20, search = '' } = {}) {
  const res = await api.get('/admin/podcasts/raw', { params: { page, pageSize, search } });
  return res.data;
}
