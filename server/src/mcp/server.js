// VendorIQ MCP server: exposes procurement tools to any AI client over stdio.
// Every tool calls the REST API with the signed-in user's token, so the AI can
// never do more than the user can.
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = process.env.VENDORIQ_API_URL || 'http://127.0.0.1:4000';
const TOKEN = process.env.VENDORIQ_TOKEN;
const authHeaders = TOKEN === 'demo' ? { 'X-Demo-Mode': '1' } : { Authorization: `Bearer ${TOKEN}` };

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders, 'Content-Type': 'application/json' }
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status} ${body?.error || ''}`.trim());
  return body;
}

const ok = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
const fail = err => ({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true });

const server = new McpServer({ name: 'vendoriq', version: '1.0.0' });

server.registerTool('search_vendors', {
  description: 'Search vendors by name. Returns id, name, category, status, risk score and risk level.',
  inputSchema: { query: z.string().max(100).optional() }
}, async ({ query }) => {
  try { return ok(await call(`/api/vendors?search=${encodeURIComponent(query || '')}`)); }
  catch (e) { return fail(e); }
});

server.registerTool('get_vendor_details', {
  description: 'Get one vendor with its contracts and latest risk assessment.',
  inputSchema: { vendorId: z.number().int().positive() }
}, async ({ vendorId }) => {
  try { return ok(await call(`/api/vendors/${vendorId}`)); }
  catch (e) { return fail(e); }
});

server.registerTool('get_expiring_contracts', {
  description: 'List active contracts ending within the next N days, with vendor risk.',
  inputSchema: { days: z.number().int().min(1).max(730) }
}, async ({ days }) => {
  try { return ok(await call(`/api/contracts/expiring?days=${days}`)); }
  catch (e) { return fail(e); }
});

server.registerTool('flag_vendor_for_review', {
  description: 'ADMIN OR ANALYST ONLY. Set a vendor to Under Review with a reason. Changes data.',
  inputSchema: { vendorId: z.number().int().positive(), reason: z.string().min(5).max(500) }
}, async ({ vendorId, reason }) => {
  try { return ok(await call(`/api/vendors/${vendorId}/flag`, { method: 'POST', body: JSON.stringify({ reason }) })); }
  catch (e) { return fail(e); }
});

server.registerTool('list_rfx_events', {
  description: 'List sourcing events (RFI/RFP/RFQ) with status, due date and bid count.',
  inputSchema: {}
}, async () => {
  try { return ok(await call('/api/rfx')); }
  catch (e) { return fail(e); }
});

server.registerTool('compare_bids', {
  description: 'Rank the bids for one RFx by weighted score (60% price, 40% vendor risk). Includes price, delivery weeks and risk.',
  inputSchema: { rfxId: z.number().int().positive() }
}, async ({ rfxId }) => {
  try { return ok(await call(`/api/rfx/${rfxId}/bids`)); }
  catch (e) { return fail(e); }
});

server.registerTool('award_rfx', {
  description: 'ADMIN ONLY. Award an RFx to a vendor that bid on it. Changes data. Only use when the user explicitly asks to award.',
  inputSchema: { rfxId: z.number().int().positive(), vendorId: z.number().int().positive() }
}, async ({ rfxId, vendorId }) => {
  try { return ok(await call(`/api/rfx/${rfxId}/award`, { method: 'POST', body: JSON.stringify({ vendorId }) })); }
  catch (e) { return fail(e); }
});

await server.connect(new StdioServerTransport());
console.error('VendorIQ MCP server running on stdio'); // stderr only: stdout is the protocol channel
