# PathHub Client インストーラー ビルド手順

PathHub クライアントアプリの Windows 用インストーラー (`PathHub-Setup-X.Y.Z.exe`) を生成する手順です。

## 前提

| ツール | バージョン | 用途 |
|---|---|---|
| Node.js | 18+ | クライアントアプリのビルド (pkg) |
| Inno Setup | 6.x | インストーラー生成 (iscc コマンド) |
| Windows | 10/11 | ビルド環境（Linux/macOS では Inno Setup が動作しません） |

Inno Setup は [公式サイト](https://jrsoftware.org/isinfo.php) から入手し、インストール時に `iscc.exe` を PATH に追加してください。

## ビルド手順

```powershell
# 1. クライアント EXE を pkg で生成
cd client-app
npm install
npm run build       # → client-app\dist\pathhub-client.exe

# 2. インストーラーを Inno Setup で生成
cd ..
iscc installer\pathhub-client.iss
# → dist\PathHub-Setup-1.0.0.exe
```

`npm run build:installer` を `client-app` で実行すると pkg + iscc を一括実行します。

## バージョン更新

リリースのたびに以下の 2 ファイルのバージョンを揃えてください。

- `client-app/package.json` の `version`
- `installer/pathhub-client.iss` の `MyAppVersion`

## 配布

```powershell
gh release create v1.0.0 dist\PathHub-Setup-1.0.0.exe --notes "Initial release"
```

サーバー側 `/api/latest-client` が GitHub Releases API から最新バージョンを取得して `/download` 画面のダウンロードボタンに紐付けます。

## 動作

インストーラーは以下を行います。

1. `C:\Program Files\PathHub\` (権限が無ければ `%LOCALAPPDATA%\Programs\PathHub\`) に `pathhub-client.exe` を配置
2. `HKCU\Software\Classes\pathhub` にプロトコルハンドラーを登録（管理者権限不要）
3. アンインストーラーを生成（コントロールパネルから削除可能、レジストリも自動削除）

## 動作確認

```powershell
# ブラウザのアドレスバーに以下を入力
pathhub://C:\Users
# → エクスプローラーで C:\Users が開けば成功
```

## トラブルシューティング

- **SmartScreen 警告**: 未署名 EXE のため初回は「詳細情報」→「実行」が必要です。Authenticode 署名は今回スコープ外。
- **既存版が残る**: 旧 PathHub クライアント（プロトコルハンドラー手動登録版）を使っている環境では、`reg delete "HKCU\Software\Classes\pathhub" /f` で古いキーを消してから新インストーラーを実行してください。
