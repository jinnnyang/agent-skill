// skills/read-repo/scripts/deepwiki_helper.ts

export const MCP_PROTOCOL_VERSION = "2025-03-26";
export const JSONRPC_VERSION = "2.0";
export const DEFAULT_SERVER_URL = "https://mcp.deepwiki.com/mcp";
export const TOOL_CALL_METHOD = "tools/call";

export class MCPError extends Error {
  code?: number;
  data?: any;

  constructor(errorPayload: any) {
    super(`MCP Error ${errorPayload?.code}: ${errorPayload?.message}`);
    this.name = "MCPError";
    this.code = errorPayload?.code;
    this.data = errorPayload?.data;
  }
}

export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

export interface JsonResult {
  id: number;
  jsonrpc: string;
  result?: any;
  error?: any;
}

const SSE_DATA_PREFIX = "data:";
const SSE_DONE_MARKER = "[DONE]";

export class MCPClient {
  serverUrl: string;
  sessionId: string | null = null;
  requestId: number = 1;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  protected async makeRequest(method: string, params?: Record<string, any>, timeout: number = 60000): Promise<any> {
    const requestBody = {
      jsonrpc: JSONRPC_VERSION,
      id: this.requestId++,
      method: method,
      params: params || {},
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json,text/event-stream',
      'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    let response: Response;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      response = await fetch(this.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!response.ok) {
        throw new RequestError(`HTTP request failed: ${response.status} ${response.statusText}`);
      }

      if (response.headers.has('mcp-session-id')) {
        this.sessionId = response.headers.get('mcp-session-id');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new RequestError("No response body available for SSE parsing.");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
        // Keep the last possibly incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const decodedLine = line.trim();
          if (!decodedLine.startsWith(SSE_DATA_PREFIX)) continue;

          const dataStr = decodedLine.substring(SSE_DATA_PREFIX.length).trim();
          if (!dataStr || dataStr === SSE_DONE_MARKER) continue;

          try {
            const result = JSON.parse(dataStr) as JsonResult;
            if (result.error) {
              throw new MCPError(result.error);
            }
            return result.result || {};
          } catch (e) {
            if (e instanceof MCPError) throw e;
            throw new RequestError(`Failed to decode JSON from SSE event: ${dataStr}`);
          }
        }
      }

      // Flush any remaining buffer if stream ends
      if (buffer.trim().startsWith(SSE_DATA_PREFIX)) {
          const dataStr = buffer.trim().substring(SSE_DATA_PREFIX.length).trim();
          if (dataStr && dataStr !== SSE_DONE_MARKER) {
              try {
                  const result = JSON.parse(dataStr) as JsonResult;
                  if (result.error) throw new MCPError(result.error);
                  return result.result || {};
              } catch (e) {
                  if (e instanceof MCPError) throw e;
                  throw new RequestError(`Failed to decode JSON from SSE event: ${dataStr}`);
              }
          }
      }

      throw new RequestError("SSE stream ended without valid data payload.");
    } catch (e: any) {
      if (e.name === 'AbortError') {
         throw new RequestError(`Request timed out after ${timeout}ms.`);
      }
      if (e instanceof MCPError || e instanceof RequestError) throw e;
      throw new RequestError(`HTTP request or network exception: ${e.message}`);
    } finally {
      clearTimeout(id);
    }
  }

  async callTool(name: string, argumentsMap?: Record<string, any>, timeoutSeconds: number = 60): Promise<any> {
    const params = {
      name: name,
      arguments: argumentsMap || {}
    };
    return this.makeRequest(TOOL_CALL_METHOD, params, timeoutSeconds * 1000);
  }
}

export class DeepWikiFetcher extends MCPClient {

  private extractTextFromResult(result: any): any {
    if (result && typeof result === 'object' && Array.isArray(result.content) && result.content.length > 0) {
      const firstItem = result.content[0];
      if (firstItem && typeof firstItem === 'object') {
        return firstItem.text !== undefined ? firstItem.text : result;
      }
    }
    return result;
  }

  async fetchStructure(repoName: string): Promise<any> {
    const result = await this.callTool("read_wiki_structure", { repoName });
    return this.extractTextFromResult(result);
  }

  async fetchContents(repoName: string): Promise<any> {
    const result = await this.callTool("read_wiki_contents", { repoName });
    return this.extractTextFromResult(result);
  }

  async askQuestion(repoName: string, question: string): Promise<any> {
    const result = await this.callTool("ask_question", { repoName, question });
    return this.extractTextFromResult(result);
  }

  async listRepos(): Promise<any> {
    const result = await this.callTool("list_available_repos", {});
    return this.extractTextFromResult(result);
  }
}
