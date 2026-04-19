# vpm.t7i.io

Tsuitachi Studio VPM Repository

## Workflow

### 自動更新（推奨）
1. 各パッケージリポジトリでタグリリースを作成
2. パッケージリポジトリのGitHub Actionsが自動的にこのリポジトリのActionsをトリガー
3. VPMリポジトリ (`vpm.json`) が自動更新され、GitHub Pagesで公開される

### 手動更新
1. パッケージマニフェストJSONファイルを `/packages` に追加するプルリクエストを作成
2. GitHub Actionsが自動的にVPMリポジトリ (`vpm.json`) を更新
3. PRがマージされると、更新されたVPMリポジトリがGitHub Pagesで公開される

## Site Structure
- `index.html` - パッケージ一覧ページ（自動生成）
- `vpm.json` - VPMリポジトリマニフェストファイル
- `packages/` - パッケージマニフェストファイル

## Local Testing

依存関係のインストール:
```bash
npm install
```

VPMリポジトリの生成:
```bash
npm run dev vpm.json
```

TypeScriptのビルド:
```bash
npm run build
```

HTML一覧ページの生成:
```bash
npm run generate-html vpm.json index.html
```

## VPMパッケージマニフェストの作成

### 方法1: インタラクティブCLI（推奨）
```bash
npm run create-manifest:interactive
```
対話形式でパッケージ情報を入力し、VPMマニフェストを生成します。

### 方法2: コマンドライン
```bash
npm run create-manifest <source-package.json> [options]
```

オプション:
- `--output <path>` - 出力先パス
- `--release-url <url>` - リリースZIPの直接URL
- `--repo-url <url>` - リポジトリURL（リリースURLを自動生成）
- `--sha256 <hash>` - ZIPファイルのSHA256ハッシュ

例:
```bash
npm run create-manifest Packages/io.t7i.mypackage/package.json \
  --output packages/io.t7i.mypackage.json \
  --repo-url https://github.com/user/repo
```

### マニフェストの検証
```bash
npm run validate-manifest packages/io.t7i.mypackage.json
```

## パッケージリポジトリのセットアップ

タグをプッシュするだけで、ZIP作成・リリース・VPM登録が全自動で完了します。

### パターン1: 1リポジトリに1パッケージ

1. **ワークフローファイルをコピー**

`.github/workflows/package-release-example.yml` を各パッケージリポジトリにコピーして、以下を修正：

```yaml
# 行33, 108: Unity package.json のパス
PACKAGE_JSON="Packages/io.t7i.yourpackage/package.json"

# 行50: パッケージディレクトリ
echo "package_dir=Packages/io.t7i.yourpackage" >> $GITHUB_OUTPUT

# 行130: VPMリポジトリ名
repo: sakuhanight/vpm.t7i.io
```

2. **リリース実行**

```bash
git tag v1.0.0
git push --tags
```

これだけで完了です。

### パターン2: 1リポジトリに複数パッケージ

1. **ワークフローファイルをコピー**

`.github/workflows/package-release-multi-example.yml` を各パッケージリポジトリにコピーして、packages配列を修正：

```yaml
# 行45-62: パッケージ情報の配列
{
  "package": [
    {
      "id": "package-a",
      "path": "Packages/io.t7i.package-a/package.json",
      "dir": "Packages/io.t7i.package-a"
    },
    {
      "id": "package-b",
      "path": "Packages/io.t7i.package-b/package.json",
      "dir": "Packages/io.t7i.package-b"
    }
  ]
}

# 行214: VPMリポジトリ名
repo: sakuhanight/vpm.t7i.io
```

2. **リリース実行**

```bash
# 全パッケージを同時リリース
git tag v1.0.0
git push --tags

# または、個別パッケージのみリリース
git tag package-a/v1.0.0
git push --tags
```

複数パッケージが自動的に処理されます。

### 自動実行される処理

1. Unity package.json から情報を読み取り
2. パッケージZIPを作成（正しい構造で）
3. SHA256ハッシュを計算
4. GitHub Releaseを作成
5. VPMリポジトリに登録

### パッケージZIPの構造

ワークフローは自動的に正しい構造でZIPを作成します：

```
✓ 自動生成される構造:
package-v1.0.0.zip
├── package.json
├── Runtime/
└── Editor/
```

**重要**: ZIPのルートに `package.json` が必要です。

### トラブルシューティング

#### ワークフローが実行されない
- パッケージリポジトリの Actions が有効になっているか確認
- タグ形式が `v*.*.*` に一致しているか確認

#### ZIP作成に失敗する
- Unity package.json のパスが正しいか確認
- package_dir のパスが正しいか確認
