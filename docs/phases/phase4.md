# Wove Phase4 実装方針（MCP / AI接続）

Wove の Phase4 では、これまで `wove/api` に実装してきた Hono API と、ChatGPT 上でのカリキュラム作成フローを接続し、AIが生成したカリキュラムを Wove に保存できる状態を作る。

## このフェーズの目的

目的は「AIを使った何か高度なこと」を広く実装することではなく、以下の一気通貫フローを成立させること。

- ユーザーが ChatGPT 上で学習したい分野を相談する
- ChatGPT が見やすいカリキュラムを提示する
- ユーザーが保存を承認する
- MCP ツール `save_curriculum` を呼び出す
- `wove/api` の保存 API を叩く
- `curriculum + topics` を一括保存する
- 保存成功を返す

## 責務分離

- ChatGPT: カリキュラム生成 / 人間向け表示 / 保存承認の取得
- mcp: AI向けツール公開 / 引数受け取り / Hono API への橋渡し
- api: 業務ロジック / バリデーション / DB 保存
- db: 永続化 / 制約 / RLS

MCP サーバー側に業務ロジックや DB ロジックを寄せすぎないこと。

## MCP → POST /curricula の認証（MVP）

結論: ユーザーの Supabase JWT を MCP からそのまま Hono に Bearer で中継する。

流れ:

- ChatGPT（ユーザー）がアクセストークンを保持する想定
- MCP が `Authorization: Bearer <token>` を付与して Hono API を呼ぶ
- Hono が Supabase（RLS）へアクセスする

## MCP 側の実装方針

受け取ったトークン、または設定されたトークンをそのまま `Authorization` ヘッダーで forward する（例: `fetch` で `Authorization: Bearer ${token}`）。

## トークンの渡し方（MVP・推奨）

開発中は手動で環境変数に入れる（例: `SUPABASE_ACCESS_TOKEN`）。MVP の目的は「1回通すこと」。ChatGPT Connector / OAuth / セッション連携は今はやらない。本番では Supabase Auth とフロントから渡す設計に拡張できる。

## slug 生成と衝突解決（MVP）

結論: サーバー側で slug を生成し、衝突時はサフィックス（`-1`, `-2`, …）で自動解決する。slug 競合を理由に 409 は返さない（保存体験を優先）。

### 基本ルール

- 小文字化する
- 空白はハイフンにする
- 記号は除去する
- 最大長は 50 文字（サフィックス付与後も上限内に収める）

### 日本語タイトル（MVP）

日本語はそのまま残す（無理なローマ字化はしない）。例: `Web開発` → `web開発`（小文字化後）。

### 例

- title: Web → slug: `web`
- title: Web Basics → slug: `web-basics`
- title: Web開発 → slug: `web開発`

### 衝突時の処理

1. 上記ルールで slug を生成する
2. DB で `(user_id, slug)` の存在を確認する
3. 存在する場合は `-1`, `-2`, `-3` … を付けて空くまで繰り返す（`web`, `web-1`, `web-2`）

## 実装対象

- MCP サーバーの新規作成
- `save_curriculum` ツール定義
- `save_curriculum` → `POST /curricula` 接続
- Hono 側 `POST /curricula` 保存 API
- curriculum + topics の一括保存
- 保存結果返却

## このフェーズで扱う保存対象

今回の保存対象は以下のみとする。

- curriculum
- topics[]

つまり、最初に AI 連携する対象は **カリキュラム保存のみ** とする。

### 今回はまだ扱わないもの

- summaries 保存
- test_results 保存
- progress 更新
- topic 木構造
- アプリ内 AI 生成 UI

## 表示用と内部用の方針

### 表示用

ユーザーには、人間が読みやすい自然文のカリキュラムを提示する。

表示例:

- タイトル
- 概要
- 推奨トピック一覧
- 各トピックの説明
- 保存案内

### 内部用

保存時の真のデータは JSON 構造を用いる。

重要なのは、表示用テキストを後から解析して JSON 化するのではなく、保存時に `save_curriculum` の引数として構造化データを確定するということ。

## save_curriculum の役割

`save_curriculum` は以下の責務だけを持つ。

- カリキュラム構造を受け取る
- 最低限の shape を確認する
- `wove/api` の `POST /curricula` を呼ぶ
- 保存結果を返す

