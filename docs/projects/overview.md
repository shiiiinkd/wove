# Wove API実装コンテキスト（Cursor用）

## プロジェクト概要

Wove は、ChatGPT を使った学習を「その場限りの会話」で終わらせず、  
体系化・保存・再利用できるようにする学習プラットフォームです。

このアプリの価値は、AI生成そのものではなく、以下にあります。

- 学習内容を構造化すること
- 学習進捗を保存すること
- 後から再開できること
- 理解の蓄積を可視化すること

### ChatGPT が担当するもの

- 学習方針の壁打ち
- カリキュラム案の生成
- 要約・テストの生成
- 学習内容の言語化

### Woveアプリが担当するもの

- 保存
- 構造管理
- 進捗管理
- 再取得・編集

---

## 現在の技術構成

- フロントエンド: Next.js
- バックエンドAPI: Hono
- DB / Auth: Supabase
- 言語: TypeScript

### 役割分担

- Next.js は UI レイヤー
- Hono は独立したバックエンド API
- Supabase Auth を認証の正とする
- RLS によってユーザーごとのデータ保護を行う

---

## 重要な設計ルール

1. 通常のユーザー向け API では **RLS をバイパスしない**
2. 通常のユーザー向け API では **service_role を使わない**
3. ユーザーごとの認可は **Supabase Auth + JWT + RLS** で行う
4. Hono は `Authorization: Bearer <token>` を受け取る
5. Hono はその token を使って Supabase client を生成し、RLS を正しく効かせる
6. 過剰設計は避け、まず MVP を通す
7. 完璧な設計より、動くエンドツーエンド実装を優先する

---

## 現在バックエンドで実装済みのこと

以下はすでに動作確認済みです。

- Hono を Node.js 上で起動
- Supabase への接続
- Authorization ヘッダの取得
- Bearer token の抽出
- `supabase.auth.getUser(token)` による認証確認
- token付き Supabase client の生成
- 認証付き `GET /curricula`
- 認証付き `GET /curricula/:id`

つまり現在、

- JWT認証は通っている
- RLSは正しく効いている
- ユーザー単位の読み取りはできている

状態です。

---

## データモデル

### auth.users

Supabase Auth が管理する認証用ユーザーテーブル

---

### public.profiles

アプリ側のプロフィール情報

カラム:

- id（auth.users.id と同じ）
- user_slug
- created_at
- updated_at

---

### public.curricula

ユーザーが持つ学習カリキュラム

カラム:

- id
- user_id
- title
- slug
- description
- created_at
- updated_at

補足:

- 1ユーザーは複数カリキュラムを持てる
- `(user_id, slug)` はユニーク

---

### public.topics

カリキュラム配下のトピック

カラム:

- id
- curriculum_id
- title
- description
- order_index
- status
- created_at
- updated_at

status の値:

- not_started
- in_progress
- completed

補足:

- topics は1つの curriculum に属する
- 並び順は `order_index` で明示的に管理
- `(curriculum_id, order_index)` はユニーク

---

### public.summaries

トピックごとの要約履歴

カラム:

- id
- topic_id
- content
- is_latest
- created_at
- updated_at

補足:

- 1つの topic に複数 summary を持てる
- `is_latest = true` は topic ごとに1件だけ
- MVP では最新要約だけ表示
- 履歴自体は保持する

---

## MVP画面遷移

MVP の画面構成は以下です。

1. ログイン画面
2. カリキュラム一覧画面
3. カリキュラム詳細画面
4. トピック詳細画面
5. 要約保存画面

### 重要な画面挙動

- カリキュラム詳細では topic 一覧と status を表示
- トピック詳細では topic 情報 + 最新要約 + 編集/保存アクションを表示
- 変更後は、結果が確認できる画面に戻る

---

## API設計方針

ネストしたルートと独立ルートを使い分ける。

### 親 → 子 をたどる用途

以下のような「親に属する一覧取得」はネストさせる

例:

- `GET /curricula`
- `GET /curricula/:id`
- `GET /curricula/:id/topics`

---

### リソースそのものを直接扱う用途

以下のような「単体取得・更新」は独立ルートにする

例:

- `GET /topics/:id`
- `PATCH /topics/:id`

---

## 認証の実装パターン

保護されたエンドポイントでは以下の流れを使う。

1. `Authorization` ヘッダを読む
2. `Bearer ` で始まることを確認
3. token を抽出
4. `supabase.auth.getUser(token)` でユーザー確認
5. その token をヘッダに付けた Supabase client を生成
6. その client で DB を読む/書くことで RLS を正しく通す

---

## 現在のファイル構成方針

「1関数1ファイル」ではなく、「責務ごと」に分ける。

