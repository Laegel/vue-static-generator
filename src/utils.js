function walkRoutes(route, callback) {
    callback(route);
    if (!route.children) {
        return;
    }
    route.children.forEach(child => {
        walkRoutes(child, callback);
    });
};

module.exports = {
    walkRoutes
};