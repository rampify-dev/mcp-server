#!/usr/bin/env node

/**
 * SEO Intelligence MCP Server
 * Provides real-time SEO intelligence for AI coding tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { tools, type ToolName } from './tools/index.js';

/**
 * Create and configure MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: 'seo-intelligence',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler: List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing available tools');

    return {
      tools: Object.values(tools).map(tool => ({
        name: tool.metadata.name,
        description: tool.metadata.description,
        inputSchema: tool.metadata.inputSchema,
      })),
    };
  });

  /**
   * Handler: Call a tool
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Tool called: ${name}`, { args });

    // Find tool
    const tool = tools[name as ToolName];
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    }

    try {
      // Validate input
      const validatedArgs = tool.schema.parse(args);

      // Execute tool
      const startTime = Date.now();
      const result = await tool.handler(validatedArgs as any);
      const duration = Date.now() - startTime;

      logger.info(`Tool completed: ${name} (${duration}ms)`, {
        success: !('error' in result),
      });

      // Return result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error(`Tool failed: ${name}`, error);

      if (error instanceof Error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }

      throw new McpError(
        ErrorCode.InternalError,
        'Tool execution failed with unknown error'
      );
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  logger.info('Starting SEO Intelligence MCP Server', {
    version: '0.1.0',
    backendUrl: config.backendApiUrl,
  });

  try {
    // Create server
    const server = createServer();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    logger.info('MCP Server ready and listening on stdio');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start MCP server', error);
    process.exit(1);
  }
}

// Run server
main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
