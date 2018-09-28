const { createBundleRenderer } = require("vue-server-renderer");
const mkdirp = require("mkdirp");
const fs = require("fs");
const Route = require("./Route");
const { walkRoutes } = require("./utils");

const defaultConfig = {
    fileIndex: "index",
    fileExtension: ".html",
    targetDirectory: "./dist",
};

module.exports = class Generator {

    constructor(config, bundle, options = null) {
        this.routes = {};
        this.types = {};
        this.pool = {};
        this.config = {
            ...defaultConfig,
            ...config
        };
        this.listeners = {
            before: [],
            after: []
        };
        this.renderer = createBundleRenderer(bundle, options);
        this.prepare();
        this.queue = [];
        this.disableQueue = false;
    }

    prepare() {
        for (const language in this.config.languages) {
            if (!this.config.languages[language].routes) {
                console.warn("Warning: no routes defined on '" + language + "' language.");
                continue;
            }
            this.routes[language] = [];
            this.types[language] = {};
            this.pool[language] = {};

            this.config.languages[language].routes.forEach(routeConfig => {
                const route = new Route(routeConfig);
                route.setUpwardRelationship();
                walkRoutes(route, current => {
                    this.routes[language].push(current);
                    if (current.type) {
                        this.types[language][current.type] = current;
                    }
                });
            });

            this.routes[language].forEach(route => {
                route.setFlattenedPath();
                route.getPool = () => {
                    return this.pool[language];
                };
            });
        }
    }

    async render(context) {
        return await this.renderer.renderToString(context).catch(error => {
            console.error("Error, URI " + context.url + " could not be rendered: '" + error.code + "'.");
        });
    }

    fileWriter(args, path, content) {
        const targetDirectory = 
            this.config.targetDirectory + "/" + args.language + path +
            ("/" === path ? "" : "/")
        ;
        mkdirp.sync(targetDirectory);
        fs.writeFileSync(targetDirectory + this.config.fileIndex + this.config.fileExtension, content);
    }

    async generate(path, args) {
        const content = await this.render({
            url: path,
            title: this.config.languages[args.language].defaultTitle
        });
        
        if (!content) {
            return;
        }
        const writer = this.config.fileWriter || this.fileWriter;
        writer.call(this, args, path, content);
    }

    resolvePathsFromRoute(route, args) {
        const foundRoute = this.findMatchingRouteConfig(route, args);
        const uris = [];
        if (foundRoute.type) {
            if (!foundRoute.resolver) {
                throw new Error("You must define a path resolver on your typed route: " + foundRoute.type);
            }
            const values = args.types && args.types[foundRoute.type] ? args.types[foundRoute.type] : this.types[args.language][foundRoute.type].reach("data");
            values.forEach(value => {
                uris.push(foundRoute.reach("resolver", value));
            });
            if (foundRoute.hasOwnProperty("regenerate") && !this.disableQueue) {
                this.enqueueRoute(foundRoute);
            }
        } else {
            uris.push(route);
        }
        return uris;
    }

    enqueueRoute(route) {
        const paths = route.reach("regenerate");        
        paths.forEach(path => {
            this.enqueuePath(path);
        });
    }

    enqueuePath(path) {
        const index = this.queue.indexOf(path);
        if (-1 === index) {
            this.queue.push(path);
        }
    }

    findMatchingRouteConfig(route, args) {
        let foundRoute = {};
        this.routes[args.language].some(routeObject => {
            if (routeObject.flattenedPath === route) {
                foundRoute = routeObject;
                return true;
            }
        });
        return foundRoute;
    }

    generateByRoute(route, args) {
        const promises = [];
        const paths = this.resolvePathsFromRoute(route, args);
        paths.forEach(path => {
            promises.push(this.generate(path, args)); 
        });
        
        return promises;
    }

    generateByArgs(args) {
        const promises = [];
        const toGenerate = [];
        let paths = [];
        if (args.routes) {
            args.routes.forEach(route => {
                toGenerate.push(route);
            });
        }
        
        for (const type in args.types) {
            if (!this.types[args.language][type]) {
                throw new Error("Undefined type used: '" + type + "'.");
            }
            toGenerate.push(this.types[args.language][type].flattenedPath);
        }
        toGenerate.forEach(route => {
            paths = paths.concat(this.resolvePathsFromRoute(route, args));
        });
        const uniquePaths = [];
        paths.forEach(path => {
            if (-1 === uniquePaths.indexOf(path)) {
                uniquePaths.push(path);
            }
        });
        uniquePaths.forEach(path => {
            promises.push(this.generate(path, args));
        });
        
        for (let i = 0; i < this.queue.length; ++i) {
            promises.push(this.generate(this.queue[i], args));
        }
        this.trigger("after", [uniquePaths, args]);
        return promises;
    }

    generateAll() {
        let promises = [];
        this.disableQueue = true;
        for (const language in this.config.languages) {
            const args = {
                language,
                routes: this.routes[language].map(route => route.flattenedPath),
                types: {}
            };

            for (const type in this.types[language]) {
                const values = this.types[language][type].reach("data", args);
                this.pool[language][type] = values;
                args.types[type] = values;

            }
            promises = promises.concat(this.generateByArgs(args));
        }
        return promises;
    }

    on(event, listener) {
        if (!this.listeners[event]) {
            throw new Error("Event '" + event + "' does not exist.");
        }
        this.listeners[event].push(listener);
    }

    trigger(event, args) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event].forEach(listener => {
            listener.apply(this, args);
        });
    }
}