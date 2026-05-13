const MAX_PATH_LENGTH = 4096;
const MAX_PATHS_PER_SHARE = 50;
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 32;
const MAX_NOTE_LENGTH = 200;
const ALLOWED_EXPIRY_DAYS = [7, 30, 90, 365, 0];
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

function validatePaths(input) {
    if (!Array.isArray(input)) {
        return { ok: false, error: 'paths は配列で指定してください' };
    }
    if (input.length === 0) {
        return { ok: false, error: 'パスが1つも指定されていません' };
    }
    if (input.length > MAX_PATHS_PER_SHARE) {
        return { ok: false, error: `パスは最大 ${MAX_PATHS_PER_SHARE} 件までです` };
    }

    const cleaned = [];
    for (let i = 0; i < input.length; i++) {
        const r = validateFilePath(input[i]);
        if (!r.ok) {
            return { ok: false, error: `${i + 1} 行目: ${r.error}` };
        }
        cleaned.push(r.value);
    }
    return { ok: true, value: cleaned };
}

function validateTags(input) {
    if (input === undefined || input === null || input === '') {
        return { ok: true, value: '' };
    }
    if (typeof input !== 'string') {
        return { ok: false, error: 'タグは文字列で指定してください' };
    }
    const tags = input.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (tags.length > MAX_TAGS) {
        return { ok: false, error: `タグは最大 ${MAX_TAGS} 個までです` };
    }
    for (const tag of tags) {
        if (tag.length > MAX_TAG_LENGTH) {
            return { ok: false, error: `タグが長すぎます（最大 ${MAX_TAG_LENGTH} 文字）: ${tag.slice(0, 20)}...` };
        }
        if (CONTROL_CHARS.test(tag)) {
            return { ok: false, error: 'タグに使用できない制御文字が含まれています' };
        }
    }
    return { ok: true, value: tags.join(',') };
}

function validateNote(input) {
    if (input === undefined || input === null || input === '') {
        return { ok: true, value: '' };
    }
    if (typeof input !== 'string') {
        return { ok: false, error: 'メモは文字列で指定してください' };
    }
    const trimmed = input.trim();
    if (trimmed.length > MAX_NOTE_LENGTH) {
        return { ok: false, error: `メモが長すぎます（最大 ${MAX_NOTE_LENGTH} 文字）` };
    }
    if (CONTROL_CHARS.test(trimmed)) {
        return { ok: false, error: 'メモに使用できない制御文字が含まれています' };
    }
    return { ok: true, value: trimmed };
}

function validateExpiresInDays(input) {
    if (input === undefined || input === null || input === '') {
        return { ok: true, value: 90 };
    }
    const n = Number(input);
    if (!Number.isInteger(n) || !ALLOWED_EXPIRY_DAYS.includes(n)) {
        return { ok: false, error: `有効期限の値が不正です（許可値: ${ALLOWED_EXPIRY_DAYS.join(', ')}）` };
    }
    return { ok: true, value: n };
}

function computeExpiresAt(days) {
    if (!days || days <= 0) return null;
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
    validateFilePath,
    validatePaths,
    validateTags,
    validateNote,
    validateExpiresInDays,
    computeExpiresAt,
    MAX_PATH_LENGTH,
    MAX_PATHS_PER_SHARE,
    MAX_TAGS,
    MAX_TAG_LENGTH,
    MAX_NOTE_LENGTH,
    ALLOWED_EXPIRY_DAYS
};
