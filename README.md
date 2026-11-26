# STACKUP — AWS SAP Learning

AWS Certified Solutions Architect – Professional の学習用Webアプリです。React + TypeScript + Void + Tailwind CSS、Cloudflare Workers / D1 を使用します。AWS非公式です。

## 実装済み

- ユーザーID・パスワードによる新規登録、ログイン、ログアウト
- パスワード変更（ほかのログインセッションを失効）
- 分野別・問題数別のランダム演習、単一選択・複数選択、解答後の選択肢別解説
- 進捗の自動保存と再開、完了した演習の振り返り
- 間違えた・自信がなかった問題の復習、ブックマーク
- 解答数・初回正答率・全回答の正答率・分野別成績
- PC・スマートフォンに対応した日本語UI

メール、パスワードリセット、管理者、管理画面、時間制限付き模擬試験はありません。メールアドレスは収集しません。パスワードを紛失したアカウントは復旧できません。

## ローカル開発

Node.js `^24.22.0 || >=26.12.0` と npm が必要です。

```sh
cd /workspace/sap-learning
npm ci
npm run db:migrate
npm run dev -- --host 0.0.0.0
```

ブラウザで開発サーバーを開き、新規登録してください。初期アカウントや共通パスワードはありません。ローカルDBは `.void/` 内に保存されます。開発サーバーを再起動してもデータは保持されます。

このクラウド環境でホームディレクトリへの書き込みが制限される場合は、以下を使います。

```sh
npm_config_cache=/tmp/sap-npm npm ci
npm run db:migrate
XDG_CONFIG_HOME=/tmp/sap-xdg npm run dev -- --host 0.0.0.0
```

タスクは既に隔離されているので、既存のチェックアウトで作業し、明示的な依頼がない限りGit worktreeを作成する必要はありません。

## 検証

```sh
npm run check
npm test
npm run build
# 開発サーバーを起動した状態で実行。別ポートの場合は playwright.config.ts を変更
npm run test:e2e
```

E2EはローカルDBにテスト用ユーザーと履歴を作成します。本番には実行しないでください。`npx playwright install chromium` でブラウザを用意してください。別の Chromium を使う場合は `CHROMIUM_PATH` を指定します。

単体テストは問題JSONの整合性、複数選択の採点、パスワードのソルト・照合、セッショントークンを検証します。E2Eは登録から復習・再ログインまで、ユーザー間のデータ分離、回答前の正解非公開、CSRF拒否、二重回答拒否、ログイン試行制限を検証します。

## 問題JSONの管理

`data/questions.json` を編集して再ビルド・再デプロイします。初期収録の6問は**動作確認用のサンプル**で、本試験レベルの予想問題ではありません。

```json
{
  "id": "sap-001",
  "version": 1,
  "domain": "組織・複雑性",
  "services": ["AWS Organizations"],
  "type": "single",
  "question": "問題文",
  "choices": [
    { "id": "a", "text": "選択肢A" },
    { "id": "b", "text": "選択肢B" }
  ],
  "correctAnswers": ["a"],
  "explanation": "全体の解説",
  "choiceExplanations": { "a": "正しい理由", "b": "誤りの理由" },
  "references": ["https://docs.aws.amazon.com/"],
  "isSample": false
}
```

- IDは一意で固定。並べ替えても変更しないでください。
- 内容・正解を修正した際は `version` を増やしてください。
- `single` は正解が1個、`multiple` は2個以上。全選択肢に解説が必要です。
- `npm test` がJSONの必須項目・ID重複・正解と選択肢の対応を検証します。
- 問題はサーバー側だけに読み込み、回答を確定するまで正解・解説を返しません。
- 演習開始時点の問題・バージョンをDBへ保存します。編集後も過去の演習の採点と解説は当時のまま保持されます。
- 初回正答率は固定問題IDの初回回答、全回答の正答率は全履歴に基づきます。問題のバージョン変更でリセットされません。
- 復習リストは問題IDごとの直近の回答が不正解、または「自信がない」の問題です。正解し自信なしを外すと復習リストから外れます。
- 削除した問題は新規出題・ブックマーク一覧から外れますが、過去の演習には残ります。

## 認証とデータ

- IDは半角英数字と `_` の3〜24文字、大文字小文字を区別しません。
- パスワードは12〜128文字。Workers Web Cryptoで対応するPBKDF2-SHA256（100,000回、ランダムソルト）を使用し、平文は保存しません。
- ランダムなセッショントークンのSHA-256ハッシュのみをDBへ保存。有効期限は7日です。
- CookieはHttpOnly / SameSite=Lax、本番HTTPSではSecureを指定します。
- 更新APIは同一Origin・JSONを要求。認証・ユーザー所有権の確認はサーバーで行います。
- ID・IP単位の認証試行制限と、登録・演習開始の回数制限があります。ローカル環境ではIPの情報がない場合、共通のローカル枠になります。
- 演習更新はリビジョンを照合し、同じ問題の二重回答や並行更新による上書きを拒否します。
- 小規模利用を想定した初期版です。成績集計は利用者の演習履歴を読む方式で、大量データ向けの集計テーブル・ページングは未実装です。

## データベース変更

`db/schema.ts` の変更後、以下を実行し、生成SQLと `meta` をコミットしてください。

```sh
npm run db:generate
npm run db:migrate
```

`db:migrate` はローカルへの適用です。本番への適用はデプロイ時にVoidが行います。既存データを消す `void db reset` は通常の起動手順に使用しません。

## Cloudflareへの公開（まだ実施していません）

Cloudflareアカウントで認証し、無料プランの利用枠を確認してから実行します。

```sh
npx void cloudflare login
npm run deploy
```

VoidがWorkers・D1を構成し、DBマイグレーションを適用します。独自ドメイン、メール、有料のVoid Platformは不要です。無料URLを利用し、Workers / D1の無料枠で運用します。利用枠・プランの契約内容は公開時に確認が必要です。無制限の無料稼働を保証するものではありません。

本番Cloudflareでの認証・デプロイ・無料枠の確認は未実施です。ローカル検証と本番での稼働確認は別です。

### GitHub Actions

PR と main への push で CI が型検査・単体テスト・ビルド・ローカルDBを使うE2Eを実行します。main の CI 成功後、別のデプロイワークフローが検証済みコミットを Cloudflare へデプロイし、マイグレーションも適用します。手動で再実行する場合は main の CI を実行してください。

リポジトリの Actions secrets に `CLOUDFLARE_API_TOKEN` を設定してください。初回の Workers 作成と D1 の構成・マイグレーションに必要な権限を付与します。複数アカウントにアクセスできるトークンの場合は Actions variables に `CLOUDFLARE_ACCOUNT_ID`、必要に応じて `CLOUDFLARE_WORKERS_SUBDOMAIN` も設定します。詳細は [Void の Cloudflare CI 手順](https://void.cloud/integrations/cloudflare)を参照してください。
