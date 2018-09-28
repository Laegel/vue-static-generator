const Generator = require("./src/Generator");
const rimraf = require("@alexbinary/rimraf");

class GeneratorWrapper {

    static create(config, bundle, options) {
        this.generator = new Generator(config, bundle, options);
        const languages = Object.keys(config.languages);
        if (0 === languages.length) {
            throw new Error("You must define at least one language to use.");
        }

        this.defaultOptions = {
            language: languages[0]
        };
    }

    static async initialize(pool = {}) {
        const promises = [];
        for (const language in this.generator.config.languages) {
            promises.push(rimraf(this.generator.config.targetDirectory + "/" + language));
        }
        await Promise.all(promises);
        console.log("Generating the project...");
        return this.generator.generateAll();
    }

    static async generate(args = null) {
        return this.generator.generateByArgs(args);
    }

    static async generateByRoute(route, options) {
        const args = this.getArgs(options);
        args.routes = [route];
        return this.generate(args);
    }

    static async generateByType(type, ids, options) {
        const args = this.getArgs(options);
        args.types = { [type]: ids };
        return this.generate(args);
    }

    static getArgs(options) {
        if (!options) {
            return this.defaultOptions;
        }
        const args = {};
        for (const prop in this.defaultOptions) {
            args[prop] = options[prop] || this.defaultOptions[prop];
        }
        return args;
    }

    static on(event, listener) {
        this.generator.on(event, listener);
    }
}

module.exports = {
    Generator,
    GeneratorWrapper
};
