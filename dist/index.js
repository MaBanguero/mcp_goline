#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create an MCP server
const server = new McpServer({
    name: "Shopify MPC",
    version: "1.0.0"
});
// Añade esta tool a tu servidor
// @ts-nocheck
// @ts-ignore
server.tool("list-shopify-products", {
    shop: z.string(),
    accessToken: z.string()
}, async ({ shop, accessToken }) => {
    const endpoint = `https://${shop}/admin/api/2023-04/products.json?limit=50`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 segundos
    try {
        const response = await fetch(endpoint, {
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return {
                content: [{
                        type: "text",
                        text: `Error: ${response.status} - ${response.statusText}`
                    }]
            };
        }
        const data = await response.json();
        const summary = data.products.map(p => `#${p.id}: ${p.title}`).join("\n");
        return {
            content: [
                { type: "json", text: data.products || { "message": "No hay productos disponibles." } }
            ]
        };
    }
    catch (error) {
        if (error.name === "AbortError") {
            return {
                content: [{
                        type: "text",
                        text: "Error: La solicitud a Shopify tomó demasiado tiempo y fue cancelada."
                    }]
            };
        }
        return {
            content: [{
                    type: "text",
                    text: `Error inesperado: ${error.message}`
                }]
        };
    }
});
// Agrega esta tool a tu servidor MCP
// @ts-nocheck
// @ts-ignore
server.tool("search-shopify-products", {
    shop: z.string().describe("Dominio de la tienda Shopify, por ejemplo 'midominio.myshopify.com'"),
    accessToken: z.string().describe("Token privado de acceso a la API de Shopify que autoriza la consulta."),
    keyword: z.string().describe("Palabra clave para buscar productos en el nombre o descripción.")
}, async ({ shop, accessToken, keyword }) => {
    const endpoint = `https://${shop}/admin/api/2023-04/products.json?limit=100`;
    // Función auxiliar para normalizar
    function normalize(str) {
        return str
            .normalize("NFD") // Divide letras y tildes
            .replace(/[\u0300-\u036f]/g, "") // Elimina tildes
            .toLowerCase()
            .trim();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(endpoint, {
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return {
                content: [{
                        type: "text",
                        text: `Error: ${response.status} - ${response.statusText}`
                    }]
            };
        }
        const data = await response.json();
        const kwNorm = normalize(keyword);
        // Coincidencia parcial: sin tildes y sin importar mayúsculas/minúsculas
        const filtered = data.products.filter(p => normalize(p.title).includes(kwNorm));
        if (filtered.length === 0) {
            return {
                content: [{
                        type: "text",
                        text: "No se encontraron productos con esa palabra clave."
                    }]
            };
        }
        const summary = filtered.map(p => `#${p.id}: ${p.title}`).join("\n");
        return {
            content: [{ type: "json", data: filtered }]
        };
    }
    catch (error) {
        if (error.name === "AbortError") {
            return {
                content: [{
                        type: "text",
                        text: "Error: La solicitud a Shopify tomó demasiado tiempo y fue cancelada."
                    }]
            };
        }
        return {
            content: [{
                    type: "text",
                    text: `Error inesperado: ${error.message}`
                }]
        };
    }
});
// @ts-nocheck
server.tool("create-shopify-order", {
    orderData: z.object({
        shop: z.string().describe("Dominio de la tienda Shopify donde se creará la orden. Por ejemplo: 'midominio.myshopify.com'"),
        accessToken: z.string().describe("Token privado de acceso a la API de Shopify, necesario para autenticar la solicitud."),
        email: z.string().email().describe("Correo electrónico principal donde se enviarán las notificaciones de la orden."),
        fulfillment_status: z.string().optional().describe("Estado inicial de la orden ('fulfilled', 'unfulfilled', etc). Opcional."),
        send_receipt: z.boolean().optional().describe("Si es true, Shopify enviará automáticamente el recibo de la orden al cliente. Opcional."),
        send_fulfillment_receipt: z.boolean().optional().describe("Si es true, Shopify enviará automáticamente el recibo de cumplimiento cuando se procese el envío. Opcional."),
        lineItems: z.array(z.object({
            variantId: z.number().describe("ID numérico de la variante de producto a añadir en la orden."),
            quantity: z.number().describe("Cantidad de unidades de la variante seleccionada.")
        })).describe("Lista de productos y cantidades a agregar en la orden."),
        shippingAddress: z.object({
            first_name: z.string().describe("Nombre del destinatario del envío."),
            last_name: z.string().describe("Apellido del destinatario del envío."),
            address1: z.string().describe("Dirección principal de entrega."),
            city: z.string().describe("Ciudad del destinatario del envío."),
            province: z.string().describe("Provincia, departamento o estado del destinatario."),
            country: z.string().describe("País del destinatario del envío."),
            zip: z.string().describe("Código postal para la entrega."),
            phone: z.string().describe("Número telefónico de contacto para el envío.")
        }).describe("Dirección completa de envío para el pedido."),
        billingAddress: z.object({
            first_name: z.string().describe("Nombre del responsable de facturación."),
            last_name: z.string().describe("Apellido del responsable de facturación."),
            address1: z.string().describe("Dirección principal de facturación."),
            city: z.string().describe("Ciudad de la dirección de facturación."),
            province: z.string().describe("Provincia, departamento o estado para facturación."),
            country: z.string().describe("País de la dirección de facturación."),
            zip: z.string().describe("Código postal de facturación."),
            phone: z.string().describe("Número telefónico para la facturación.")
        }).describe("Dirección usada para facturación."),
        customer: z.object({
            email: z.string().email().describe("Correo electrónico del cliente."),
            first_name: z.string().describe("Nombre del cliente."),
            last_name: z.string().describe("Apellido del cliente."),
            phone: z.string().describe("Teléfono de contacto del cliente.")
        }).describe("Información completa del cliente que realiza la compra.")
    }).describe("Información completa de la orden de compra.")
}, async ({ orderData }) => {
    const { shop, accessToken, email, fulfillment_status, send_receipt, send_fulfillment_receipt, lineItems, shippingAddress, billingAddress, customer } = orderData;
    const endpoint = `https://${shop}/admin/api/2023-04/orders.json`;
    const orderBody = {
        order: {
            email,
            fulfillment_status,
            send_receipt,
            send_fulfillment_receipt,
            billing_address: billingAddress,
            shipping_address: shippingAddress,
            line_items: lineItems.map(item => ({
                variant_id: item.variantId,
                quantity: item.quantity
            })),
            customer
        }
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify(orderBody)
        });
        clearTimeout(timeout);
        if (!response.ok) {
            const errData = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Error: ${response.status} - ${response.statusText}\n${errData}`
                    }]
            };
        }
        const data = await response.json();
        return {
            content: [{
                    type: "text",
                    text: `Orden creada con éxito. Número de orden: #${data.order.id}, Email: ${data.order.email}`
                }]
        };
    }
    catch (error) {
        if (error.name === "AbortError") {
            return {
                content: [{
                        type: "text",
                        text: "Error: La solicitud a Shopify tomó demasiado tiempo y fue cancelada."
                    }]
            };
        }
        return {
            content: [{
                    type: "text",
                    text: `Error inesperado: ${error.message}`
                }]
        };
    }
});
// @ts-nocheck
// @ts-ignore
server.tool("getShopifyAbandonedCarts", {
    storeAccess: z.object({
        shop: z.string().describe("Dominio de la tienda Shopify, por ejemplo 'midominio.myshopify.com'"),
        accessToken: z.string().describe("Token privado de acceso a la API de Shopify que autoriza la consulta."),
    })
}, async ({ storeAccess }) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50000);
        const { shop, accessToken } = storeAccess;
        const url = `https://${shop}/admin/api/2023-04/checkouts.json?fields=id,email,created_at,updated_at,line_items,abandoned_checkout_url`;
        const response = await fetch(url, {
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            const errorText = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Error HTTP ${response.status}: ${response.statusText}\nDetalle: ${errorText}`
                    }]
            };
        }
        const data = await response.json();
        return {
            content: [{
                    type: "json",
                    data: data.checkouts || []
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `Error en la petición: ${error.message}`
                }]
        };
    }
});
// @ts-nocheck
// @ts-ignore
server.tool("getShopifyCustomerById", {
    input: z.object({
        shop: z.string().describe("Dominio de la tienda Shopify"),
        accessToken: z.string().describe("Token privado de acceso a la API de Shopify"),
        customerId: z.string().describe("ID del cliente")
    }).describe("Datos de acceso y consulta en formato JSON")
}, async ({ input }) => {
    try {
        const { shop, accessToken, customerId } = input;
        if (!shop || !shop.includes('.myshopify.com')) {
            return {
                content: [{
                        type: "json",
                        data: {
                            success: false,
                            error: {
                                message: "El dominio de la tienda debe ser un dominio válido de Shopify"
                            }
                        }
                    }]
            };
        }
        const url = `https://${shop}/admin/api/2023-04/customers/${customerId}.json`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
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
                            data: data.customer
                        }
                    }]
            };
        }
        catch (fetchError) {
            return {
                content: [{
                        type: "json",
                        data: {
                            success: false,
                            error: {
                                message: "Error en la conexión con Shopify",
                                details: fetchError.message
                            }
                        }
                    }]
            };
        }
    }
    catch (error) {
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
});
// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
