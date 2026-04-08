import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "wove",
  version: "1.0.0",
});

const transport = new StdioServerTransport();
await server.connect(transport);
// 人間向けの起動ログはstderrに出すのが一般的(stdoutはホストとサーバーが利用するため汚さないほうが良い)
console.error("Wove MCP server running");
