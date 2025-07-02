const { exec } = require('child_process');
const path = require('path');
const os = require('os');

console.log('PathHub プロトコルハンドラーをインストール中...');

if (os.platform() !== 'win32') {
    console.log('このスクリプトはWindows専用です。');
    console.log('macOSやLinuxでは手動でプロトコルハンドラーを設定してください。');
    process.exit(1);
}

// 実行ファイルのパスを取得
const clientAppPath = path.resolve(__dirname, 'index.js');
const nodePath = process.execPath;

// レジストリエントリを作成するコマンド
const registryCommands = [
    // プロトコルハンドラーのルートキー
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub" /f`,
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub" /v "URL Protocol" /t REG_SZ /d "" /f`,
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub" /ve /t REG_SZ /d "PathHub Protocol" /f`,
    
    // デフォルトアイコン
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub\\DefaultIcon" /ve /t REG_SZ /d "${nodePath},0" /f`,
    
    // コマンド実行設定
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub\\shell" /f`,
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub\\shell\\open" /f`,
    `reg add "HKEY_CURRENT_USER\\Software\\Classes\\pathhub\\shell\\open\\command" /ve /t REG_SZ /d "\\"${nodePath}\\" \\"${clientAppPath}\\" \\"%1\\"" /f`
];

// レジストリコマンドを順番に実行
function executeRegistryCommands(commands, index = 0) {
    if (index >= commands.length) {
        console.log('✅ PathHub プロトコルハンドラーのインストールが完了しました！');
        console.log('');
        console.log('📋 テスト方法:');
        console.log('1. ブラウザのアドレスバーに以下を入力してください:');
        console.log('   pathhub://C:\\\\Users');
        console.log('2. PathHubクライアントが起動してエクスプローラーが開くはずです');
        console.log('');
        console.log('🔄 アンインストール方法:');
        console.log('   reg delete "HKEY_CURRENT_USER\\\\Software\\\\Classes\\\\pathhub" /f');
        return;
    }

    const command = commands[index];
    console.log(`実行中: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ エラー: ${error.message}`);
            return;
        }

        if (stderr) {
            console.warn(`⚠️  警告: ${stderr}`);
        }

        console.log(`✅ 完了: コマンド ${index + 1}/${commands.length}`);
        
        // 次のコマンドを実行
        executeRegistryCommands(commands, index + 1);
    });
}

// 管理者権限の確認
console.log('📝 注意: このスクリプトは現在のユーザー用にプロトコルハンドラーを登録します。');
console.log('システム全体への登録には管理者権限が必要です。');
console.log('');

// レジストリコマンドの実行開始
executeRegistryCommands(registryCommands); 