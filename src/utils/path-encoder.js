const { isUNCPath } = require('./path-meta');

function encodeSegments(parts) {
    return parts.map(part => (part === '' ? part : encodeURIComponent(part))).join('%5C');
}

function encodeWindowsPath(originalPath) {
    if (typeof originalPath !== 'string' || originalPath.length === 0) {
        return '';
    }

    if (isUNCPath(originalPath)) {
        return encodeSegments(originalPath.split('\\'));
    }

    try {
        let encoded = encodeSegments(originalPath.split('\\'));
        if (encoded.endsWith('%2F') || encoded.endsWith('/')) {
            encoded = encoded.replace(/(%2F|\/)$/, '');
        }
        return encoded;
    } catch (err) {
        return encodeURIComponent(originalPath);
    }
}

function buildProtocolUrl(originalPath) {
    return `pathhub://${encodeWindowsPath(originalPath)}`;
}

module.exports = {
    encodeWindowsPath,
    buildProtocolUrl
};