`save_curriculum` 自体は、DB 保存や業務ロジックの本体を持たない。

## save_curriculum の入力仕様

```typescript
type SaveCurriculumInput = {
  title: string;
  description: string;
  topics: {
    title: string;
    description: string;
    orderIndex: number;
  }[];
};
```

### 入力ルール

- `title` は必須
- `description` は必須
- `topics` は 1 件以上必須
- `topics[].title` は必須
- `topics[].description` は必須
- `topics[].orderIndex` は必須（1 以上の整数）
- `topics` 内の `orderIndex` は重複不可

## Hono 側保存 API の役割

今回新たに追加する保存 API は以下。

`POST /curricula`

### API の責務

- 認証済みユーザーを特定する
- 入力を検証する
- slug を生成する（上記「slug 生成と衝突解決」に従う）
- curriculum を保存する
- topics を一括保存する
- 保存結果を返す

## POST /curricula の入力仕様

MCP 側の `save_curriculum` と同じ構造を受け取る。

```json
{
  "title": "Web",
  "description": "Webの全体像をつかみながら、通信・データ・アプリケーション・セキュリティ・運用までを順番に学ぶためのカリキュラム",
  "topics": [
    {
      "title": "TCP/IP",
      "description": "インターネット通信の基盤となる考え方を学ぶ",
      "orderIndex": 1
    },
    {
      "title": "DNS",
      "description": "ドメイン名とIPアドレスの対応付けの仕組みを学ぶ",
      "orderIndex": 2
    }
  ]
}
```

### API 側で付与するもの

- `user_id`（認証から取得）
- `slug`（title から生成。衝突はサフィックスで自動解決）
- `topics.status = not_started`

リクエストボディに `user_id` や `slug` は含めない。

## 保存フロー

1. ChatGPT がカリキュラムを提示する
2. ユーザーが「保存して」と承認する
3. `save_curriculum` が呼ばれる
4. MCP サーバーが `POST /curricula` を叩く（Bearer で JWT を転送）
5. Hono 側で以下を行う
   - 認証ユーザー取得
   - 入力検証
   - slug 生成（必要ならサフィックスで一意化）
   - curricula 保存
   - topics 一括保存
   - 保存結果を返す
6. ChatGPT が保存完了を返す

## 保存時の topics 初期値

topics 保存時の `status` はすべて以下で統一する。

`not_started`

理由:

- カリキュラム保存直後はまだ未学習だから
- 初期状態として自然だから
- API 入力をシンプルに保てるから

## エラーハンドリング方針

最低限、以下の分類で扱う。

### 400 Bad Request

入力不正。例:

- topics が空
- orderIndex 重複（エラー例: `topics orderIndex must be unique`）
- 文字数超過（上限は DB 定義に合わせる）

### 401 Unauthorized

認証失敗

### 500 Internal Server Error

予期しないサーバーエラー

補足（MVP）: slug の一意性は API 側でサフィックス付与により解決するため、slug 競合を理由とした 409 は返さない。

## 実装順序

1. `apps/mcp` の作成
2. MCP サーバーの最小起動確認
3. `save_curriculum` ツール定義
4. `apps/api` に `POST /curricula` 実装
5. `save_curriculum` → `POST /curricula` 接続
6. curriculum + topics 一括保存の確認
7. ChatGPT 上で保存フローの疎通確認

## 実装方針

- 最初は `save_curriculum` 1 本だけに絞る
- MCP サーバーは薄く保つ
- DB ロジックは API 側に寄せる
- 入力とレスポンスの形をできるだけ単純にする
- 「まず 1 回保存できる」を優先する
- 汎用化・抽象化は後回しにする

## 今回やらないこと

- `save_summary`
- `save_progress`
- test_results 関連ツール
- カリキュラム更新ツール
- 削除ツール
- アプリ内 AI 生成 UI
- AI による自動補正や高度な整形
- ツールの汎用化 / 共通化の作り込み

## 完了条件

以下が成立すれば Phase4 の最小実装は完了とみなす。

- ChatGPT 上でカリキュラムを提示できる
- ユーザーが保存を承認できる
- `save_curriculum` が呼ばれる
- `POST /curricula` が正常に叩かれる
- curriculum と topics が DB に保存される
- 保存成功を ChatGPT に返せる
