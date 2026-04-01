# Gitコミットメッセージ規約（Wove）

この開発では、コミットメッセージを次の形式で統一する。

```text
type: 変更内容
```

例:

```text
feat: カリキュラム一覧画面を追加
fix: 要約保存後に詳細画面へ戻らない不具合を修正
docs: Phase1の内容を更新
```

---

## 使う type

### feat

新機能追加。

例:

```text
feat: Supabaseログイン機能を追加
feat: トピック詳細画面を実装
```

### fix

バグ修正。

例:

```text
fix: curricula取得時に空配列になる不具合を修正
fix: status更新が反映されない問題を修正
```

### docs

ドキュメント更新。

例:

```text
docs: Git運用ルールを追加
docs: Phase2メモを更新
```

### refactor

挙動を変えない内部整理。

例:

```text
refactor: curricula取得処理をserviceに分離
```

### chore

設定変更、不要コード削除、小さな保守作業。

例:

```text
chore: console.logを削除
chore: package.jsonを整理
```

### test

テスト追加・修正。

例:

```text
test: curricula APIのテストを追加
```

---

## この開発での基本ルール

### 1. 日本語で説明してよい

`feat` や `fix` は英語、後ろの説明は日本語でよい。

例:

```text
feat: トピック編集機能を追加
```

### 2. 1コミット1意味

1つのコミットには、1つの意味だけを持たせる。

悪い例:

```text
feat: ログイン追加とAPI修正とREADME更新
```

良い例:

```text
feat: ログイン画面を追加
fix: auth APIのレスポンスを修正
docs: READMEを更新
```

### 3. 何をしたかを書く

「修正した」ではなく、何を修正したかを書く。

悪い例:

```text
fix: 修正
```

良い例:

```text
fix: summariesの最新判定が崩れる不具合を修正
```

### 4. 迷ったらこの6個だけ使う

この開発では、まず次だけで十分。

- `feat`
- `fix`
- `docs`
- `refactor`
- `chore`
- `test`

---

## よく使うテンプレート

```text
feat: 〇〇を追加
fix: 〇〇の不具合を修正
docs: 〇〇を更新
refactor: 〇〇を整理
chore: 〇〇を調整
test: 〇〇のテストを追加
```

---

## ブランチ命名規則

この開発では、ブランチ名を以下の形式で統一する。

```text
<type>/<short-description>
```

---

## 使用する type

コミットメッセージと同じ分類を使う。

- `feat`
- `fix`
- `docs`
- `refactor`
- `chore`
- `test`

---

## ブランチ名の例

```text
feat/curricula-api
feat/topic-detail
fix/auth-redirect
docs/git-rules
refactor/error-handling
chore/setup
test/curricula-api
```

---

## ブランチ命名ルール

### 1. 英小文字のみを使う

```text
feat/Curricula → ❌
feat/curricula → ⭕
```

### 2. 単語はハイフンで区切る

```text
feat/curriculaApi → ❌
feat/curricula-api → ⭕
```

### 3. 短く、内容が分かる名前にする

```text
feat/api → ❌
feat/curricula-api → ⭕
```

### 4. 1ブランチ = 1目的

```text
feat/login-and-api-and-ui → ❌
feat/login → ⭕
feat/api → ⭕
```

---

## Wove開発でのおすすめ粒度

ブランチは「PR1つで完結する単位」にする。

例:

- curricula一覧API
- topics更新API
- summaries保存処理
- エラーハンドリング整理

---

## よく使うブランチ例

```text
feat/curricula-api
feat/topic-update
feat/summary-save

fix/rls-error
fix/status-update

refactor/api-structure
refactor/error-handling

docs/phase2
docs/git-rules

chore/init
chore/deps-update
```

---

## 最低限のルール（覚える用）

```text
feat/機能名
fix/修正内容
refactor/整理内容
docs/ドキュメント
chore/雑務
test/テスト
```

---

## 最終ルール

このアプリ開発では、コミットメッセージとブランチ名を次で統一する。

### コミットメッセージ

```text
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
refactor: リファクタリング
chore: 雑務・設定変更
test: テスト追加・修正
```

### ブランチ名

```text
feat/機能名
fix/修正内容
refactor/整理内容
docs/ドキュメント
chore/雑務
test/テスト
```
