# Wove Web (`apps/web`)

Next.js ベースのフロントエンドです。`apps/api` と Supabase を利用します。

## 前提

- Node.js / npm
- API サーバー（`apps/api`）が起動していること  
  - デフォルト: `http://localhost:8080`

## 環境変数

`apps/web/.env.local` を作成し、以下を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 起動手順

1. API を起動（リポジトリルートで実行）

```bash
cd apps/api
npm install
npm run dev
```

2. Web を起動（別ターミナル）

```bash
cd apps/web
npm install
npm run dev
```

3. ブラウザで確認

- `http://localhost:3000`
