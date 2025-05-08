import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
const app = express();
app.use(express.json());
app.post('/mcp', async (req, res) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.
    try {
        const server = new McpServer({
            name: "Logistic MPC",
            version: "1.0.0"
        });
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        server.tool("login_dropi", {
            input: z.object({
                email: z.string().email().describe("Email del usuario"),
                password: z.string().describe("Contraseña del usuario"),
            }).describe("Credenciales y datos de acceso")
        }, async ({ input }) => {
            const endpoint = `https://api.dropi.co/api/login`;
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Encoding": "gzip, deflate, br, zstd",
                        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Content-Type": "application/json",
                        "Host": "api.dropi.co",
                        "Origin": "https://app.dropi.co",
                        "Pragma": "no-cache",
                        "Referer": "https://app.dropi.co/",
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-site",
                        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
                        "X-Authorization": "Bearer undefined",
                        "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Linux\""
                    },
                    body: JSON.stringify({
                        email: input.email,
                        password: input.password,
                        white_brand_id: 1,
                        brand: "",
                        ipAddress: "181.54.0.229",
                        otp: null
                    })
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    return {
                        content: [{
                                type: "json",
                                data: {
                                    success: false,
                                    error: {
                                        status: response.status,
                                        statusText: response.statusText,
                                        details: errorText
                                    }
                                }
                            }]
                    };
                }
                const data = await response.json();
                return {
                    content: [{
                            type: "json",
                            data: {
                                success: true,
                                token: data.token
                            }
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: "json",
                            data: {
                                success: false,
                                error: {
                                    message: "Error en la conexión con Dropi",
                                    details: error.message
                                }
                            }
                        }]
                };
            }
        });
        res.on('close', () => {
            console.log('Request closed');
            transport.close();
            server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});
app.get('/mcp', async (req, res) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});
app.delete('/mcp', async (req, res) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
