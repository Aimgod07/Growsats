import {deliverScore} from './scoreDelivery';
import {shareRead} from './inFlight';
import {deviceIdentity} from './deviceIdentity';
import { trackedFetch } from './loading';
const TOKEN_KEY = "playloot.session.token";
const USER_KEY = "playloot.session.user";

export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8787"
).replace(/\/$/, "");

export const API_ENDPOINTS = {
  games: `${BACKEND_URL}/api/games/catalog`,
};

export const BACKEND = {
  config: `${BACKEND_URL}/api/config`,
  login: `${BACKEND_URL}/api/auth/login`,
  logout: `${BACKEND_URL}/api/auth/logout`,
  me: `${BACKEND_URL}/api/auth/me`,
  profile: `${BACKEND_URL}/api/profile`,
  wallet: `${BACKEND_URL}/api/wallet`,
  leaderboard: `${BACKEND_URL}/api/leaderboard`,
  players: `${BACKEND_URL}/api/players`,
  redeemOptions: `${BACKEND_URL}/api/redeem/options`,
  redeem: `${BACKEND_URL}/api/redeem`,
  playStart: `${BACKEND_URL}/api/games/play/start`,
  playClaim: `${BACKEND_URL}/api/games/play/claim`,
  spin: `${BACKEND_URL}/api/spin`,
  avatar: `${BACKEND_URL}/api/avatar`,
  register: `${BACKEND_URL}/api/auth/register`,
  settings: `${BACKEND_URL}/api/settings`,
  rewards: `${BACKEND_URL}/api/rewards`,
  notifications: `${BACKEND_URL}/api/notifications`,
  daily: `${BACKEND_URL}/api/daily`,
  missions: `${BACKEND_URL}/api/missions`,
  invite: `${BACKEND_URL}/api/invite`,
};

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('playloot:session-changed'));
    reportDevice();
  } catch {
    // storage unavailable (private mode) — session lasts for this tab only
  }
}

export function clearSession() {
  window.dispatchEvent(new Event('playloot:logout')); 
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('playloot:session-changed'));
}

export function signalWalletChanged() {
  window.dispatchEvent(new Event('playloot:wallet-changed'));
}

