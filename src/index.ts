/**
 * AIFAIS MCP Server
 * 
 * This is a reference implementation showing how to connect to the AIFAIS
 * document intelligence APIs via MCP protocol.
 * 
 * The actual processing happens on https://aifais.com/api/agent/*
 * This file serves as documentation and a local proxy example.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const AIFAIS_API_BASE = 'https://aifais.com/api';

// Tool definitions
const TOOLS = [
  {
    name: 'scan_invoice',
    description: 'Extract structured data from invoices (PDF, JPG, PNG). Returns vendor, amounts, VAT, line items, and KvK numbers. Requires 0.001 SOL payment via X402.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        invoiceBase64: {
          type: 'string',
          description: 'Base64 encoded invoice file',
        },
        mimeType: {
          type: 'string',
          enum: ['image/jpeg', 'image/png', 'application/pdf'],
          description: 'MIME type of the file',
        },
        signature: {
          type: 'string',
          description: 'Solana transaction signature as payment proof. If not provided, returns 402 with payment instructions.',
        },
      },
      required: ['invoiceBase64', 'mimeType'],
    },
  },
  {
    name: 'analyze_contract',
    description: '[COMING SOON] Analyze contracts for risks and unfavorable clauses. Requires 0.05 SOL payment via X402.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        fileBase64: {
          type: 'string',
          description: 'Base64 encoded contract PDF',
        },
        contractType: {
          type: 'string',
          enum: ['nda', 'employment', 'supplier', 'lease', 'general'],
          description: 'Type of contract',
        },
        signature: {
          type: 'string',
          description: 'Solana transaction signature as payment proof',
        },
      },
      required: ['fileBase64'],
    },
  },
  {
    name: 'verify_business',
    description: '[COMING SOON] Verify Dutch businesses via KvK registry. Requires 0.001 SOL payment via X402.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        kvkNumber: {
          type: 'string',
          pattern: '^[0-9]{8}$',
          description: '8-digit KvK number',
        },
        checks: {
          type: 'array',
          items: { type: 'string', enum: ['kvk', 'btw', 'bankruptcy'] },
          description: 'Which registries to check',
        },
        signature: {
          type: 'string',
          description: 'Solana transaction signature as payment proof',
        },
      },
      required: ['kvkNumber'],
    },
  },
];

// Pricing info for X402 responses
const PRICING = {
  scan_invoice: { amount: 0.001, currency: 'SOL' },
  analyze_contract: { amount: 0.05, currency: 'SOL' },
  verify_business: { amount: 0.001, currency: 'SOL' },
};

const PAYMENT_WALLET = process.env.AIFAIS_WALLET || 'Bqpo3emFG46VGLX4korYoeta3a317pWbR2DMbWnFpZ8c';

// Create server instance
const server = new Server(
  {
    name: 'aifais',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Check if tool exists
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // Check for coming soon tools
  if (name === 'analyze_contract' || name === 'verify_business') {
    return {
      content: [
        {
          type: 'text',
          text: `Tool "${name}" is coming soon. Check https://aifais.com/tools for availability.`,
        },
      ],
      isError: true,
    };
  }

  // Handle scan_invoice
  if (name === 'scan_invoice') {
    const { invoiceBase64, mimeType, signature } = args as {
      invoiceBase64: string;
      mimeType: string;
      signature?: string;
    };

    // If no signature provided, return payment required
    if (!signature) {
      const pricing = PRICING[name];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Payment Required',
              code: 402,
              payment: {
                amount: pricing.amount,
                currency: pricing.currency,
                wallet: PAYMENT_WALLET,
                network: 'solana-mainnet',
                memo: `aifais_${name}_${Date.now()}`,
              },
              instructions: 'Transfer the specified amount to the wallet address with the memo. Then retry this tool call with the transaction signature in the "signature" parameter.',
            }),
          },
        ],
        isError: true,
      };
    }

    // Call the actual AIFAIS API
    try {
      const response = await fetch(`${AIFAIS_API_BASE}/agent/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceBase64,
          mimeType,
          signature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(error) }],
          isError: true,
        };
      }

      const result = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: 'text', text: `Tool ${name} not implemented` }],
    isError: true,
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AIFAIS MCP Server running on stdio');
}

main().catch(console.error);
