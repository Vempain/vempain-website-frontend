/* global module */

/* Generic stand-in for every icon exported by @ant-design/icons: any named import resolves to an empty component. */

const icons = new Map();

module.exports = new Proxy({}, {
    get(target, property) {
        if (property === '__esModule') {
            return true;
        }

        if (typeof property !== 'string') {
            return undefined;
        }

        if (!icons.has(property)) {
            const Icon = () => null;
            Icon.displayName = property;
            icons.set(property, Icon);
        }

        return icons.get(property);
    },
});
