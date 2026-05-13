const MAX_PATH_LENGTH = 4096;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

function validateFilePath(input) {
    if (typeof input !== 'string') {
        return { ok: false, error: 'ファイルパスが指定されていません' };
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return { ok: false, error: 'ファイルパスが指定されていません' };
    }

    if (trimmed.length > MAX_PATH_LENGTH) {
        return { ok: false, error: `ファイルパスが長すぎます（最大 ${MAX_PATH_LENGTH} 文字）` };
    }

    if (CONTROL_CHARS.test(trimmed)) {
        return { ok: false, error: 'ファイルパスに使用できない制御文字が含まれています' };
    }

    return { ok: true, value: trimmed };
}

module.exports = {
    validateFilePath,
    MAX_PATH_LENGTH
};
