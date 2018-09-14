module.exports = class Route {

    constructor(data, parent = null) {
        for (const prop in data) {
            this[prop] = data[prop];
        }
        this.parent = parent;
    }

    evaluatePath(context) {
        let path = this.path;
        const vars = path.match(/:([\w]*)/g);
        vars.forEach(variable => {
            path = path.replace(variable, context[variable.replace(":", "")]);
        });
        return path;
    }

    setUpwardRelationship() {
        if (!this.children) {
            return;
        }
        this.children.forEach((childConfig, index) => {
            const childRoute = new Route(childConfig);
            childRoute.parent = this;
            childRoute.setUpwardRelationship();
            this.children[index] = childRoute;
        });
    }

    reach(property, context) {
        if ("function" === typeof (this[property])) {
            return this[property].call(this, context);
        }
        return this[property];
    }

    setFlattenedPath() {
        if (this.parent) {
            this.parent.setFlattenedPath();
            this.flattenedPath = this.parent.flattenedPath + "/" + this.path;
        } else {
            this.flattenedPath = this.path;
        }
    }
}