推奨構成:

src/
index.ts
lib/
supabase.ts
auth/
auth.ts
routes/
curricula.ts
topics.ts
summaries.ts

---

## 各ファイルの役割

### `src/index.ts`

責務:

- Hono app の生成
- route の mount
- サーバー起動

ここにはロジックを溜め込まない

---

### `src/lib/supabase.ts`

責務:

- 通常の Supabase client
- token付き Supabase client を作る関数

---

### `src/auth/auth.ts`

責務:

- Authorization ヘッダから token を取り出す
- token の妥当性確認
- 現在ユーザーの取得
- 認証系の共通処理

---

### `src/routes/curricula.ts`

責務:

- `GET /curricula`
- `GET /curricula/:id`
- `GET /curricula/:id/topics`

---

### `src/routes/topics.ts`

責務:

- `GET /topics/:id`
- `PATCH /topics/:id`

---

### `src/routes/summaries.ts`

責務:

- `POST /summaries`

---

## 今はまだやらないこと

以下は今の段階では導入しない。

- Clean Architecture の全面導入
- service / repository / usecase の厳密分離
- 1関数1ファイル
- DI コンテナ
- 過剰な抽象化
- 汎用 CRUD ジェネレータ
- event-driven な設計

今の優先順位は:

**速く / 正しく / 読みやすく**

---

## API実装の順番

以下の順番で進める。

### 1. 認証処理の共通化

以下のような共通関数を作る。

候補:

- `getAccessTokenFromHeader(c)`
- `getCurrentUser(token)`
- `requireAuth(c)`（必要なら）
- `createSupabaseClientWithToken(token)`

---

### 2. curricula ルート整理

すでに一部動いている:

- `GET /curricula`
- `GET /curricula/:id`

これを `routes/curricula.ts` に整理する

---

### 3. カリキュラム配下の topic 一覧

実装対象:

- `GET /curricula/:id/topics`

返す項目:

- id
- title
- description
- order_index
- status

並び順:

- `order_index ASC`

---

### 4. topic 単体取得

実装対象:

- `GET /topics/:id`

返す項目:

- id
- curriculum_id
- title
- description
- order_index
- status

将来的には最新 summary も含める可能性あり

---

### 5. topic 更新

実装対象:

- `PATCH /topics/:id`

MVP で編集可能な項目:

- title
- description

やらないこと:

- 並び替え
- topic 手動追加
- 構造編集

---

### 6. summary 保存

実装対象:

- `POST /summaries`

期待動作:

1. 既存の最新 summary を `is_latest = false` にする
2. 新しい summary を `is_latest = true` で insert
3. 対応する topic の status を `completed` に更新する

これは重要な業務ルール:

- 要約保存 = その topic を学習完了とみなす

---

## 重要な業務ルール

1. topics は `order_index` で順序管理する
2. topic の進捗は `topics.status` に直接持つ
3. summary は履歴を保持する
4. MVP では最新 summary のみ表示する
5. summary 保存時に topic を `completed` にする
6. topic 編集では title / description のみ対応
7. topic の手動追加・並び替えは MVP ではやらない
8. curriculum 作成は MVP ではアプリ内UIで行わない
9. curriculum は ChatGPT 側で作り、後で MCP 経由で保存する前提
10. 今はまず MVP API を優先し、将来 MCP 連携を見据える

---

## 既存テストデータ

Supabase にはすでにテストデータがある。

- テストユーザー 1件
- profile 1件
- curriculum: Computer Science
- topics: HTTP, DNS, TCP/IP
- summary: HTTP に対する要約 1件

これを使って API 実装を進めること

---

## コーディング方針

- ハンドラは素直に書く
- 賢すぎる抽象化は避ける
- 401 / 500 は明確に返す
- route ファイルは読みやすさ重視
- エラーは握りつぶさない
- TypeScript 型は必要十分に使う
- Cursor で反復しやすい構造を優先する

---

## 直近のタスク

まず以下の構成に整理する。

- `src/lib/supabase.ts`
- `src/auth/auth.ts`
- `src/routes/curricula.ts`
- `src/routes/topics.ts`

そのあと、以下の順で API を実装する。

1. `GET /curricula/:id/topics`
2. `GET /topics/:id`
3. `PATCH /topics/:id`
4. `POST /summaries`

---

## Cursorへの依頼

このプロジェクトでは、以下を守って実装を進めてください。

- 小さく実用的な変更を優先する
- プロジェクト全体を勝手に再設計しない
- 現在の Auth / RLS の方針を壊さない
- 通常 API で service_role を使わない
- 提案コードは、上記のファイル構成に沿うこと
- 過剰設計より、MVPを前進させることを優先する
