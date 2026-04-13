// Dynamic route params may be received as Promises in Next.js App Router.
export type IdPageProps = {
  params: Promise<{ id: string }>;
};
