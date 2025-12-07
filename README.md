# AIFAIS MCP Server

Document intelligence tools for AI agents. Pay-per-use via X402 protocol on Solana.

![MCP](https://img.shields.io/badge/MCP-1.0.0-purple)
![X402](https://img.shields.io/badge/X402-Solana-green)
![Status](https://img.shields.io/badge/status-live-brightgreen)

## Overview

AIFAIS provides headless document processing APIs designed for autonomous AI agents. No API keys, no accounts — just pay per call using Solana.

**Available Tools:**

| Tool | Description | Price |
|------|-------------|-------|
| `scan_invoice` | Extract structured data from invoices (PDF/JPG/PNG) | 0.001 SOL |
| `analyze_contract` | Analyze contracts for risks and unfavorable clauses | 0.05 SOL |
| `verify_business` | Verify Dutch businesses via KvK registry | 0.001 SOL |

## Quick Start

### Connect via MCP Config

Add to your MCP client configuration (Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "aifais": {
      "url": "https://aifais.com/api/mcp",
      "transport": "sse"
    }
  }
}
```

### Direct API Usage

```bash
# 1. Discover available tools
curl https://aifais.com/api/mcp

# 2. Call a tool (with payment proof)
curl -X POST https://aifais.com/api/agent/scan \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceBase64": "<base64_encoded_file>",
    "mimeType": "application/pdf",
    "signature": "<solana_tx_signature>"
  }'
```

## Payment Flow (X402)

1. **Call tool without payment** → Server returns `402 Payment Required`
2. **Response includes:** price, recipient wallet, memo
3. **Agent pays** via Solana (SOL or USDC)
4. **Retry with proof** → Include `signature` in request
5. **Server verifies on-chain** → Returns result

```
Agent                          AIFAIS                         Solana
  |                              |                              |
  |-- POST /api/agent/scan ----->|                              |
  |<-- 402 Payment Required -----|                              |
  |                              |                              |
  |-- Transfer 0.001 SOL --------|----------------------------->|
  |<-- Transaction signature ----|------------------------------|
  |                              |                              |
  |-- POST /api/agent/scan ----->|                              |
  |   (with signature)           |-- Verify tx --------------->|
  |                              |<-- Confirmed ----------------|
  |<-- 200 OK + JSON result -----|                              |
```

## Tool Schemas

### scan_invoice

Extracts structured data from invoices.

**Input:**
```json
{
  "invoiceBase64": "string (required) - Base64 encoded file",
  "mimeType": "string (required) - image/jpeg | image/png | application/pdf",
  "signature": "string (required) - Solana transaction signature"
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "vendor": "Acme B.V.",
    "invoiceNumber": "INV-2024-001",
    "date": "2024-12-01",
    "total": 1250.00,
    "vat": 262.50,
    "currency": "EUR",
    "kvkNumber": "12345678",
    "lineItems": [...]
  }
}
```

### analyze_contract (Coming Soon)

Analyzes contracts for risks and unfavorable clauses.

**Input:**
```json
{
  "fileBase64": "string (required) - Base64 encoded PDF",
  "contractType": "string (optional) - nda | employment | supplier | lease",
  "focusAreas": "array (optional) - ['termination', 'liability', 'ip']",
  "signature": "string (required) - Solana transaction signature"
}
```

### verify_business (Coming Soon)

Verifies Dutch businesses against official registries.

**Input:**
```json
{
  "kvkNumber": "string (required) - 8-digit KvK number",
  "checks": "array (optional) - ['kvk', 'btw', 'bankruptcy']",
  "signature": "string (required) - Solana transaction signature"
}
```

## Payment Details

**Network:** Solana Mainnet  
**Accepted:** SOL, USDC  
**Wallet:** `[YOUR_WALLET_ADDRESS]`

Prices are per API call. No subscriptions, no minimums.

## Error Handling

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `400` | Invalid input (check schema) |
| `402` | Payment required |
| `403` | Invalid payment proof |
| `500` | Processing error |

## Links

- **Website:** [aifais.com](https://aifais.com)
- **Tools (Browser):** [aifais.com/tools](https://aifais.com/tools)
- **API Endpoint:** [aifais.com/api/mcp](https://aifais.com/api/mcp)

## About AIFAIS

AIFAIS builds autonomous document processing agents for Dutch SMEs. We combine AI, blockchain, and automation to create digital workers that handle repetitive tasks.

Based in Gouda, Netherlands.

## License

MIT
