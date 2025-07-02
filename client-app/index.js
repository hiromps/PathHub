#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const notifier = require('node-notifier');

// ログファイルの設定
const logFile = path.join(__dirname, 'pathhub-client.log');

function writeLog(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(message);
    
    try {
        fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {
        console.error('ログファイル書き込みエラー:', error.message);
    }
}

writeLog('PathHub Client App 起動中...');
writeLog(`Node.js バージョン: ${process.version}`);
writeLog(`プラットフォーム: ${process.platform}`);
writeLog(`引数: ${JSON.stringify(process.argv)}`);

// コマンドライン引数を取得
const args = process.argv.slice(2);

if (args.length === 0) {
    writeLog('PathHub Client App v1.0.0');
    writeLog('使用方法: pathhub-client <protocol-url>');
    writeLog('例: pathhub-client "pathhub://C:\\Users\\Documents\\sample.txt"');
    process.exit(0);
}

// プロトコルURLから実際のパスを抽出
function extractPathFromProtocol(protocolUrl) {
    writeLog(`パス抽出開始: ${protocolUrl}`);
    
    // pathhub://path の形式からpathを抽出
    if (protocolUrl.startsWith('pathhub://')) {
        const encodedPath = protocolUrl.replace('pathhub://', '');
        writeLog(`エンコードされたパス: ${encodedPath}`);
        
        try {
            // サーバー側のエンコーディング形式に対応したデコード処理
            if (encodedPath.includes('%5C')) {
                // パス区切り文字（%5C = \）で分割してデコード
                const pathParts = encodedPath.split('%5C');
                const decodedParts = pathParts.map(part => {
                    if (part === '') return part; // 空の部分はそのまま
                    try {
                        return decodeURIComponent(part);
                    } catch (decodeError) {
                        writeLog(`パート "${part}" のデコードエラー: ${decodeError.message}`);
                        return part; // デコードに失敗した場合はそのまま返す
                    }
                });
                const finalPath = decodedParts.join('\\');
                writeLog(`分割デコード結果:`);
                writeLog(`  元のパス: ${encodedPath}`);
                writeLog(`  分割: ${JSON.stringify(pathParts)}`);
                writeLog(`  デコード後: ${JSON.stringify(decodedParts)}`);
                writeLog(`  最終パス: ${finalPath}`);
                
                // Windowsパスの正規化
                const normalizedPath = normalizeWindowsPath(finalPath);
                writeLog(`  正規化後: ${normalizedPath}`);
                return normalizedPath;
            } else {
                // 従来の単純なデコード
                const decodedPath = decodeURIComponent(encodedPath);
                writeLog(`単純デコード結果: ${decodedPath}`);
                
                // Windowsパスの正規化
                const normalizedPath = normalizeWindowsPath(decodedPath);
                writeLog(`  正規化後: ${normalizedPath}`);
                return normalizedPath;
            }
        } catch (error) {
            writeLog(`デコードエラー: ${error.message}`);
            // エラーの場合はエンコードされたパスをそのまま返す
            return encodedPath;
        }
    }
    
    writeLog(`プロトコルURL以外: ${protocolUrl}`);
    return protocolUrl;
}

// UNCパス（ネットワークパス）かどうかを判定
function isUNCPath(filePath) {
    return filePath.startsWith('\\\\') || filePath.startsWith('//');
}

// Windowsパスの正規化
function normalizeWindowsPath(filePath) {
    if (!filePath) return filePath;
    
    // スラッシュをバックスラッシュに統一
    let normalized = filePath.replace(/\//g, '\\');
    
    // 末尾のバックスラッシュを除去（ドライブルート以外）
    if (normalized.length > 3 && normalized.endsWith('\\')) {
        normalized = normalized.slice(0, -1);
    }
    
    // 末尾のスラッシュも除去
    if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    
    // 連続するバックスラッシュを修正（UNCパスの先頭は除く）
    if (normalized.startsWith('\\\\')) {
        // UNCパスの場合：先頭の\\は保持
        normalized = '\\\\' + normalized.substring(2).replace(/\\+/g, '\\');
    } else {
        // ローカルパスの場合：連続するバックスラッシュを単一に
        normalized = normalized.replace(/\\+/g, '\\');
    }
    
    return normalized;
}

// ファイルパスをエクスプローラーで開く
function openInExplorer(filePath) {
    writeLog(`ファイルパスを開いています: ${filePath}`);
    
    let command;
    const platform = process.platform;
    
    if (platform === 'win32') {
        if (isUNCPath(filePath)) {
            // UNCパス（ネットワークパス）の場合
            writeLog('UNCパス（ネットワークパス）を検出しました');
            
            // UNCパスの場合は存在確認をスキップして直接開く
            // パスの正規化（バックスラッシュに統一）
            const normalizedPath = normalizeWindowsPath(filePath);
            writeLog(`正規化されたUNCパス: ${normalizedPath}`);
            
            // UNCパスの場合はstartコマンドを使用
            command = `start "" explorer.exe "${normalizedPath}"`;
            
        } else {
            // ローカルパスの場合
            writeLog('ローカルパスを検出しました');
            
            // パスの正規化
            const normalizedPath = normalizeWindowsPath(filePath);
            writeLog(`正規化されたローカルパス: ${normalizedPath}`);
            
            try {
                // 日本語文字を含むパスでも適切に処理
                if (fs.existsSync(normalizedPath)) {
                    const stats = fs.statSync(normalizedPath);
                    if (stats.isDirectory()) {
                        // フォルダの場合
                        command = `start "" explorer.exe "${normalizedPath}"`;
                        writeLog('フォルダとして開きます');
                    } else {
                        // ファイルの場合、親フォルダを開いてファイルを選択
                        command = `start "" explorer.exe /select,"${normalizedPath}"`;
                        writeLog('ファイルを選択して親フォルダを開きます');
                    }
                } else {
                    writeLog('指定されたパスが存在しません');
                    // パスが存在しない場合、親フォルダを開く
                    const parentDir = path.dirname(normalizedPath);
                    writeLog(`親フォルダを確認: ${parentDir}`);
                    
                    if (fs.existsSync(parentDir)) {
                        command = `start "" explorer.exe "${parentDir}"`;
                        writeLog(`パスが存在しないため親フォルダを開きます: ${parentDir}`);
                    } else {
                        // 親ディレクトリも存在しない場合、そのまま試行
                        command = `start "" explorer.exe "${normalizedPath}"`;
                        writeLog(`親フォルダも存在しませんが、そのまま試行します`);
                    }
                }
            } catch (error) {
                // エラーが発生した場合、そのまま開く
                command = `start "" explorer.exe "${normalizedPath}"`;
                writeLog(`パス確認中にエラー: ${error.message}`);
            }
        }
    } else if (platform === 'darwin') {
        // macOS: open コマンドを使用
        command = `open "${filePath}"`;
    } else {
        // Linux: xdg-open を使用
        command = `xdg-open "${filePath}"`;
    }

    writeLog(`実行コマンド: ${command}`);

    exec(command, { shell: true, timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
            writeLog(`エラーが発生しました: ${error.message}`);
            writeLog(`stderr: ${stderr}`);
            writeLog(`stdout: ${stdout}`);
            
            // UNCパスの場合の特別なエラーハンドリング
            if (isUNCPath(filePath)) {
                writeLog('UNCパスアクセスエラーの可能性があります');
                
                // ネットワークパスへの接続を試行
                const serverPath = filePath.split('\\').slice(0, 4).join('\\'); // \\server\share
                writeLog(`サーバーパスへの接続を試行: ${serverPath}`);
                
                const fallbackCommand = `start "" explorer.exe "${serverPath}"`;
                writeLog(`フォールバックコマンド: ${fallbackCommand}`);
                
                exec(fallbackCommand, { shell: true }, (fallbackError, fallbackStdout, fallbackStderr) => {
                    if (fallbackError) {
                        writeLog(`フォールバックも失敗: ${fallbackError.message}`);
                        
                        notifier.notify({
                            title: 'PathHub エラー',
                            message: `ネットワークパスにアクセスできません:\n${path.basename(filePath)}\n\nサーバー: ${serverPath}`,
                            sound: true,
                            timeout: 7
                        });
                    } else {
                        writeLog('フォールバック（サーバーパス）を正常に開きました');
                        notifier.notify({
                            title: 'PathHub',
                            message: `サーバーパスを開きました:\n${serverPath}`,
                            sound: false,
                            timeout: 5
                        });
                    }
                });
            } else {
                // 通常のエラー通知
                notifier.notify({
                    title: 'PathHub エラー',
                    message: `ファイルパスを開けませんでした:\n${path.basename(filePath)}`,
                    sound: true,
                    timeout: 5
                });
            }
            
            return;
        }

        writeLog('ファイルパスを正常に開きました');
        
        // 成功の通知
        const baseName = isUNCPath(filePath) ? filePath.split('\\').pop() : path.basename(filePath);
        notifier.notify({
            title: 'PathHub',
            message: `ファイルパスを開きました:\n${baseName}`,
            sound: false,
            timeout: 3
        });
    });
}

// メイン処理
const protocolUrl = args[0];
const actualPath = extractPathFromProtocol(protocolUrl);

// 自動実行モードの検出
const isAutoExecution = process.env.BROWSER_AUTO_EXECUTION === 'true' || 
                       protocolUrl.includes('auto=true') ||
                       process.argv.includes('--auto');

writeLog(`受信したURL: ${protocolUrl}`);
writeLog(`抽出されたパス: ${actualPath}`);

if (isAutoExecution) {
    writeLog('🚀 自動実行モードが検出されました');
} else {
    writeLog('💻 手動実行モードです');
}

// 簡単なバリデーション
if (!actualPath || actualPath.trim() === '') {
    writeLog('エラー: 有効なファイルパスが指定されていません');
    process.exit(1);
}

// パスを開く
openInExplorer(actualPath); 