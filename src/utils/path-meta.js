function isUNCPath(filePath) {
    return typeof filePath === 'string' && filePath.startsWith('\\\\');
}

function getDisplayName(filePath) {
    const parts = filePath.replace(/\\/g, '/').split('/').filter(p => p);
    return parts.pop() || filePath;
}

function isFileLike(filePath, displayName) {
    const name = displayName !== undefined ? displayName : getDisplayName(filePath);
    return name.includes('.') && !filePath.endsWith('/') && !filePath.endsWith('\\');
}

function describePath(filePath) {
    const name = getDisplayName(filePath);
    return {
        name,
        isFile: isFileLike(filePath, name),
        isUNC: isUNCPath(filePath)
    };
}

module.exports = {
    isUNCPath,
    getDisplayName,
    isFileLike,
    describePath
};