export function isSignedIn() {
  return Boolean(getToken());
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function request(path, options = {}) {
  if ((options.method || 'GET') !== 'GET') return requestOnce(path, options);
  const key = JSON.stringify([options.auth === false ? 'public' : getToken(), path]);
  return shareRead(key, () => requestOnce(path, options));
}

async function requestOnce(path, { method = "GET", body, auth = true, raw } = {}) {
  const headers = {};
  if (body !== undefined && !raw) headers["content-type"] = "application/json";
  if (raw && body !== undefined) headers["content-type"] = raw;
  if (auth) {
    const token = getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const res = await trackedFetch(path, {
    method,
    headers,
    body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = data?.error?.message || `Request failed: ${res.status}`;
    const code = data?.error?.code;
    if (res.status === 401) clearSession();
    throw new ApiError(message, res.status, code);
  }
  return data;
}

let deviceReportedFor='';
async function reportDevice(){
 const token=getToken();
 if(!token || deviceReportedFor===token)return;
 deviceReportedFor=token;
 try{const info=await deviceIdentity();if(info)await request(`${BACKEND_URL}/api/security/device`,{method:'POST',body:info});}
 catch{deviceReportedFor='';}
}
const redemptionIntents=new Map();
async function redeem(optionId){
 const storageKey=`playloot.redeem.${getStoredUser()?.id||'unknown'}.${optionId}`;
 let key=redemptionIntents.get(storageKey);
 try{key ||= sessionStorage.getItem(storageKey);}catch{}
 key ||= crypto.randomUUID();redemptionIntents.set(storageKey,key);
 try{sessionStorage.setItem(storageKey,key);}catch{}
 const clear=()=>{redemptionIntents.delete(storageKey);try{sessionStorage.removeItem(storageKey);}catch{}};
 try{const result=await request(BACKEND.redeem,{method:'POST',body:{optionId,idempotencyKey:key}});clear();signalWalletChanged();return result;}
 catch(e){if(e.status>=400&&e.status<500&&e.status!==429)clear();throw e;}
}
export const backend = {
  payments: offset=>request(`${BACKEND_URL}/api/payments?offset=${offset||0}`),
  createPayment: body=>request(`${BACKEND_URL}/api/payments`,{method:'POST',body}).then(data=>{signalWalletChanged();return data;}),
  retryPayment: id=>request(`${BACKEND_URL}/api/payments/${encodeURIComponent(id)}/retry`,{method:'POST'}).then(data=>{signalWalletChanged();return data;}),
  reminders: () => request(`${BACKEND_URL}/api/reminders`),
  nativePushStatus: () => request(`${BACKEND_URL}/api/push/native`),
  subscribeNativePush: token => request(`${BACKEND_URL}/api/push/native`,{method:'POST',body:{token}}),
  unsubscribeNativePush: token => request(`${BACKEND_URL}/api/push/native`,{method:'DELETE',body:{token}}),
  subscribeReminders: subscription => request(`${BACKEND_URL}/api/reminders`,{method:'POST',body:subscription}),
  unsubscribeReminders: endpoint => request(`${BACKEND_URL}/api/reminders`,{method:'DELETE',body:{endpoint}}),
  offers: () => request(`${BACKEND_URL}/api/offers`),
  offerAction: (id, action, proof) => request(`${BACKEND_URL}/api/offers/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: { proof } }).then(data=>{if(action==='claim')signalWalletChanged();return data;}),
  convertCoins: (payload) => request(BACKEND_URL+'/api/wallet/convert', {method:'POST',body:payload}).then(data=>{signalWalletChanged();return data;}),
  live: () => request(`${BACKEND_URL}/api/live`, { auth: false }),
  event: (id) => request(`${BACKEND_URL}/api/events/${encodeURIComponent(id)}`),
  joinEvent: (id) => request(BACKEND_URL+'/api/events/'+encodeURIComponent(id)+'/join',{method:'POST'}).then(data=>{signalWalletChanged();return data;}),
  claimEvent: (id) => request(`${BACKEND_URL}/api/events/${encodeURIComponent(id)}/claim`, { method: 'POST' }).then(data=>{signalWalletChanged();return data;}),
  eventHeartbeat: (sessionId) => request(`${BACKEND_URL}/api/game-events/heartbeat`, { method: 'POST', body: { sessionId } }),
  submitEventScore: (sessionId, score, runId) => deliverScore(body => request(`${BACKEND_URL}/api/game-events/score`, { method: 'POST', body }),sessionId,score,runId),
  config: () => request(BACKEND.config, { auth: false }),
  register: (name, email, password, inviteCode, turnstileToken) =>
    request(BACKEND.register, { method: "POST", body: { name, email, password, inviteCode, turnstileToken }, auth: false }).then((data) => {
      saveSession(data.token, data.user);
      return data;
    }),
  login: (email, password, code, turnstileToken) =>
    request(BACKEND.login, { method: "POST", body: { email, password, code, turnstileToken }, auth: false }).then(
      (data) => {
        saveSession(data.token, data.user);
        return data;
      },
    ),
  logout: () => request(BACKEND.logout, { method: "POST", body:{pushToken:localStorage.getItem('playloot.push.token')} }).finally(clearSession),
  me: () => request(BACKEND.me).then(data=>{reportDevice();return data;}),
  profile: () => request(BACKEND.profile),
  wallet: () => request(BACKEND.wallet),
  leaderboard: () => request(BACKEND.leaderboard),
  searchPlayers: (query) => request(`${BACKEND.players}/search?q=${encodeURIComponent(query)}`),
  playerProfile: (id) => request(`${BACKEND.players}/${encodeURIComponent(id)}`),
  redeemOptions: () => request(BACKEND.redeemOptions),
  redeem,
  startPlay: (gameCode, title, provider, eventId) => request(BACKEND.playStart, { method: "POST", body: { gameCode, title, provider, eventId } }),
  closePlay: (sessionId) => request(`${BACKEND_URL}/api/games/play/close`, { method: 'POST', body: { sessionId } }),
  claimPlay: (sessionId) => request(BACKEND.playClaim, { method: "POST", body: { sessionId } }).then(data=>{signalWalletChanged();return data;}),
  spinStatus: () => request(BACKEND.spin),
  spin: () => request(BACKEND.spin, { method: "POST" }).then(data=>{signalWalletChanged();return data;}),
  uploadAvatar: (file) => request(BACKEND.avatar, { method: "POST", body: file, raw: file.type }),
  settings: () => request(BACKEND.settings),
  saveSettings: (settings) => request(BACKEND.settings, { method: "PATCH", body: settings }),
  rewards: () => request(BACKEND.rewards),
  notifications: () => request(BACKEND.notifications),
  daily: () => request(BACKEND.daily),
  claimDaily: () => request(`${BACKEND.daily}/claim`, { method: "POST" }).then(data=>{signalWalletChanged();return data;}),
  missions: () => request(BACKEND.missions),
  claimMission: (id) => request(`${BACKEND.missions}/claim`, { method: "POST", body: { id } }).then(data=>{signalWalletChanged();return data;}),
  invite: () => request(BACKEND.invite),
  setupTwoStep: () => request(`${BACKEND.settings}/two-step/setup`, { method: "POST" }),
  enableTwoStep: (code) => request(`${BACKEND.settings}/two-step/enable`, { method: "POST", body: { code } }),
  disableTwoStep: (code) => request(`${BACKEND.settings}/two-step/disable`, { method: "POST", body: { code } }),
};

export function mapApiGame(raw) {
  return {
    id: raw.code,
    title: raw.name,
    description: raw.description,
    category: raw.category?.name,
    tag: raw.category?.name?.split("&")[0]?.trim() || "Arcade",
    orientation: raw.screen_orientation || "",
    thumbnail: raw.images?.square || raw.images?.thumb || raw.images?.cover,
    playUrl: raw.url,
    embedded: raw.embedded === true,
    providerId: raw.providerId || '',
  };
}

export async function fetchJson(url) {
  const res = await trackedFetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function extractGameList(data) {
  return Array.isArray(data) ? data : data.data || data.games || [];
}
