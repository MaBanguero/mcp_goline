import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";



// Create an MCP server
const server = new McpServer({
  name: "Logistic MPC",
  version: "1.0.0"
});
// @ts-nocheck

server.tool(
    "login_dropi",
    {
        input: z.object({
            email: z.string().email().describe("Email del usuario"),
            password: z.string().describe("Contraseña del usuario"),
        }).describe("Credenciales y datos de acceso")
    },
    async ({ input }) => {
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

        } catch (error) {
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
    }
);
// @ts-nocheck

server.tool(
    "getDropiOrders",
    {
        input: z.object({
            token: z.string().describe("Bearer token de autenticación"),
            user_id: z.string().describe("ID del usuario"),
            order_phone_number: z.string().describe("Customer's phone number on the order")
        }).describe("Datos de autenticación")
    },
    async ({ input }) => {
        try {
            const { token, user_id, order_phone_number } = input;

            // Parámetros constantes
            const queryParams = new URLSearchParams({
                exportAs: "orderByRow",
                orderBy: "id",
                orderDirection: "desc",
                result_number: "10",
                start: "0",
                textToSearch: `${order_phone_number}`,
                status: "",
                supplier_id: "false",
                user_id: user_id,
                from: "2025-04-02",
                until: "2025-05-07",
                filter_product: "undefined",
                haveIncidenceProcesamiento: "false",
                tag_id: "",
                warranty: "false",
                seller: "undefined",
                filter_date_by: "FECHA DE CREADO",
                invoiced: "null"
            });

            const url = `https://api.dropi.co/api/orders/myorders?${queryParams}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
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
                        "X-Authorization": `Bearer ${token}`,
                        "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Linux\""
                    }
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
                            data: data
                        }
                    }]
                };

            } catch (fetchError) {
                return {
                    content: [{
                        type: "json",
                        data: {
                            success: false,
                            error: {
                                message: "Error en la conexión con Dropi",
                                details: fetchError.message
                            }
                        }
                    }]
                };
            }

        } catch (error) {
            return {
                content: [{
                    type: "json",
                    data: {
                        success: false,
                        error: {
                            message: "Error general en la petición",
                            details: error.message
                        }
                    }
                }]
            };
        }
    }
);
// @ts-nocheck

server.tool(
    "update_order_dropi",
    {
        input: z.object({
            token: z.string().describe("Bearer token de autenticación"),
            order_id: z.string().describe("ID de la orden a actualizar"),
            status: z.enum(["CONFIRMADO", "CANCELADO"]).describe("Estado de la orden (CONFIRMADO o CANCELADO)")
        }).describe("Datos para actualizar la orden")
    },
    async ({ input }) => {
        try {
            const { token, order_id, status } = input;
            const url = `https://api.dropi.co/api/orders/myorders/${order_id}`;

            try {
                const response = await fetch(url, {
                    method: 'PUT',
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
                        "X-Authorization": `Bearer ${token}`,
                        "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Linux\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-site"
                    },
                    body: JSON.stringify({
                        status: status
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
                            data: data,
                            message: `Orden ${order_id} actualizada a estado ${status}`
                        }
                    }]
                };

            } catch (fetchError) {
                return {
                    content: [{
                        type: "json",
                        data: {
                            success: false,
                            error: {
                                message: "Error en la conexión con Dropi",
                                details: fetchError.message
                            }
                        }
                    }]
                };
            }

        } catch (error) {
            return {
                content: [{
                    type: "json",
                    data: {
                        success: false,
                        error: {
                            message: "Error general en la petición",
                            details: error.message
                        }
                    }
                }]
            };
        }
    }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);