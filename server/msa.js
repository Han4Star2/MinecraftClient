/* Microsoft account sign-in via the OAuth 2.0 device-code flow, then the
   Xbox Live → XSTS → Minecraft services chain.

   Open source ships no embedded secrets: the user supplies their own Azure
   application (client) ID — a public client with device-code flow enabled,
   free to register. Offline mode never touches any of this. */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { fetchBuf, fetchJson } from './net.js';
import { getDataDir, getSettings } from './store.js';
import { readJson, writeFileAtomic } from './util.js';

const SCOPE = 'XboxLive.signin offline_access';
const DEVICE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MC_LOGIN_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MC_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile';

let flow = null;    // { state:'pending'|'done'|'failed', user_code, verification_uri, error }
let session = null; // { name, uuid, accessToken, userType:'msa', xuid }

const sessionFile = () => path.join(getDataDir(), 'msa-session.json');

export async function loadPersistedSession() {
  const s = await readJson(sessionFile());
  if (s?.accessToken && s?.uuid) session = s;
}

export function getMsaSession() {
  return session;
}

export function msaStatus() {
  if (!flow) return { state: session ? 'done' : 'idle', name: session?.name || null };
  return { state: flow.state, name: session?.name || null, error: flow.error || null };
}

function form(obj) {
  return Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

async function postForm(url, data, proxy) {
  const res = await fetchBuf(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(data),
    proxy,
  });
  return { status: res.status, json: JSON.parse(res.body.toString('utf8') || '{}') };
}

async function postJson(url, data, proxy, headers = {}) {
  const res = await fetchBuf(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(data),
    proxy,
  });
  return { status: res.status, json: JSON.parse(res.body.toString('utf8') || '{}') };
}

/** Kick off the device-code flow; returns what the user must do. */
export async function startMsa() {
  const settings = getSettings();
  const clientId = settings.msaClientId;
  if (!clientId) throw new Error('no Azure client ID configured (Settings → Account)');
  const proxy = settings.proxy || undefined;

  const { status, json } = await postForm(DEVICE_URL, { client_id: clientId, scope: SCOPE }, proxy);
  if (status !== 200) throw new Error(json.error_description || `device code request failed (HTTP ${status})`);

  flow = { state: 'pending', user_code: json.user_code, verification_uri: json.verification_uri };
  pollForToken(clientId, json.device_code, Math.max(5, json.interval || 5), proxy);
  return { user_code: json.user_code, verification_uri: json.verification_uri, expires_in: json.expires_in };
}

async function pollForToken(clientId, deviceCode, intervalSec, proxy) {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline && flow?.state === 'pending') {
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
    try {
      const { status, json } = await postForm(TOKEN_URL, {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: clientId,
        device_code: deviceCode,
      }, proxy);
      if (status === 200 && json.access_token) {
        await finishChain(json.access_token, proxy);
        return;
      }
      if (json.error === 'authorization_pending' || json.error === 'slow_down') continue;
      flow = { state: 'failed', error: json.error_description || json.error || 'sign-in failed' };
      return;
    } catch (e) {
      flow = { state: 'failed', error: e.message };
      return;
    }
  }
  if (flow?.state === 'pending') flow = { state: 'failed', error: 'sign-in timed out' };
}

/** MSA access token → XBL → XSTS → Minecraft token → profile. */
async function finishChain(msToken, proxy) {
  const xbl = await postJson(XBL_URL, {
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msToken}` },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  }, proxy);
  if (xbl.status !== 200) { flow = { state: 'failed', error: 'Xbox Live authentication failed' }; return; }
  const xblToken = xbl.json.Token;
  const userHash = xbl.json.DisplayClaims?.xui?.[0]?.uhs;

  const xsts = await postJson(XSTS_URL, {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  }, proxy);
  if (xsts.status !== 200) {
    const xerr = xsts.json.XErr;
    const msg = xerr === 2148916233 ? 'this Microsoft account has no Xbox profile'
      : xerr === 2148916238 ? 'child account — add it to a family first'
      : `XSTS failed (${xerr || xsts.status})`;
    flow = { state: 'failed', error: msg };
    return;
  }

  const mc = await postJson(MC_LOGIN_URL, {
    identityToken: `XBL3.0 x=${userHash};${xsts.json.Token}`,
  }, proxy);
  if (mc.status !== 200 || !mc.json.access_token) { flow = { state: 'failed', error: 'Minecraft services login failed' }; return; }

  let profile;
  try {
    profile = await fetchJson(MC_PROFILE_URL, { headers: { Authorization: `Bearer ${mc.json.access_token}` }, proxy });
  } catch {
    flow = { state: 'failed', error: 'no Minecraft profile on this account (game not owned?)' };
    return;
  }

  session = {
    name: profile.name,
    uuid: profile.id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
    accessToken: mc.json.access_token,
    userType: 'msa',
    xuid: userHash || '0',
    obtainedAt: Date.now(),
  };
  await writeFileAtomic(sessionFile(), JSON.stringify(session, null, 2));
  try { await fsp.chmod(sessionFile(), 0o600); } catch { /* windows */ }
  flow = { state: 'done' };
}

export function signOut() {
  session = null;
  flow = null;
  return fsp.rm(sessionFile(), { force: true });
}
