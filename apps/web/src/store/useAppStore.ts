import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';
import { getApiBase, resolveApiUrl, usesRealtimeSocket } from '../config/api';
import { readApiError } from '../lib/api-error';

import type { EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types';
import { canEquipCosmetic, cosmeticById } from '@duopoker/shared-types';
import { loadResolvedEquipped, writeEquipped } from '../lib/cosmetics-client';

const LS_ACCESS = 'duopoker_access';
const LS_REFRESH = 'duopoker_refresh';
const LS_GUEST = 'duopoker_guest_id';
const LS_USER_ID = 'duopoker_user_id';

const guestId = (): string => {
  try {
    let id = localStorage.getItem(LS_GUEST);
    if (!id) {
      id = `guest-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(LS_GUEST, id);
    }
    return id;
  } catch {
    return `guest-${Math.random().toString(36).slice(2, 12)}`;
  }
};

type AppStore = {
  userId: string;
  email?: string;
  nickname?: string;
  displayName?: string;
  avatarUrl?: string | null;
  tableStatus?: string | null;
  chips?: number;
  userRole: 'USER' | 'SUPERADMIN';
  subscriptionTier: SubscriptionTier;
  equipped: EquippedCosmetics;
  inventory: string[];
  accessToken?: string;
  refreshToken?: string;
  mode: 'HOLDEM' | 'RASPISNOY';
  session?: SessionState;
  socket?: Socket;
  authError?: string;
  authNotice?: string;
  sessionError?: string;
  opponentType: 'HUMAN' | 'BOT';
  botPlayerCount: number;
  pollTimer?: ReturnType<typeof setInterval>;
  setMode: (mode: 'HOLDEM' | 'RASPISNOY') => void;
  setOpponentType: (opponentType: 'HUMAN' | 'BOT') => void;
  setBotPlayerCount: (count: number) => void;
  setTokens: (access: string, refresh: string, userId: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  connect: () => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  queue: () => Promise<{ status: 'waiting' | 'matched' | 'error'; sessionId?: string; message?: string }>;
  pollQueueStatus: () => Promise<{
    status: 'idle' | 'waiting' | 'matched' | 'error';
    sessionId?: string;
    message?: string;
  }>;
  leaveQueue: () => Promise<void>;
  joinSession: (sessionId: string, mode?: 'HOLDEM' | 'RASPISNOY', buyIn?: number) => Promise<void>;
  pollSession: (sessionId: string) => void;
  stopPolling: () => void;
  playerAction: (payload: {
    sessionId: string;
    type: 'bet' | 'check' | 'fold' | 'call' | 'raise';
    amount?: number;
  }) => Promise<void>;
  readyNextHand: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: {
    displayName?: string;
    avatar?: string | null;
    tableStatus?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  fetchClubs: () => Promise<{ clubs: ClubSummary[] }>;
  createClub: (name: string, description?: string) => Promise<{ club: { id: string } }>;
  fetchClub: (clubId: string) => Promise<ClubDetail>;
  upgradeClubPlan: (clubId: string, tier: 'PRO' | 'NETWORK') => Promise<void>;
  addClubMember: (clubId: string, query: string) => Promise<void>;
  createPrivateTable: (
    clubId: string,
    data: { name: string; mode: 'HOLDEM' | 'RASPISNOY'; maxPlayers?: number; virtualBuyIn?: number }
  ) => Promise<{ table: { id: string } }>;
  inviteToTable: (clubId: string, tableId: string, query: string) => Promise<void>;
  startPrivateTable: (clubId: string, tableId: string) => Promise<string>;
  joinPrivateTable: (clubId: string, tableId: string) => Promise<string>;
  acceptInviteByCode: (code: string) => Promise<{ clubId: string; tableId: string }>;
  buyCosmetic: (itemId: string) => Promise<void>;
  equipCosmetic: (itemId: string) => void;
};

export type ClubSummary = {
  id: string;
  name: string;
  myRole?: string;
  organizerPlan?: { tier: string; expiresAt: string };
  _count?: { members: number; privateTables: number };
  limits?: { maxMembers: number; maxActiveTables: number };
  members?: Array<{ user: { id: string; nickname: string; displayName: string }; role: string }>;
  usage?: { members: number; activeTables: number };
};

export type ClubDetail = {
  club: ClubSummary & {
    members: Array<{ user: { id: string; nickname: string; displayName: string }; role: string }>;
    usage?: { members: number; activeTables: number };
  };
};

const readStored = (): { access?: string; refresh?: string; storedUserId?: string } => {
  try {
    return {
      access: localStorage.getItem(LS_ACCESS) ?? undefined,
      refresh: localStorage.getItem(LS_REFRESH) ?? undefined,
      storedUserId: localStorage.getItem(LS_USER_ID) ?? undefined
    };
  } catch {
    return {};
  }
};

export const useAppStore = create<AppStore>((set, get) => {
  const initial = readStored();
  return {
    userId: initial.storedUserId ?? guestId(),
    userRole: 'USER',
    subscriptionTier: 'FREE',
    equipped: loadResolvedEquipped(initial.storedUserId ?? guestId(), 'FREE'),
    inventory: [],
    accessToken: initial.access,
    refreshToken: initial.refresh,
    mode: 'HOLDEM',
    opponentType: 'BOT',
    botPlayerCount: 2,
    setMode: (mode) => set({ mode }),
    setOpponentType: (opponentType) => set({ opponentType }),
    setBotPlayerCount: (botPlayerCount) => set({ botPlayerCount }),
    setTokens: (access, refresh, userId) => {
      localStorage.setItem(LS_ACCESS, access);
      localStorage.setItem(LS_REFRESH, refresh);
      localStorage.setItem(LS_USER_ID, userId);
      set({ accessToken: access, refreshToken: refresh, userId, authError: undefined });
    },
    logout: () => {
      get().stopPolling();
      void get().leaveQueue();
      get().socket?.disconnect();
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      localStorage.removeItem(LS_USER_ID);
      set({
        accessToken: undefined,
        refreshToken: undefined,
        userId: guestId(),
        socket: undefined,
        session: undefined,
        email: undefined,
        displayName: undefined,
        chips: undefined,
        userRole: 'USER'
      });
      if (usesRealtimeSocket()) queueMicrotask(() => get().connect());
    },
    refreshAccessToken: async () => {
      const rt = get().refreshToken;
      if (!rt) return false;
      try {
        const res = await fetch(resolveApiUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt })
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        get().setTokens(data.accessToken, data.refreshToken, get().userId);
        return true;
      } catch {
        return false;
      }
    },
    connect: () => {
      if (!usesRealtimeSocket()) return;
      const base = getApiBase();
      if (!base) return;
      const existing = get().socket;
      if (existing?.connected) return;
      if (existing) {
        existing.connect();
        return;
      }
      const token = get().accessToken;
      const socket = io(base, {
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelayMax: 10_000,
        transports: ['websocket', 'polling']
      });
      socket.on('stateUpdate', (session: SessionState) => set({ session, sessionError: undefined }));
      socket.on('sessionEvent', (evt: { state?: SessionState }) => {
        if (evt.state) set({ session: evt.state, sessionError: undefined });
      });
      socket.on('sessionReconnected', (payload: { snapshot?: SessionState | null }) => {
        if (payload.snapshot) set({ session: payload.snapshot, sessionError: undefined });
      });
      socket.on('sessionError', (err: { code?: string }) => {
        set({ sessionError: err.code ?? 'session_error' });
      });
      socket.on('connect', () => {
        const sid = get().session?.sessionId;
        if (sid) socket.emit('reconnectSession', { sessionId: sid });
      });
      set({ socket });
    },
    apiFetch: async (path, init = {}) => {
      const url = resolveApiUrl(path);
      const headers = new Headers(init.headers);
      const token = get().accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
      }
      let res = await fetch(url, { ...init, headers });
      if (res.status === 401 && get().refreshToken) {
        const ok = await get().refreshAccessToken();
        if (ok) {
          const retryHeaders = new Headers(init.headers);
          const newToken = get().accessToken;
          if (newToken) retryHeaders.set('Authorization', `Bearer ${newToken}`);
          if (!retryHeaders.has('Content-Type') && init.body) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          res = await fetch(url, { ...init, headers: retryHeaders });
        }
      }
      return res;
    },
    queue: async () => {
      set({ sessionError: undefined });
      if (!get().accessToken) {
        set({ sessionError: 'sign_in' });
        return { status: 'error' as const, message: 'sign_in' };
      }
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('queueMatchmaking', {
          userId: get().userId,
          mode: get().mode,
          buyIn: 100,
          opponent: get().opponentType === 'BOT' ? 'bot' : 'human',
          playerCount: get().botPlayerCount
        });
        return { status: 'waiting' as const };
      }
      const res = await get().apiFetch('/game/queue', {
        method: 'POST',
        body: JSON.stringify({
          mode: get().mode,
          buyIn: 100,
          opponent: get().opponentType === 'BOT' ? 'bot' : 'human',
          playerCount: get().botPlayerCount
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = readApiError(err, 'queue_failed');
        set({ sessionError: message });
        return { status: 'error' as const, message };
      }
      const data = (await res.json()) as {
        status: 'waiting' | 'matched' | 'idle';
        sessionId?: string;
        mode?: 'HOLDEM' | 'RASPISNOY';
        buyIn?: number;
      };
      if (data.status === 'matched' && data.sessionId) {
        await get().joinSession(data.sessionId, data.mode ?? get().mode, data.buyIn ?? 100);
        return { status: 'matched', sessionId: data.sessionId };
      }
      return { status: 'waiting' };
    },
    pollQueueStatus: async () => {
      if (!get().accessToken) {
        return { status: 'idle' as const };
      }
      const res = await get().apiFetch('/game/queue/status');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = readApiError(err, 'queue_failed');
        set({ sessionError: message });
        return { status: 'error' as const, message };
      }
      const data = (await res.json()) as {
        status: 'idle' | 'waiting' | 'matched';
        sessionId?: string;
        mode?: 'HOLDEM' | 'RASPISNOY';
        buyIn?: number;
      };
      if (data.status === 'matched' && data.sessionId) {
        await get().joinSession(data.sessionId, data.mode ?? get().mode, data.buyIn ?? 100);
        return { status: 'matched', sessionId: data.sessionId };
      }
      return { status: data.status === 'idle' ? 'idle' : 'waiting' };
    },
    leaveQueue: async () => {
      if (usesRealtimeSocket()) return;
      if (!get().accessToken) return;
      await get().apiFetch('/game/queue', { method: 'DELETE' });
    },
    joinSession: async (sessionId, mode, buyIn = 100) => {
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('joinSession', {
          sessionId,
          userId: get().userId,
          mode: mode ?? get().mode,
          buyIn
        });
        return;
      }
      const res = await get().apiFetch('/game/join', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          mode: mode ?? get().mode,
          buyIn
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'join_failed' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },
    pollSession: (sessionId) => {
      if (usesRealtimeSocket()) return;
      get().stopPolling();
      const tick = async () => {
        try {
          const res = await get().apiFetch(`/game/session/${encodeURIComponent(sessionId)}`);
          if (!res.ok) return;
          const data = (await res.json()) as { session: SessionState | null };
          if (data.session) set({ session: data.session });
        } catch {
          /* ignore */
        }
      };
      void tick();
      const pollTimer = setInterval(tick, 900);
      set({ pollTimer });
    },
    stopPolling: () => {
      const t = get().pollTimer;
      if (t) clearInterval(t);
      set({ pollTimer: undefined });
    },
    playerAction: async ({ sessionId, type, amount }) => {
      if (usesRealtimeSocket()) {
        get().socket?.emit('playerAction', {
          sessionId,
          userId: get().userId,
          type,
          amount,
          at: Date.now()
        });
        return;
      }
      const res = await get().apiFetch('/game/action', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          type,
          amount,
          at: Date.now()
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'action_rejected' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },
    readyNextHand: async () => {
      const sid = get().session?.sessionId;
      if (!sid) return;
      if (usesRealtimeSocket()) {
        get().socket?.emit('readyNextHand', { sessionId: sid, userId: get().userId });
        return;
      }
      const res = await get().apiFetch('/game/ready-next-hand', {
        method: 'POST',
        body: JSON.stringify({ sessionId: sid })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'ready_failed' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },
    register: async (email, password, displayName) => {
      set({ authError: undefined, authNotice: undefined });
      let res: Response;
      try {
        res = await fetch(resolveApiUrl('/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName })
        });
      } catch {
        set({ authError: 'network' });
        throw new Error('register failed');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ authError: readApiError(err, 'registrationFailed') });
        throw new Error('register failed');
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          email: string;
          displayName: string;
          emailVerified?: boolean;
          role?: 'USER' | 'SUPERADMIN';
        };
        verificationRequired?: boolean;
      };
      localStorage.setItem(LS_ACCESS, data.accessToken);
      localStorage.setItem(LS_REFRESH, data.refreshToken);
      localStorage.setItem(LS_USER_ID, data.user.id);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        userRole: data.user.role ?? 'USER',
        authError: undefined,
        authNotice: data.verificationRequired ? 'verificationRequired' : undefined
      });
      get().socket?.disconnect();
      set({ socket: undefined });
      get().connect();
      await get().fetchProfile();
    },
    login: async (email, password) => {
      set({ authError: undefined, authNotice: undefined });
      let res: Response;
      try {
        res = await fetch(resolveApiUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
      } catch {
        set({ authError: 'network' });
        throw new Error('login failed');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ authError: readApiError(err, 'invalidCredentials') });
        throw new Error('login failed');
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; displayName: string; role?: 'USER' | 'SUPERADMIN' };
      };
      get().setTokens(data.accessToken, data.refreshToken, data.user.id);
      set({
        email: data.user.email,
        displayName: data.user.displayName,
        userRole: data.user.role ?? 'USER',
        authError: undefined
      });
      get().socket?.disconnect();
      set({ socket: undefined });
      get().connect();
      await get().fetchProfile();
    },
    fetchProfile: async () => {
      const token = get().accessToken;
      if (!token) return;
      try {
        const res = await get().apiFetch('/auth/me');
        if (!res.ok) return;
        const data = (await res.json()) as {
          user: {
            chips: number;
            displayName: string;
            email: string;
            nickname?: string;
            avatar?: string | null;
            tableStatus?: string | null;
            role?: 'USER' | 'SUPERADMIN';
          } | null;
          subscription?: { tier: SubscriptionTier } | null;
          inventory?: Array<{ itemId: string; equipped?: boolean }>;
        };
        if (data.user) {
          const uid = get().userId;
          const tier = data.subscription?.tier ?? 'FREE';
          const inventory = (data.inventory ?? []).map((i) => i.itemId);
          const equipped = loadResolvedEquipped(uid, tier, inventory);
          set({
            chips: data.user.chips,
            displayName: data.user.displayName,
            email: data.user.email,
            nickname: data.user.nickname,
            avatarUrl: data.user.avatar ?? null,
            tableStatus: data.user.tableStatus ?? null,
            userRole: data.user.role ?? 'USER',
            subscriptionTier: tier,
            inventory,
            equipped
          });
        }
      } catch {
        /* ignore */
      }
    },
    updateProfile: async (data) => {
      const uid = get().userId;
      const token = get().accessToken;
      if (!token) return { ok: false, error: 'notSignedIn' };
      try {
        const res = await get().apiFetch(`/profile/${encodeURIComponent(uid)}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: readApiError(err, 'saveFailed') };
        }
        const updated = (await res.json()) as {
          displayName: string;
          avatar?: string | null;
          tableStatus?: string | null;
        };
        set({
          displayName: updated.displayName,
          avatarUrl: updated.avatar ?? null,
          tableStatus: updated.tableStatus ?? null
        });
        return { ok: true };
      } catch {
        return { ok: false, error: 'network' };
      }
    },
    fetchClubs: async () => {
      const res = await get().apiFetch('/clubs/mine');
      if (!res.ok) throw new Error('Failed to load clubs');
      return (await res.json()) as { clubs: ClubSummary[] };
    },
    createClub: async (name, description) => {
      const res = await get().apiFetch('/clubs', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) throw new Error('Failed to create club');
      return (await res.json()) as { club: { id: string } };
    },
    fetchClub: async (clubId) => {
      const res = await get().apiFetch(`/clubs/${clubId}`);
      if (!res.ok) throw new Error('Failed to load club');
      return (await res.json()) as ClubDetail;
    },
    upgradeClubPlan: async (clubId, tier) => {
      const res = await get().apiFetch(`/clubs/${clubId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ tier })
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = (await res.json()) as { confirmationUrl: string };
      window.location.href = data.confirmationUrl;
    },
    addClubMember: async (clubId, query) => {
      const body = query.startsWith('@') || !query.includes('-')
        ? { nickname: query.replace(/^@/, '') }
        : { userId: query };
      const res = await get().apiFetch(`/clubs/${clubId}/members`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to add member');
    },
    createPrivateTable: async (clubId, data) => {
      const res = await get().apiFetch(`/clubs/${clubId}/private-tables`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create table');
      return (await res.json()) as { table: { id: string } };
    },
    inviteToTable: async (clubId, tableId, query) => {
      const body = query.startsWith('@') || !query.includes('-')
        ? { nickname: query.replace(/^@/, '') }
        : { userId: query };
      const res = await get().apiFetch(`/clubs/${clubId}/private-tables/${tableId}/invite`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to invite');
    },
    startPrivateTable: async (clubId, tableId) => {
      const res = await get().apiFetch(`/clubs/${clubId}/private-tables/${tableId}/start`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to start table');
      const data = (await res.json()) as { sessionId: string };
      return data.sessionId;
    },
    joinPrivateTable: async (clubId, tableId) => {
      const res = await get().apiFetch(`/clubs/${clubId}/private-tables/${tableId}/join`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to join table');
      const data = (await res.json()) as { sessionId: string };
      await get().joinSession(data.sessionId);
      return data.sessionId;
    },
    acceptInviteByCode: async (code) => {
      const res = await get().apiFetch(`/clubs/invite/${code}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to accept invite');
      const data = (await res.json()) as { clubId: string; tableId: string };
      return data;
    },
    buyCosmetic: async (itemId) => {
      const res = await get().apiFetch('/monetization/shop/cosmetic', {
        method: 'POST',
        body: JSON.stringify({ itemId })
      });
      if (!res.ok) throw new Error('Purchase failed');
      await get().fetchProfile();
    },
    equipCosmetic: (itemId) => {
      const def = cosmeticById(itemId);
      if (!def) return;
      const { subscriptionTier, inventory, userId, equipped } = get();
      if (!canEquipCosmetic(itemId, subscriptionTier, inventory)) return;
      const next = { ...equipped };
      if (def.slot === 'deck') next.deck = itemId;
      if (def.slot === 'chip') next.chip = itemId;
      if (def.slot === 'frame') next.frame = itemId;
      writeEquipped(userId, next);
      set({ equipped: next });
    }
  };
});
