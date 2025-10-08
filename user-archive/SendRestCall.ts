/* A somewhat generic way of sending rest calls from a blocks task.
The user script sexposes two callables, one for GET and one for POST,
we currently do not care about any repsonses so it can only be used for trigger.
Author: Mattias Andersson
version 1.0
*/
import { SimpleHTTP } from "../system/SimpleHTTP";
import { callable, parameter, property } from "../system_lib/Metadata";
import { Script, ScriptEnv } from "../system_lib/Script";

export class SendRestCall extends Script {

    public constructor(env: ScriptEnv) {
        super(env);
    }

    // ---------------- GET ----------------
    @callable("Send GET request (flexible)")
    async sendGet(
        @parameter("Host (e.g., https://example.com)") host: string,
        @parameter("Path (e.g., /api/data)") path: string,
        @parameter("Auth header value (optional, e.g., 'Basic...' or 'Bearer ...')") auth?: string,
        @parameter("Query parameters as JSON (optional)") queryParams?: string,
        @parameter("Extra headers as JSON (optional)") headers?: string
    ): Promise<any> {
        try {
            const req = this.prepareRequest(host, path, auth, queryParams, headers);
            const response = await req.get();
            return //this.interpretResponse(response);
        } catch (err) {
            console.error("sendGet failed:", err);
            throw err;
        }
    }

    // ---------------- POST ----------------
    @callable("Send POST request (flexible)")
    async sendPost(
        @parameter("Host (e.g., https://example.com)") host: string,
        @parameter("Path (e.g., /api/data)") path: string,
        @parameter("Auth header value (optional, e.g., 'Basic...' or 'Bearer ...')") auth?: string,
        @parameter("Body (for POST)") body?: string,
        @parameter("Query parameters as JSON (optional)") queryParams?: string,
        @parameter("Extra headers as JSON (optional)") headers?: string
    ): Promise<any> {
        try {
            const req = this.prepareRequest(host, path, auth, queryParams, headers);
            const response = await req.post(body || "");
            return //this.interpretResponse(response);
        } catch (err) {
            console.error("sendPost failed:", err);
            throw err;
        }
    }

    // ---------------- Helper Methods ----------------

    private prepareRequest(
        host: string,
        path: string,
        auth?: string,
        queryParams?: string,
        headers?: string
    ): any {
        // Build final URL
        let finalUrl = host + path;

        if (queryParams) {
            try {
                const qpObj = JSON.parse(queryParams);
                const parts: string[] = [];
                for (const k in qpObj) {
                    if (qpObj.hasOwnProperty(k) && qpObj[k] != null) {
                        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(qpObj[k])));
                    }
                }
                if (parts.length > 0) {
                    const sep = finalUrl.indexOf("?") >= 0 ? "&" : "?";
                    finalUrl = finalUrl + sep + parts.join("&");
                }
            } catch (e) {
                console.warn("prepareRequest: queryParams JSON parse failed:", e);
            }
        }

        const req = SimpleHTTP.newRequest(finalUrl, { interpretResponse: true });

        if (auth && auth.trim().length > 0) {
            req.header("Authorization", auth);
        }

        if (headers) {
            try {
                const hdrObj = JSON.parse(headers);
                for (const h in hdrObj) {
                    if (hdrObj.hasOwnProperty(h) && hdrObj[h] != null) {
                        req.header(h, String(hdrObj[h]));
                    }
                }
            } catch (e) {
                console.warn("prepareRequest: headers JSON parse failed:", e);
            }
        }

        return req;
    }

   
   /*  private interpretResponse(response: any): any {
        return response && response.interpreted ? response.interpreted : response;
    } */
}
