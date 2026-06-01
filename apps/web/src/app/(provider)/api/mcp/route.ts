import * as MCP from "@/server/app/mcp";

export const GET = () => MCP.getRoute();

export const POST = async (request: Request) => MCP.handleRequest(request);
