# デプロイ手順ガイド

## GitHub Pages での公開（推奨）

### 1. GitHubリポジトリの作成
1. GitHubにログイン
2. 新しいリポジトリを作成（例: `seiji-portfolio`）
3. リポジトリを公開設定にする

### 2. ファイルのアップロード
```bash
# 現在のディレクトリで
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/seiji-portfolio.git
git push -u origin main
```

### 3. GitHub Pagesの有効化
1. リポジトリの設定（Settings）に移動
2. Pages セクションを選択
3. Source を "Deploy from a branch" に設定
4. Branch を "main" に設定
5. Save をクリック

### 4. 公開URLの確認
- 公開URL: `https://yourusername.github.io/seiji-portfolio/`
- 数分後にアクセス可能になります

## Netlify での公開

### 1. Netlifyアカウントの作成
1. [Netlify](https://netlify.com) にアクセス
2. GitHubアカウントでサインアップ

### 2. デプロイの設定
1. "New site from Git" をクリック
2. GitHub を選択
3. リポジトリを選択
4. デプロイ設定:
   - Build command: 空欄
   - Publish directory: `seiji-portfolio`

### 3. カスタムドメイン（オプション）
1. ドメイン設定でカスタムドメインを追加
2. DNS設定を更新

## Vercel での公開

### 1. Vercelアカウントの作成
1. [Vercel](https://vercel.com) にアクセス
2. GitHubアカウントでサインアップ

### 2. プロジェクトのインポート
1. "New Project" をクリック
2. GitHubリポジトリを選択
3. 設定を確認してデプロイ

## URLの更新

### 現在のローカル環境設定
現在はローカル環境のファイルを参照するように設定されています：

```html
<!-- ローカル環境の例 -->
<a href="../brain_training_game.html">脳トレゲーム</a>
<a href="../unified_admin.html">統一管理画面</a>
```

### 外部公開時の設定
デプロイ後、以下のファイルのURLを実際のURLに更新してください：

1. `works.html` - システムアクセスセクション
2. `index.html` - クイックアクセスリンク
3. その他のゲームリンク

### 更新例
```html
<!-- 変更前（ローカル） -->
<a href="../brain_training_game.html">脳トレゲーム</a>

<!-- 変更後（外部公開） -->
<a href="https://yourusername.github.io/seiji-portfolio/brain_training_game.html">脳トレゲーム</a>
```

## 注意事項

- 外部リンクは `target="_blank"` を使用して新しいタブで開く
- セキュリティのため、HTTPSを使用する
- 定期的にリンクの動作を確認する
- 404エラーが発生した場合は、ファイルパスを確認する

## トラブルシューティング

### よくある問題
1. **画像が表示されない**
   - ファイルパスを確認
   - 画像ファイルがリポジトリに含まれているか確認

2. **CSSが適用されない**
   - ファイルパスを確認
   - キャッシュをクリア

3. **リンクが動作しない**
   - URLの正確性を確認
   - ファイルが存在するか確認

### サポート
問題が発生した場合は、以下を確認してください：
- ブラウザの開発者ツールでエラーを確認
- ファイルパスとURLの正確性
- リポジトリの公開設定 