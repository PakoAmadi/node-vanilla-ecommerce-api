module.exports = class Router {

    constructor() {
        this.routes = { GET: new Map(), POST: new Map(), PUT: new Map(), DELETE: new Map() };
        this.dynamicRoutes = { GET: [], POST: [], PUT: [], DELETE: [] };
    }

    #addRoute(method, path, handler) {

        if (typeof handler !== 'function') {
            throw new TypeError(`Handler for ${method} ${path} must be a function, received ${typeof handler}`);
        }

        if (path.includes(':')) {
            const paramNames = [];
            const regexPath = path.replace(/:([^/]+)/g, (_, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)';
            });
            const regex = new RegExp(`^${regexPath}$`);
            this.dynamicRoutes[method].push({ regex, paramNames, handler });

        } else {
            this.routes[method].set(path, handler)
        }
    }

    post(path, handler) { this.#addRoute('POST', path, handler) }
    get(path, handler) { this.#addRoute('GET', path, handler) }
    put(path, handler) { this.#addRoute('PUT', path, handler) }
    delete(path, handler) { this.#addRoute('DELETE', path, handler) }

    lookup(method, pathname) {
        const methodRoutes = this.routes[method];
        if (!methodRoutes) return { error: 'METHOD_NOT_ALLOWED' };

        const staticHandler = methodRoutes.get(pathname);
        if (staticHandler) {
            return { handler: staticHandler, params: {} };
        }

        const dynamicRoutesList = this.dynamicRoutes[method];
        if (!dynamicRoutesList) return { error: 'METHOD_NOT_ALLOWED' };
        for (const route of dynamicRoutesList) {
            const match = pathname.match(route.regex);
            if (match) {
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                return { handler: route.handler, params };
            }
        }
        return { error: 'NOT_FOUND' };
    }
}